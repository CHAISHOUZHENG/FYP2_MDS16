/*
  # Stress Detection App Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, links to auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `stress_results`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `predicted_emotion` (text)
      - `stress_score` (float)
      - `stress_level` (text)
      - `probabilities` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Users can only view their own profiles and stress results
    - Users can only insert/update their own data
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS stress_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  predicted_emotion text NOT NULL,
  stress_score float NOT NULL,
  stress_level text NOT NULL,
  probabilities jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stress_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stress results"
  ON stress_results FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own stress results"
  ON stress_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_stress_results_user_id ON stress_results(user_id);
CREATE INDEX idx_stress_results_created_at ON stress_results(created_at);