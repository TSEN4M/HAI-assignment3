import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface StudentData {
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

interface PredictionRequest {
  student_data: StudentData;
  model_type: 'baseline' | 'drop_gender' | 'reweighted' | 'calibrated';
}

function predictDropout(data: StudentData, modelType: string): { prediction: string; confidence: number } {
  const features = [
    data.marital_status,
    data.application_mode,
    data.application_order,
    data.course,
    data.attendance,
    data.previous_qualification,
    data.mothers_qualification,
    data.fathers_qualification,
    data.mothers_occupation,
    data.fathers_occupation,
    data.displaced,
    data.educational_special_needs,
    data.debtor,
    data.tuition_fees_up_to_date,
    data.gender,
    data.scholarship_holder,
    data.age_at_enrollment,
    data.international,
    data.curricular_units_1st_sem_credited,
    data.curricular_units_1st_sem_enrolled,
    data.curricular_units_1st_sem_evaluations,
    data.curricular_units_1st_sem_approved,
    data.curricular_units_1st_sem_grade,
    data.curricular_units_1st_sem_without_evaluations,
    data.curricular_units_2nd_sem_credited,
    data.curricular_units_2nd_sem_enrolled,
    data.curricular_units_2nd_sem_evaluations,
    data.curricular_units_2nd_sem_approved,
    data.curricular_units_2nd_sem_grade,
    data.curricular_units_2nd_sem_without_evaluations,
    data.unemployment_rate,
    data.inflation_rate,
    data.gdp,
  ];

  const grade1 = data.curricular_units_1st_sem_grade;
  const grade2 = data.curricular_units_2nd_sem_grade;
  const approved1 = data.curricular_units_1st_sem_approved;
  const approved2 = data.curricular_units_2nd_sem_approved;
  const scholarship = data.scholarship_holder;
  const gender = data.gender;

  let dropoutScore = 0.5;

  if (modelType === 'baseline' || modelType === 'calibrated') {
    dropoutScore += (gender === 1 ? 0.12 : -0.12);
  }

  dropoutScore += (grade1 < 10 ? 0.15 : -0.10);
  dropoutScore += (grade2 < 10 ? 0.18 : -0.12);
  dropoutScore += (approved1 < 3 ? 0.10 : -0.08);
  dropoutScore += (approved2 < 3 ? 0.12 : -0.10);
  dropoutScore += (scholarship === 0 ? 0.08 : -0.08);
  dropoutScore += (data.debtor === 1 ? 0.10 : 0);
  dropoutScore += (data.tuition_fees_up_to_date === 0 ? 0.12 : 0);

  if (modelType === 'reweighted' && gender === 1) {
    dropoutScore -= 0.15;
  }

  dropoutScore = Math.max(0.05, Math.min(0.95, dropoutScore));

  const prediction = dropoutScore > 0.5 ? 'Dropout' : 'Graduate';
  const confidence = dropoutScore > 0.5 ? dropoutScore : 1 - dropoutScore;

  return { prediction, confidence };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { student_data, model_type }: PredictionRequest = await req.json();

    if (!student_data || !model_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: student_data and model_type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = predictDropout(student_data, model_type);

    const { error: insertError } = await supabase.from('predictions').insert({
      student_data,
      model_type,
      prediction: result.prediction,
      confidence: result.confidence,
    });

    if (insertError) {
      console.error('Error inserting prediction:', insertError);
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});