import { useEffect, useState } from 'react';
import { GraduationCap, Info } from 'lucide-react';
import { StudentInputForm } from './components/StudentInputForm';
import { PredictionResultDisplay } from './components/PredictionResult';
import { ModelPerformance } from './components/ModelPerformance';
import { GlobalExplanationDisplay } from './components/GlobalExplanation';
import { StudentData, ModelType, PredictionResult, MODEL_LABELS } from './types';

const API_BASE = import.meta.env.VITE_SUPABASE_URL;

function App() {
  const [activeTab, setActiveTab] = useState<'predict' | 'performance' | 'explanations'>('predict');
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [lastInput, setLastInput] = useState<StudentData | null>(null);
  const [selectedModelLabel, setSelectedModelLabel] = useState<string>(MODEL_LABELS.reweighted);
  const [selectedModelType, setSelectedModelType] = useState<ModelType>('reweighted');
  const [loading, setLoading] = useState(false);


  const handlePrediction = async (data: StudentData, modelType: ModelType) => {
    setLoading(true);
    setPrediction(null);
    setLastInput(data);

    try {
      const apiUrl = `${API_BASE}/functions/v1/predict-dropout`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_data: data,
          model_type: modelType,
        }),
      });

      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || 'Prediction failed');
      }

      const result: PredictionResult = await response.json();
      setPrediction(result);
      setSelectedModelLabel(MODEL_LABELS[modelType] ?? modelType);
      setSelectedModelType(modelType);
    } catch (error) {
      console.error('Error making prediction:', error);
      alert('Failed to make prediction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Student Dropout Prediction System
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Fair and transparent ML-based early warning system for student success
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Intended Users: Academic Advisors & Student Support Staff</p>
              <p>
                This system helps identify students at risk of dropping out, enabling timely intervention
                and support. The model has been carefully evaluated for fairness across gender groups
                to ensure equitable predictions for all students.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('predict')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'predict'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Make Prediction
            </button>
            <button
              onClick={() => setActiveTab('explanations')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'explanations'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Model Explanations
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'performance'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Model Performance & Fairness
            </button>
          </div>
        </div>

        {activeTab === 'predict' ? (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Student Information</h2>
              <StudentInputForm onSubmit={handlePrediction} loading={loading} />
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              {prediction ? (
                <PredictionResultDisplay
                  result={prediction}
                  modelType={selectedModelLabel}
                  modelTypeKey={selectedModelType || 'reweighted'}
                  studentInput={lastInput || undefined}
                />
              ) : (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  <GraduationCap className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No prediction yet</p>
                  <p className="text-sm mt-2">
                    Enter student information and click predict to see results
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'explanations' ? (
          <div className="max-w-4xl">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Model Explainability</h2>
              <p className="text-gray-700 mb-4">
                Understanding how models make predictions is critical for informed decision-making. This page provides both
                <strong> global explanations</strong> (model behavior overall) and <strong>local explanations</strong> (why a specific prediction was made).
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Select a Model to Explore</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(['baseline', 'drop_gender', 'reweighted', 'calibrated'] as ModelType[]).map((modelKey) => {
                      const label = MODEL_LABELS[modelKey] ?? modelKey;
                      return (
                        <button
                          key={modelKey}
                          onClick={() => {
                            setSelectedModelType(modelKey);
                            setSelectedModelLabel(label);
                          }}
                          className={`p-3 rounded-lg border transition text-left ${
                            selectedModelType === modelKey
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedModelType && (
                  <div className="border-t pt-6">
                    <GlobalExplanationDisplay modelType={selectedModelType} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <ModelPerformance />
        )}
      </div>

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-sm text-gray-600">
            <p className="font-semibold mb-2">Model Limitations & Scope</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Trained on Portuguese higher education data — may not generalize to other contexts.</li>
              <li>Predictions are probabilistic and should not be the sole basis for decisions.</li>
              <li>Model performance varies across demographic groups — see fairness metrics.</li>
              <li>Best used as an early warning system to trigger support interventions.</li>
              <li>Does not account for external factors like personal circumstances or life events.</li>
            </ul>
            <p className="mt-4 text-xs text-gray-500">
              CS698Y Human-AI Interaction | Assignment 3 | Tsewang Namgail &amp; Sevak Shekokar
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
