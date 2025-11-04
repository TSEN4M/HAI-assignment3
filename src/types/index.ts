// src/types/index.ts

export type YesNo = 'Yes' | 'No';
export type ModelType = 'baseline' | 'drop_gender' | 'reweighted' | 'calibrated';

export const MODEL_LABELS: Record<ModelType, string> = {
  baseline: 'Baseline Model',
  drop_gender: 'Gender-Blind Model',
  reweighted: 'Reweighted Model (Recommended)',
  calibrated: 'Calibrated Model',
} as const;

export interface StudentData {
  Admission_grade: number;
  Age_at_enrollment: number;
  Scholarship_holder: number | YesNo;
  Tuition_up_to_date: number | YesNo;
  Debtor: number | YesNo;
  Gender?: number; // 0 = Male, 1 = Female (omit for drop_gender)

  // Advanced (optional; backend will fill from defaults if omitted)
  Displaced?: number | YesNo;
  Educational_special_needs?: number | YesNo;
  International?: number | YesNo;
  Unemployment_rate?: number;
  Inflation_rate?: number;
  GDP?: number;
}

export interface ModelMetrics {
  model_type: ModelType;     // <— tightened
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  spd: number;
  eod: number;
  female_precision: number;
  female_recall: number;
  male_precision: number;
  male_recall: number;
}

export interface FeatureContribution {
  name: string;
  value: number;
  weight: number;
  contribution: number; // SHAP value in log-odds units
  impact: 'increases' | 'decreases';
}

export interface LocalExplanation {
  type: string;
  base_value: number;
  output_value: number;
  features: FeatureContribution[];
}

export interface PredictionResult {
  prediction: 'Graduate' | 'Dropout';
  confidence: number;
  probGraduate?: number;
  model_type?: ModelType;
  explanation?: LocalExplanation;
}

export interface GlobalExplanation {
  model_type: ModelType;
  explanation_type: string;
  description: string;
  features: Array<{
    feature: string;
    weight: number;
    importance: number;
  }>;
}

// (Optional) If you want to type /defaults payloads:
export type DefaultsMap = {
  'Admission grade': number;
  'Age at enrollment': number;
  'Scholarship holder': number;            // 0/1
  'Tuition fees up to date': number;       // 0/1
  'Displaced': number;                     // 0/1
  'Educational special needs': number;     // 0/1
  'Debtor': number;                        // 0/1
  'International': number;                 // 0/1
  'Unemployment rate': number;
  'Inflation rate': number;
  'GDP': number;
  'Gender': number;                        // 0/1
};
