import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Access environment variables directly using Deno.env.get
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CONGRESS_API_KEY = Deno.env.get("CONGRESS_API_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CONGRESS_API_KEY) {
  throw new Error("Missing required environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE_KEY, or VITE_CONGRESS_API_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const LIMIT = 250;
const BASE_URL = `https://api.congress.gov/v3/member?limit=${LIMIT}&api_key=${CONGRESS_API_KEY}`;
const MEMBER_DETAILS_URL = "https://api.congress.gov/v3/member/";

// Fetch additional member details by bioguideId
async function fetchMemberDetails(bioguideId: string) {
  const url = `${MEMBER_DETAILS_URL}${bioguideId}?format=json&api_key=${CONGRESS_API_KEY}`;
  console.log(`Fetching details for member: ${bioguideId}`);

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Error fetching details for ${bioguideId}:`, response.statusText);
    return null;
  }

  const data = await response.json();
  return data.member;
}

// Fetch and store members recursively
async function fetchAndStoreMembers(url: string) {
  console.log(`Fetching data from: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    console.error("Error fetching data:", response.statusText);
    return { error: "Failed to fetch data from Congress API" };
  }

  const data = await response.json();
  const members = data.members || [];

  if (members.length === 0) {
    console.log("No members found.");
    return { success: true };
  }

  console.log(`Processing ${members.length} members...`);

  let formattedMembers = [];
  for (const member of members) {
    const details = await fetchMemberDetails(member.bioguideId);
    if (!details) continue;

    formattedMembers.push({
      bioguideId: member.bioguideId || null, 
      firstName: details.firstName || null,
      lastName: details.lastName || null,
      directOrderName: details.directOrderName || null,
      invertedOrderName: details.invertedOrderName || null,
      party: member.partyName || "Unknown",
      partyHistory: details.partyHistory || null,
      state: member.state || null,
      district: member.district?.toString() || null,
      addressInformation: details.addressInformation || null,
      depiction: member.depiction || null,
      terms: member.terms || null,
      birthYear: details.birthYear || null, 
      deathYear: details.deathYear || null, 
      currentMember: details.currentMember || false,
      updated_at: new Date().toISOString(),
    });
  }

  if (formattedMembers.length > 0) {
    const { error } = await supabase
      .from("members")
      .upsert(formattedMembers, { onConflict: ["id"] });

    if (error) {
      console.error("Error inserting members:", error.message);
      return { error: "Failed to insert members into Supabase" };
    }
  }

  if (members.length === LIMIT && data.pagination?.next) {
    return fetchAndStoreMembers(`${data.pagination.next}&api_key=${CONGRESS_API_KEY}`);
  }

  console.log("All members updated successfully.");
  return { success: true };
}

// Main execution logic
(async () => {
  try {
    const result = await fetchAndStoreMembers(BASE_URL);
    console.log("Function completed:", result);
    Deno.exit(0); 
  } catch (error) {
    console.error("Function execution failed:", error);
    Deno.exit(1); 
  }
})();
