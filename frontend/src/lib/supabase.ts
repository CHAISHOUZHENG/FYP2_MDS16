import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
};

export type StressResult = {
  id: string;
  user_id: string;
  predicted_emotion: string;
  stress_score: number;
  stress_level: string;
  probabilities: Record<string, number>;
  created_at: string;
};
