import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Access environment variables directly using Deno.env.get
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CONGRESS_API_KEY = Deno.env.get("CONGRESS_API_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CONGRESS_API_KEY) {
  throw new Error(
    "Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CONGRESS_API_KEY",
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const LIMIT = 250;
const BASE_URL =
  `https://api.congress.gov/v3/member?limit=${LIMIT}&currentMember=true&api_key=${CONGRESS_API_KEY}`;
const MEMBER_DETAILS_URL = "https://api.congress.gov/v3/member/";

const MAX_CONCURRENT_REQUESTS = 5; // Limit concurrent requests
const RETRY_DELAY_MS = 500; // Initial retry delay
const MAX_RETRIES = 3; // Retry up to 3 times

async function fetchMemberDetails(
  bioguide_id: string,
  retries = 0,
): Promise<any> {
  const url =
    `${MEMBER_DETAILS_URL}${bioguide_id}?format=json&api_key=${CONGRESS_API_KEY}`;

  try {
    console.log(`Fetching details for member: ${bioguide_id}`);
    const response = await fetch(url, {
      method: "GET",
      /*
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Cache-Control": "no-store",
      },
      */
    });

    if (!response.ok) {
      console.error(`Error fetching details (${response.status}): ${url}`);
      if (response.status === 520 && retries < MAX_RETRIES) {
        console.log(
          `Retrying ${bioguide_id} in ${RETRY_DELAY_MS * (retries + 1)}ms...`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS * (retries + 1))
        );
        return fetchMemberDetails(bioguide_id, retries + 1);
      }
      return null;
    }

    const data = await response.json();
    return data.member || null;
  } catch (error) {
    console.error(`Network error for ${bioguide_id}:`, error);
    return null;
  }
}

// **Queue-Based Concurrent Execution**
async function fetchMemberDetailsInBatches(members: any[]) {
  let index = 0;
  const results: any[] = [];

  async function processNext() {
    if (index >= members.length) return;
    const member = members[index++];
    const details = await fetchMemberDetails(member.bioguideId);
    results.push({ member, details });
    return processNext();
  }

  // Start processing with limited concurrency
  const workers = Array.from({ length: MAX_CONCURRENT_REQUESTS }, processNext);
  await Promise.all(workers);

  return results;
}

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

  // Fetch details with concurrency limit
  const memberDetails = await fetchMemberDetailsInBatches(members);

  // Format the data (without removing null values)
  const formattedMembers = memberDetails.map(({ member, details }) => ({
    bioguide_id: member.bioguideId ?? null,
    first_name: details?.firstName ?? null,
    last_name: details?.lastName ?? null,
    direct_order_name: details?.directOrderName ?? null,
    inverted_order_name: details?.invertedOrderName ?? null,
    party: member.partyName ?? "Unknown",
    party_history: details?.partyHistory ?? null,
    state: member.state ?? null,
    district: member.district?.toString() ?? null,
    address_information: details?.addressInformation ?? null,
    depiction: member.depiction, //trigger function prevents manually added images for members missing a depiction from being reset to null
    sponsored_legislation: details?.sponsoredLegislation ?? null,
    cosponsored_legislation: details?.cosponsoredLegislation ?? null,
    terms: member.terms ?? null,
    birth_year: details?.birthYear ?? null,
    death_year: details?.deathYear ?? null,
    current_member: details?.currentMember ?? false,
    updated_at: new Date().toISOString(),
  }));

  // Insert in batches
  const { error } = await supabase.from("members").upsert(formattedMembers, {
    onConflict: ["bioguide_id"],
  });

  if (error) {
    console.error("Error inserting members:", error.message);
    return { error: "Failed to insert members into Supabase" };
  }

  // Handle pagination
  if (members.length >= LIMIT - 1 && data.pagination?.next) {
    console.log(`Recursing on pagination URL: ${data.pagination.next}`);
    return fetchAndStoreMembers(
      `${data.pagination.next}&api_key=${CONGRESS_API_KEY}`,
    );
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
