import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Supabase configuration
export const supabaseUrl = process.env.SUPABASE_URL;
export const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required Supabase environment variables:");
  if (!supabaseUrl) console.error("  - SUPABASE_URL");
  if (!supabaseServiceKey) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\n📝 Create a .env file in the project root with:");
  console.error("SUPABASE_URL=https://your-project-id.supabase.co");
  console.error("SUPABASE_ANON_KEY=your_anon_key_here");
  console.error("SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here");
  console.error(
    "\n🔑 Find these values in your Supabase dashboard > Settings > API"
  );
  process.exit(1);
}

// Create Supabase client with service role for admin operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Create regular client for read operations
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
