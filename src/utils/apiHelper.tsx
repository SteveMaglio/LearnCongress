import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Fetch member data from Supabase
 * @returns Fetched members
 */
const fetchData = async (offset: number, limit: number) => {
  try {
    const { data, error, status } = await supabase
      .from('members')
      .select('*')
      .eq('currentMember', true) // Filter where currentMember is true
      .range(offset, offset + limit - 1); // Use range for pagination, offset as the start index

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      // Shuffle the data array randomly
      return shuffleArray(data);
    }

    return [];
  } catch (err) {
    console.error("Failed to fetch data:", err);
    throw new Error("Failed to fetch data");
  }
};

// Utility function to shuffle an array randomly (Fisher-Yates / Knuth shuffle algorithm)
const shuffleArray = (array: any[]) => {
  let shuffledArray = [...array]; // Create a copy to avoid mutating the original array
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // Get a random index
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]]; // Swap elements
  }
  return shuffledArray;
};

export default fetchData;
