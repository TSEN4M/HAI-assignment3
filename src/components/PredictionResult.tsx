import { AlertCircle, CheckCircle, TrendingDown, TrendingUp, HelpCircle } from 'lucide-react';
import { PredictionResult } from '../types';
import { LocalExplanationDisplay } from './LocalExplanation';

interface PredictionResultProps {
  result: PredictionResult;
  modelType: string;
}

export function PredictionResultDisplay({ result, modelType }: PredictionResultProps) {
  const isGraduate = result.prediction === 'Graduate';
  const displayConfidence = Number(result.confidence ?? 0);
  const confidencePercent = (displayConfidence * 100).toFixed(1);

  const confidenceHelp =
    'Confidence = model-estimated probability of the predicted class. ' +
    'Use this as decision support alongside advisor judgment and context.';

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Prediction Result</h2>
        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
          {modelType}
        </span>
      </div>

      <div
        className={`rounded-lg p-6 ${
          isGraduate ? 'bg-green-50 border-2 border-green-200' : 'bg-amber-50 border-2 border-amber-200'
        }`}
      >
        <div className="flex items-center gap-3 mb-3">
          {isGraduate ? (
            <CheckCircle className="w-8 h-8 text-green-600" />
          ) : (
            <AlertCircle className="w-8 h-8 text-amber-600" />
          )}
          <div>
            <div className="text-sm font-medium text-gray-600">Predicted Outcome</div>
            <div className={`text-2xl font-bold ${isGraduate ? 'text-green-700' : 'text-amber-700'}`}>
              {result.prediction}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 inline-flex items-center gap-1">
              Model Confidence
              <span title={confidenceHelp}>
                <HelpCircle className="w-4 h-4 text-gray-500" aria-hidden="true" />
                <span className="sr-only">Confidence help</span>
              </span>
            </span>
            <span className="text-sm font-bold text-gray-900">{confidencePercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${isGraduate ? 'bg-green-600' : 'bg-amber-600'}`}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>
      </div>

      {result.explanation && (
        <div className="border-t pt-4">
          <LocalExplanationDisplay explanation={result.explanation} prediction={result.prediction} />
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          {isGraduate ? (
            <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          ) : (
            <TrendingDown className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Interpretation</p>
            <p>
              {isGraduate
                ? 'The model estimates a higher likelihood of graduation. Use this insight to keep reinforcing supports.'
                : 'The model indicates elevated dropout risk. Consider proactive advising, financial-aid check-ins, or counseling referrals.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-2 p-3 rounded border bg-white">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Model Behavior: </span>
          The "Why This Prediction?" section above shows the specific factors that influenced this particular prediction.
          See the Model Performance tab for overall model patterns across all students.
        </p>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2 text-sm">Important Notes</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>- Predictions are probabilistic and not determinations.</li>
          <li>- Use this alongside advisor judgment and current context.</li>
          <li>- Fairness across gender groups was evaluated and reported.</li>
          <li>- Inputs left blank use training-set defaults for stability.</li>
        </ul>
      </div>
    </div>
  );
}
