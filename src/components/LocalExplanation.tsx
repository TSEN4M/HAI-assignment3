import { ArrowDown, ArrowUp, TrendingUp } from 'lucide-react';
import { LocalExplanation, FeatureContribution } from '../types';

interface LocalExplanationProps {
  explanation: LocalExplanation;
  prediction: string;
}

const YES_NO_FEATURES = new Set([
  'Scholarship holder',
  'Tuition fees up to date',
  'Displaced',
  'Educational special needs',
  'Debtor',
  'International',
]);
const PERCENT_FEATURES = new Set(['Unemployment rate', 'Inflation rate']);

export function LocalExplanationDisplay({ explanation, prediction }: LocalExplanationProps) {
  const outcomeNoun = prediction === 'Graduate' ? 'graduation' : 'dropout';

  const formatFeatureName = (name: string): string => {
    return name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatNumber = (num: number): string => {
    if (!Number.isFinite(num)) return '0';
    const rounded = Math.round(num);
    if (Math.abs(num - rounded) < 1e-6) {
      return String(rounded);
    }
    return Math.abs(num) < 0.001 ? num.toFixed(4) : num.toFixed(3);
  };

  const formatValue = (feature: FeatureContribution): string => {
    const { name, value } = feature;
    if (!Number.isFinite(value)) return '-';

    if (name === 'Gender') {
      return value >= 0.5 ? 'Female' : 'Male';
    }

    if (YES_NO_FEATURES.has(name)) {
      return value >= 0.5 ? 'Yes' : 'No';
    }

    if (PERCENT_FEATURES.has(name)) {
      return `${formatNumber(value)}%`;
    }

    return formatNumber(value);
  };

  const maxAbsContribution =
    explanation.features.reduce((max, feature) => {
      return Math.max(max, Math.abs(feature.contribution));
    }, 0) || 1;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Why This Prediction?</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          The top features that influenced this {outcomeNoun} prediction (local linear explanation).
        </p>
      </div>

      <div className="space-y-2">
        {explanation.features.map((feature: FeatureContribution, idx: number) => {
          const isPositive = feature.contribution > 0;
          const absContribution = Math.abs(feature.contribution);

          return (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {isPositive ? (
                    <ArrowUp className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <ArrowDown className="w-4 h-4 text-red-600 flex-shrink-0" aria-hidden="true" />
                  )}
                  <span className="font-medium text-sm text-gray-900 truncate">
                    {formatFeatureName(feature.name)}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  Value: {formatValue(feature)} - Impact: {formatNumber(feature.contribution)}
                </div>
              </div>

              <div
                className={`flex-shrink-0 px-2 py-1 rounded text-xs font-semibold ${
                  isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {isPositive ? '+' : '-'}{formatNumber(absContribution)}
              </div>

              <div className="flex-shrink-0 w-16 bg-gray-200 rounded-full h-2" aria-hidden="true">
                <div
                  className={`h-2 rounded-full ${isPositive ? 'bg-green-600' : 'bg-red-600'}`}
                  style={{ width: `${Math.min(100, (absContribution / maxAbsContribution) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <p className="font-semibold mb-1">How to interpret:</p>
        <p>
          Green (+) = features pushing toward graduation. Red (-) = features pushing toward dropout.
          These are the most influential factors for this prediction.
        </p>
      </div>
    </div>
  );
}
