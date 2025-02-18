import dotenv from "dotenv";

dotenv.config();

export default {
  CONGRESS_API_KEY: process.env.CONGRESS_API_KEY,
  CONGRESS_BASE_URL: process.env.CONGRESS_BASE_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  DB_UPDATE_TOKEN: process.env.DB_UPDATE_TOKEN,
};
