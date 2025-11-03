import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, TrendingDown, TrendingUp, HelpCircle, Flag } from 'lucide-react';
import { PredictionResult, StudentData, ModelType } from '../types';
import { LocalExplanationDisplay } from './LocalExplanation';

interface PredictionResultProps {
  result: PredictionResult;
  modelType: string;
  modelTypeKey?: ModelType;
  studentInput?: StudentData;
}

export function PredictionResultDisplay({
  result,
  modelType,
  modelTypeKey,
  studentInput,
}: PredictionResultProps) {
  const [followUpFlagged, setFollowUpFlagged] = useState(false);
  const [advisorNote, setAdvisorNote] = useState('');

  useEffect(() => {
    setFollowUpFlagged(false);
    setAdvisorNote('');
  }, [result]);

  const isGraduate = result.prediction === 'Graduate';
  const displayConfidence = Number(result.confidence ?? 0);
  const confidencePercent = (displayConfidence * 100).toFixed(1);

  const confidenceHelp =
    'Confidence = model-estimated probability of the predicted class. Use this as decision support alongside advisor judgment and context.';

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
          <div className="mt-1 text-xs text-gray-600">
            Imagine 100 similar students: about {Math.round(displayConfidence * 100)} experienced this outcome.
          </div>
        </div>
      </div>

      {result.explanation && (
        <div className="border-t pt-4">
          <LocalExplanationDisplay
            explanation={result.explanation}
            prediction={result.prediction}
            modelType={modelTypeKey || 'reweighted'}
            studentInput={studentInput}
          />
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
                ? 'The student is trending toward graduation. Keep reinforcing the supports listed above and monitor for new risks.'
                : 'The student shows elevated dropout risk. Plan outreach, financial-aid check-ins, or counseling referrals as appropriate.'}
            </p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-white space-y-3">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Advisor follow-up</h3>
        </div>
        <p className="text-sm text-gray-700">
          Track next steps here, then copy them into your case management system.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setFollowUpFlagged((prev) => !prev)}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              followUpFlagged
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600'
            }`}
          >
            {followUpFlagged ? <CheckCircle className="w-4 h-4" /> : <Flag className="w-4 h-4" />}
            {followUpFlagged ? 'Follow-up flagged' : 'Mark for follow-up'}
          </button>
        </div>
        {followUpFlagged && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600" htmlFor="advisor-note">
              Quick note (optional)
            </label>
            <textarea
              id="advisor-note"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={3}
              placeholder="E.g., email student about tuition balance, schedule mentoring check-in, connect with counseling."
              value={advisorNote}
              onChange={(e) => setAdvisorNote(e.target.value)}
            />
            <p className="text-xs text-gray-500">Notes are not saved—copy anything important into your advising system.</p>
          </div>
        )}
      </div>

      <div className="mt-2 p-3 rounded border bg-white">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Model Behavior: </span>
          The “Why This Prediction?” section above shows the specific factors that influenced this
          particular prediction. See the Model Performance tab for overall model patterns across all students.
        </p>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2 text-sm">Use With Care</h3>
        <ul className="text-sm text-gray-700 space-y-1 list-disc ml-4">
          <li>This is one data point—combine it with your judgment and recent student context.</li>
          <li>Confidence scores are estimates, not guarantees of success or failure.</li>
          <li>Fairness checks across gender groups are summarized on the Model Performance tab.</li>
          <li>Blank form fields rely on training medians; update values when fresher data is available.</li>
        </ul>
      </div>
    </div>
  );
}
