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
    const response = await fetch(url + `?format=json&limit=100&api_key=${CONGRESS_API_KEY}`);

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

    return await response.json();
  } catch (error) {
    console.error("Network error:", error);
    return null;
  }
}

// **Process Legislation in Batches with Independent Checks for Sponsored and Cosponsored Legislation**
async function processLegislationInBatches(members: any[]) {
  let index = 0;
  const results: any[] = [];

  console.log("ALL MEMBERS")
  console.log(members)

  async function processNext() {
    if (index >= members.length) return;
    const member = members[index++];

    // Defensive check: If both sponsoredLegislation and cosponsoredLegislation URLs are missing, skip this member
    const sponsoredLegislationUrl = member.sponsoredLegislation?.url;
    const cosponsoredLegislationUrl = member.cosponsoredLegislation?.url;

    if (!sponsoredLegislationUrl && !cosponsoredLegislationUrl) {
      console.log(`Skipping member ${member.bioguideId} as no valid URL for legislation.`);
      return processNext(); // Skip this member if both URLs are missing
    }

    let legislation = null;

    // Fetch Sponsored Legislation if the URL is present
    if (sponsoredLegislationUrl) {
      console.log(`Fetching sponsored legislation for member ${member.bioguideId}`);
      legislation = await fetchLegislationData(sponsoredLegislationUrl);
      if (legislation) {
        results.push({ member, legislation });
      }
    }

    // Fetch Cosponsored Legislation if the URL is present
    if (cosponsoredLegislationUrl) {
      console.log(`Fetching cosponsored legislation for member ${member.bioguideId}`);
      legislation = await fetchLegislationData(cosponsoredLegislationUrl);
      if (legislation) {
        results.push({ member, legislation });
      }
    }

    return processNext(); // Continue processing the next member
  }

  // Start processing with limited concurrency
  const workers = Array.from({ length: MAX_CONCURRENT_REQUESTS }, processNext);
  await Promise.all(workers);

  return results;
}


// **Insert Legislation into Supabase in Batches**
async function insertLegislation(
  legislationData: any[],
  table: string
) {
  if (legislationData.length === 0) return;

  // Insert the data in batches
  const { error } = await supabase.from(table).upsert(legislationData, {
    onConflict: ["congress", "billNumber"], // Prevent duplicates
  });

  if (error) {
    console.error(`Error inserting into ${table}:`, error);
    return { error: `Failed to insert into ${table}` };
  }
  return { success: true };
}

// **Main Logic: Fetch, Process, and Insert Sponsored & Cosponsored Legislation**
async function updateLegislation() {
  // Step 1: Get members with currentMember == TRUE
  const { data: members, error: membersError } = await supabase
    .from("members")
    .select("bioguideId, sponsoredLegislation, cosponsoredLegislation")
    .eq("currentMember", true);
 
  if (membersError) {
    console.error("Error fetching members:", membersError);
    return { error: "Failed to fetch members" };
  }

  // Step 2: Process Sponsored and Cosponsored Legislation concurrently
  const sponsoredLegislationResults = await processLegislationInBatches(
    members.map((member: { sponsoredLegislation: { url: string; }; }) => ({ url: member.sponsoredLegislation?.url }))
  );
  const cosponsoredLegislationResults = await processLegislationInBatches(
    members.map((member: { cosponsoredLegislation: { url: string; }; }) => ({ url: member.cosponsoredLegislation?.url }))
  );

  // Step 3: Format the data (sponsored and cosponsored legislation)
  const formattedSponsoredLegislation = sponsoredLegislationResults.flatMap(
    ({ member, legislation }) =>
      legislation?.sponsoredLegislation?.map((bill: any) => ({
        bioguideId: member.bioguideId,
        congress: bill.congress,
        billNumber: bill.number,
        title: bill.title,
        policyArea: bill.policyArea?.name,
        billUrl: bill.url,
        introducedDate: bill.introducedDate,
        latestActionDate: bill.latestAction?.actionDate || null,
        latestActionText: bill.latestAction?.text || null,
      })) || []
  );

  const formattedCosponsoredLegislation = cosponsoredLegislationResults.flatMap(
    ({ member, legislation }) =>
      legislation?.cosponsoredLegislation?.map((bill: any) => ({
        bioguideId: member.bioguideId,
        congress: bill.congress,
        billNumber: bill.number,
        title: bill.title,
        policyArea: bill.policyArea?.name,
        billUrl: bill.url,
        introducedDate: bill.introducedDate,
        latestActionDate: bill.latestAction?.actionDate || null,
        latestActionText: bill.latestAction?.text || null,
      })) || []
  );

  // Step 4: Insert the formatted data into Supabase
  const sponsoredLegislationResult = await insertLegislation(
    formattedSponsoredLegislation,
    "sponsoredLegislation"
  );
  const cosponsoredLegislationResult = await insertLegislation(
    formattedCosponsoredLegislation,
    "cosponsoredLegislation"
  );

  if (sponsoredLegislationResult?.error || cosponsoredLegislationResult?.error) {
    console.error("Error inserting legislation data");
    return { error: "Error inserting legislation data" };
  }

  console.log("Sponsored and cosponsored legislation updated successfully.");
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
