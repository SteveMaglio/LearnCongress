import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Access environment variables directly using Deno.env.get
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CONGRESS_API_KEY = Deno.env.get("CONGRESS_API_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CONGRESS_API_KEY) {
  throw new Error(
    "Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CONGRESS_API_KEY"
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Constants
const MAX_CONCURRENT_REQUESTS = 5; // Limit concurrent requests
const RETRY_DELAY_MS = 500; // Initial retry delay
const MAX_RETRIES = 3; // Retry up to 3 times

// **Fetch Legislation Data with Retry Logic**
async function fetchLegislationData(
  url: string,
  retries = 0
): Promise<any> {
  try {
    console.log(`Fetching legislation from: ${url}`);
    const response = await fetch(url + `?format=json&limit=250&api_key=${CONGRESS_API_KEY}`);

    if (!response.ok) {
      console.error(`Error fetching data (${response.status}): ${url}`);
      if (response.status === 520 && retries < MAX_RETRIES) {
        console.log(
          `Retrying in ${RETRY_DELAY_MS * (retries + 1)}ms...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS * (retries + 1))
        );
        return fetchLegislationData(url, retries + 1);
      }
      return null;
    }
    const output = await response.json();
    console.log(`DEBUG:${output.pagination.count} total documents available. may require pagination if >250.`);
    return output;

  } catch (error) {
    console.error("Network error:", error);
    return null;
  }
}

// **Process Legislation in Batches with Independent Checks for Sponsored and Cosponsored Legislation**
async function processLegislationInBatches(memberLegislationUrls: any[]) {
  let index = 0;
  const results: any[] = [];

  async function processNext() {
    if (index >= memberLegislationUrls.length) { 
      return;
    }
    const legislationObj = memberLegislationUrls[index++];
    //console.log("Processing member: ", legislationObj.bioguideId);
  
    const sponsoredLegislationUrl = legislationObj.sponsored_legislation?.url;
    const cosponsoredLegislationUrl = legislationObj.cosponsored_legislation?.url;
  
    if (!sponsoredLegislationUrl && !cosponsoredLegislationUrl) {
      console.log(`Skipping member ${legislationObj.bioguide_id} as there are no valid URLs for (co)sponsored legislation.`);
      return processNext();
    }
  
    // Fetch Sponsored Legislation
    if (sponsoredLegislationUrl) {
      console.log(`Fetching ${legislationObj.sponsored_legislation.count} sponsored legislation for member ${legislationObj.bioguide_id}`);
      const sponsoredLegislation = await fetchLegislationData(sponsoredLegislationUrl);
      if (sponsoredLegislation) {
        results.push({ bioguide_id: legislationObj.bioguide_id, type: "sponsored", legislation: sponsoredLegislation.sponsoredLegislation});
      }
    }
  
    // Fetch Cosponsored Legislation
    if (cosponsoredLegislationUrl) {
      console.log(`Fetching ${legislationObj.cosponsored_legislation.count} cosponsored legislation for member ${legislationObj.bioguide_id}`);
      const cosponsoredLegislation = await fetchLegislationData(cosponsoredLegislationUrl);
      if (cosponsoredLegislation) {
        results.push({ bioguide_id: legislationObj.bioguide_id, type: "cosponsored", legislation: cosponsoredLegislation.cosponsoredLegislation});
      }
    }
  
    return processNext();
  }
  

  // Start processing with limited concurrency
  const workers = Array.from({ length: MAX_CONCURRENT_REQUESTS }, processNext);
  await Promise.all(workers);

  return results;
}


// **Insert Legislation into Supabase in Batches**
async function insertLegislation(legislationData: any[]) {
  const table = "legislations";
  if (legislationData.length === 0) {
    console.log(`No data to insert into ${table}`);
    return { error: `No data to insert into ${table}` };
  }

  // Log the legislation data to be inserted
  console.log(`Attempting to insert into ${table}:`, JSON.stringify(legislationData, null, 2));

  const { data, error } = await supabase.from(table).upsert(legislationData, {
    onConflict: ["congress", "number"], // Prevent duplicates
  });

  // Log the response data from Supabase
  //console.log(`Supabase response for ${table}:`, { data, error });

  // If there is an error, log it and return
  if (error) {
    console.error(`Error inserting into ${table}:`, error);
    return { error: `Failed to insert into ${table}`, details: error };
  }

  // Log success and the inserted data
  console.log(`Successfully inserted into ${table}:`, data);
  
  // Return success
  return { success: true, data };
}

// **Insert Legislation into Supabase in Batches**
async function insertLegislationSponsors(sponsors: any[]) {
  const table = "legislation_sponsors";
  if (sponsors.length === 0) {
    console.log(`No data to insert into ${table}`);
    return { error: `No data to insert into ${table}` };
  }

  // Log the legislation data to be inserted
  //console.log(`Attempting to insert into ${table}:`, JSON.stringify(sponsors, null, 2));

  const { data, error } = await supabase.from(table).upsert(sponsors, {
    onConflict: ["congress", "number", "bioguide_id"], // Prevent duplicates,
  });


  // Log the response data from Supabase
  console.log(`Supabase response for ${table}:`, { data, error });

  // If there is an error, log it and return
  if (error) {
    console.error(`Error inserting into ${table}:`, error);
    return { error: `Failed to insert into ${table}`, details: error };
  }

  // Log success and the inserted data
  console.log(`Successfully inserted into ${table}:`, data);
  
  // Return success
  return { success: true, data };
}



// **Main Logic: Fetch, Process, and Insert Sponsored & Cosponsored Legislation**
async function updateLegislation() {
  // Step 1: Get members with currentMember == TRUE
  const { data: members, error: membersError } = await supabase
    .from("members")
    .select("bioguide_id, sponsored_legislation, cosponsored_legislation")
    .eq("current_member", true)
    .limit(2);
    //.eq("bioguideId", "B001327")
    //TODO remove this limit once finished debugging


  if (membersError) {
    console.error("Error fetching members:", membersError);
    return { error: "Failed to fetch members" };
  }

  const sponsoredLegislationResults = await processLegislationInBatches(
    members.map((member: { sponsored_legislation: any; bioguide_id: string; }) => ({ 
      sponsored_legislation: member.sponsored_legislation, 
      bioguide_id: member.bioguide_id 
    }))
  );
  const cosponsoredLegislationResults = await processLegislationInBatches(
    members.map((member: { cosponsored_legislation: any; bioguide_id: string; }) => ({ 
      cosponsored_legislation: member.cosponsored_legislation, 
      bioguide_id: member.bioguide_id 
    }))
  );
  

  // Step 3: Format the data (sponsored and cosponsored legislation)
  //TODO write helper method to identify the appropriate values based on if its a bill or amendment to call inside the map.

  const formattedSponsoredLegislation = sponsoredLegislationResults.flatMap((result) => 
    result.legislation.map((item: { congress: number; introducedDate: any; latestAction: { actionDate: any; text: string; }; number: number; policyArea: { name: any; }; title: string; type: any; url: string; }) => ({
      congress: item.congress,
      introduced_date: item.introducedDate,
      latest_action_date: item.latestAction?.actionDate || item.introducedDate,
      latest_action_text: item.latestAction?.text,
      number: item.number,
      policyArea: item.policyArea?.name || 'N/A',
      title: item.title,
      type: item.type,
      url: item.url
    }))
  );

  const formattedCosponsoredLegislation = cosponsoredLegislationResults.flatMap((result) => 
    result.legislation.map((item: { congress: number; introducedDate: any; latestAction: { actionDate: any; text: string; }; number: number; policyArea: { name: any; }; title: string; type: any; url: string; }) => ({
      congress: item.congress,
      introduced_date: item.introducedDate,
      latest_action_date: item.latestAction?.actionDate || item.introducedDate,
      latest_action_text: item.latestAction?.text,
      number: item.number,
      policy_area: item.policyArea?.name || 'N/A',
      title: item.title,
      type: item.type,
      url: item.url
    }))
  );

  const legislationSponsors = sponsoredLegislationResults.flatMap((result) => 
    result.legislation.map((item: { congress: number; introducedDate: any; latestAction: { actionDate: any; text: string; }; number: number; policyArea: { name: any; }; title: string; type: any; url: string; }) => ({
      bioguide_id: result.bioguide_id,
      congress: item.congress,
      number: item.number,
      sponsorType: "Sponsor"
    }))
  );

  const legislationCosponsors = cosponsoredLegislationResults.flatMap((result) => 
    result.legislation.map((item: { congress: number; introducedDate: any; latestAction: { actionDate: any; text: string; }; number: number; policyArea: { name: any; }; title: string; type: any; url: string; }) => ({
      bioguide_id: result.bioguide_id,
      congress: item.congress,
      number: item.number,
      sponsorType: "Cosponsor"
    }))
  );


  // Step 4: Insert the formatted data into Supabase
  const sponsoredLegislationResult = await insertLegislation(formattedSponsoredLegislation);
  const cosponsoredLegislationResult = await insertLegislation(formattedCosponsoredLegislation);

  if (sponsoredLegislationResult?.error) {
    console.error("Error inserting sponsored legislation");
    return { error: "Error inserting sponsored legislation" };
  }
  if (cosponsoredLegislationResult?.error) {
    console.error("Error inserting cosponsored legislation");
    return { error: "Error inserting cosponsored legislation" };
  }

  console.log("legislation updated successfully.");

  // Step 5: insert to the one-to-many legislationSponsors table

  const legislationSponsorsResult = await insertLegislationSponsors(legislationSponsors);
  const legislationCosponsorsResult = await insertLegislationSponsors(legislationCosponsors);


  if (legislationSponsorsResult?.error) {
    console.error("Error inserting sponsors");
    return { error: "Error inserting sponsors" };
  }
  if (legislationCosponsorsResult?.error) {
    console.error("Error inserting cosponsors");
    return { error: "Error inserting cosponsors" };
  }

  console.log("legislation updated successfully.");

  return { success: true };
}

// **Execute the Function Automatically (Without HTTP Server)**
(async () => {
  try {
    const result = await updateLegislation();
    console.log("Function completed:", result);
    Deno.exit(0); // Exit after completion
  } catch (error) {
    console.error("Function execution failed:", error);
    Deno.exit(1); // Exit with error code
  }
})();
