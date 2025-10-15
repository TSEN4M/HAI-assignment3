import { AlertCircle, CheckCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { PredictionResult } from '../types';

interface PredictionResultProps {
  result: PredictionResult;
  modelType: string;
}

export function PredictionResultDisplay({ result, modelType }: PredictionResultProps) {
  const isGraduate = result.prediction === 'Graduate';
  const confidencePercent = (result.confidence * 100).toFixed(1);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Prediction Result</h2>

      <div className={`rounded-lg p-6 mb-4 ${
        isGraduate ? 'bg-green-50 border-2 border-green-200' : 'bg-amber-50 border-2 border-amber-200'
      }`}>
        <div className="flex items-center gap-3 mb-3">
          {isGraduate ? (
            <CheckCircle className="w-8 h-8 text-green-600" />
          ) : (
            <AlertCircle className="w-8 h-8 text-amber-600" />
          )}
          <div>
            <div className="text-sm font-medium text-gray-600">Predicted Outcome</div>
            <div className={`text-2xl font-bold ${
              isGraduate ? 'text-green-700' : 'text-amber-700'
            }`}>
              {result.prediction}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Model Confidence</span>
            <span className="text-sm font-bold text-gray-900">{confidencePercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                isGraduate ? 'bg-green-600' : 'bg-amber-600'
              }`}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          {isGraduate ? (
            <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          ) : (
            <TrendingDown className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Model Used: {modelType}</p>
            <p>
              {isGraduate
                ? 'The model predicts this student is likely to graduate. However, this is a prediction and should be used to provide support, not make final decisions.'
                : 'The model indicates elevated dropout risk. This student may benefit from additional academic support, counseling, or financial assistance to improve outcomes.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2 text-sm">Important Notes</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• This prediction is based on historical data and statistical patterns</li>
          <li>• Individual circumstances vary and outcomes are not deterministic</li>
          <li>• Use this as one input among many for student support decisions</li>
          <li>• The model has been evaluated for fairness across gender groups</li>
        </ul>
      </div>
    </div>
  );
}
