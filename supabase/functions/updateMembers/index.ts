import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { config } from "https://deno.land/x/dotenv/mod.ts";

// Load environment variables from .env file
console.log("Current working directory:", Deno.cwd());

const env = config();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const CONGRESS_API_KEY = env.VITE_CONGRESS_API_KEY;

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

  // Wait for the response to be parsed as JSON and then log it
  const data = await response.json();
  //console.log("Fetched member details:", data);

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
    if (!details) continue; // Skip if failed to fetch

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
      addressInformation: details.addressInformation || null, // Store full address info as JSON
      depiction: member.depiction || null, // Store image details as JSON
      terms: member.terms || null, // Store term details as JSON
      birthYear: details.birthYear || null, 
      deathYear: details.deathYear || null, 
      currentMember: details.currentMember || false,
      updated_at: new Date().toISOString(),
    });
  }

  // Insert into Supabase
  if (formattedMembers.length > 0) {
    const { error } = await supabase
      .from("members")
      .upsert(formattedMembers, { onConflict: ["id"] });

    if (error) {
      console.error("Error inserting members:", error.message);
      return { error: "Failed to insert members into Supabase" };
    }
  }

  // Handle pagination
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
    Deno.exit(0); // Exit the process successfully after completion
  } catch (error) {
    console.error("Function execution failed:", error);
    Deno.exit(1); // Exit the process with an error code if failed
  }
})();
