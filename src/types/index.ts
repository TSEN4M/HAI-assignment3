export interface StudentData {
  marital_status: number;
  application_mode: number;
  application_order: number;
  course: number;
  attendance: number;
  previous_qualification: number;
  nationality: number;
  mothers_qualification: number;
  fathers_qualification: number;
  mothers_occupation: number;
  fathers_occupation: number;
  displaced: number;
  educational_special_needs: number;
  debtor: number;
  tuition_fees_up_to_date: number;
  gender: number;
  scholarship_holder: number;
  age_at_enrollment: number;
  international: number;
  curricular_units_1st_sem_credited: number;
  curricular_units_1st_sem_enrolled: number;
  curricular_units_1st_sem_evaluations: number;
  curricular_units_1st_sem_approved: number;
  curricular_units_1st_sem_grade: number;
  curricular_units_1st_sem_without_evaluations: number;
  curricular_units_2nd_sem_credited: number;
  curricular_units_2nd_sem_enrolled: number;
  curricular_units_2nd_sem_evaluations: number;
  curricular_units_2nd_sem_approved: number;
  curricular_units_2nd_sem_grade: number;
  curricular_units_2nd_sem_without_evaluations: number;
  unemployment_rate: number;
  inflation_rate: number;
  gdp: number;
}

export interface ModelMetrics {
  id: string;
  model_type: string;
  accuracy: number;
  spd: number;
  eod: number;
  female_recall: number;
  male_recall: number;
  female_precision: number;
  male_precision: number;
  female_f1: number;
  male_f1: number;
  updated_at: string;
}

export interface PredictionResult {
  prediction: string;
  confidence: number;
}

export type ModelType = 'baseline' | 'drop_gender' | 'reweighted' | 'calibrated';
