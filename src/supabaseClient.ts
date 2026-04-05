import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://glzpbyykswmexouybuxf.supabase.co";
const supabaseAnonKey = "sb_publishable_jXltXo0H-io-aNCZxT2krQ_4zUvtwNk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);