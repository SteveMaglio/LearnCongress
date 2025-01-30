import axios from "axios";

const API_KEY = import.meta.env.VITE_CONGRESS_API_KEY;
const BASE_URL = "https://api.congress.gov/v3";

/**
 * Fetch paginated member data
 * @param url API endpoint to fetch members
 * @returns Fetched members and next page URL
 */
export const fetchData = async (url: string) => {
  try {
    const response = await axios.get(`${url}&api_key=${API_KEY}`);
    return { members: response.data.members, nextPageUrl: response.data.pagination?.next || null };
  } catch (err) {
    console.error("Failed to fetch data:", err);
    throw new Error("Failed to fetch data");
  }
};

/**
 * Fetch additional data for each member (using bioguideId)
 * @param members List of members
 * @returns Members with additional info
 */
export const addMembers = async (members: any[]) => {
  const membersWithAdditionalData = await Promise.all(
    members.map(async (member) => {
      try {
        const response = await axios.get(`${BASE_URL}/member/${member.bioguideId}?api_key=${API_KEY}&format=json`);
        return { ...member, additionalInfo: response.data.member };
      } catch (error) {
        console.error(`Failed to fetch additional info for ${member.name}:`, error);
        return member;
      }
    })
  );

  return membersWithAdditionalData.sort(() => Math.random() - 0.5); // Shuffle
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
      const response = await axios.get(`${BASE_URL}/member/${bioguideId}/sponsored-legislation?api_key=${API_KEY}`);
      console.log(response.data);
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
