/*
  # Student Dropout Prediction System Schema

  1. New Tables
    - `predictions`
      - `id` (uuid, primary key)
      - `student_data` (jsonb) - Input features for prediction
      - `model_type` (text) - Which model was used (baseline, drop_gender, reweighted, calibrated)
      - `prediction` (text) - Graduate or Dropout
      - `confidence` (float) - Model confidence score
      - `created_at` (timestamptz)
    
    - `model_metrics`
      - `id` (uuid, primary key)
      - `model_type` (text) - Model identifier
      - `accuracy` (float)
      - `spd` (float) - Statistical Parity Difference
      - `eod` (float) - Equal Opportunity Difference
      - `female_recall` (float)
      - `male_recall` (float)
      - `female_precision` (float)
      - `male_precision` (float)
      - `female_f1` (float)
      - `male_f1` (float)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Allow public read access for model metrics
    - Allow public insert for predictions (demo purposes)
*/

CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_data jsonb NOT NULL,
  model_type text NOT NULL,
  prediction text NOT NULL,
  confidence float NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type text UNIQUE NOT NULL,
  accuracy float NOT NULL,
  spd float NOT NULL,
  eod float NOT NULL,
  female_recall float NOT NULL,
  male_recall float NOT NULL,
  female_precision float NOT NULL,
  male_precision float NOT NULL,
  female_f1 float NOT NULL,
  male_f1 float NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read predictions"
  ON predictions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert predictions"
  ON predictions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public read model metrics"
  ON model_metrics
  FOR SELECT
  TO anon
  USING (true);

-- Insert baseline model metrics from Assignment 2
INSERT INTO model_metrics (model_type, accuracy, spd, eod, female_recall, male_recall, female_precision, male_precision, female_f1, male_f1)
VALUES 
  ('baseline', 0.753, -0.375, -0.265, 0.68, 0.94, 0.70, 0.78, 0.69, 0.85),
  ('drop_gender', 0.741, -0.169, -0.091, 0.82, 0.92, 0.72, 0.76, 0.77, 0.83),
  ('reweighted', 0.745, -0.113, -0.017, 0.90, 0.90, 0.74, 0.75, 0.81, 0.82),
  ('calibrated', 0.752, -0.193, -0.106, 0.79, 0.87, 0.73, 0.77, 0.76, 0.82)
ON CONFLICT (model_type) DO UPDATE SET
  accuracy = EXCLUDED.accuracy,
  spd = EXCLUDED.spd,
  eod = EXCLUDED.eod,
  female_recall = EXCLUDED.female_recall,
  male_recall = EXCLUDED.male_recall,
  female_precision = EXCLUDED.female_precision,
  male_precision = EXCLUDED.male_precision,
  female_f1 = EXCLUDED.female_f1,
  male_f1 = EXCLUDED.male_f1,
  updated_at = now();