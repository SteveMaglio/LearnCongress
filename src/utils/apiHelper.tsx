import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import _ from 'lodash';

const API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS_BASE_URL = process.env.CONGRESS_BASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Supabase credentials are missing");
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let fetchedMemberIds = new Set<string>();  // Track already selected member IDs

export const getRandomMembers = async (numMembersPerQuery: number) => {

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("SUPABASE_URL or SUPABASE_ANON_KEY is missing");
    throw new Error("Missing Supabase credentials");
  }
  
  try {
    // Fetch random members from the database, excluding previously fetched ones
    const { data: members, error } = await supabase
    .from("members")
    .select("*")
    .eq("currentMember", true)
//    .not("bioguideId", "in", Array.from(fetchedMemberIds))  // Correct filter syntax
    .limit(numMembersPerQuery);
  

    if (error) throw error;

    if (members) {
      // Store the IDs of the fetched members to avoid duplicates in future queries
      members.forEach((member: any) => fetchedMemberIds.add(member.bioguideId));
    }
    const shuffledMembers = _.shuffle(members);
    return shuffledMembers;  // Return the list of members
  } catch (err) {
    console.error("Failed to fetch data:", err);
    throw new Error("Failed to fetch data");
  }
};

/**
 * Fetch additional details for a given legislation using its API URL.
 * @param url The full API endpoint for the bill
 * @returns Additional legislation data
 */
const getLegislationInfo = async (url: string) => {
  try {
    // Append the API key to the existing URL
    const fullUrl = `${url}&api_key=${API_KEY}`;
    const response = await axios.get(fullUrl);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch details for bill at ${url}:`, error);
    return null;
  }
};

/**
 * Fetch sponsored legislation for a given member and enrich it with additional details.
 * @param bioguideId Member's unique identifier
 * @returns Sponsored legislation data with extra details
 */
export const getMemberSponsoredLegislation = async (bioguideId: string) => {
  try {
    const response = await axios.get(`${CONGRESS_BASE_URL}/member/${bioguideId}/sponsored-legislation?api_key=${API_KEY}`);
    const legislationList = response.data?.sponsoredLegislation || []; // Handle cases where legislation is missing

    // Fetch additional info for each piece of legislation in parallel
    const detailedLegislation = await Promise.all(
      legislationList.map(async (legislation: any) => {
        const additionalInfo = await getLegislationInfo(legislation.url); // Use the provided API URL
        return {
          ...legislation,
          additionalInfo, // Merging additional data
        };
      })
    );

    return detailedLegislation;
  } catch (error) {
    console.error(`Failed to fetch sponsored legislation for ${bioguideId}:`, error);
    return null;
  }
};
