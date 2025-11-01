import { ArrowDown, ArrowUp, TrendingUp } from 'lucide-react';
import { LocalExplanation, FeatureContribution } from '../types';

interface LocalExplanationProps {
  explanation: LocalExplanation;
  prediction: string;
}

export function LocalExplanationDisplay({ explanation, prediction }: LocalExplanationProps) {
  const formatFeatureName = (name: string): string => {
    return name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatNumber = (num: number): string => {
    return Math.abs(num) < 0.001 ? num.toFixed(4) : num.toFixed(3);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Why This Prediction?</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          The top features that influenced this prediction (local explanation using linear approximation):
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
                    <ArrowUp className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <ArrowDown className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                  <span className="font-medium text-sm text-gray-900 truncate">
                    {formatFeatureName(feature.name)}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  Value: {formatNumber(feature.value)} • Impact: {formatNumber(feature.contribution)}
                </div>
              </div>

              <div className={`flex-shrink-0 px-2 py-1 rounded text-xs font-semibold ${
                isPositive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {isPositive ? '+' : '−'}{formatNumber(absContribution)}
              </div>

              <div className="flex-shrink-0 w-16 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${isPositive ? 'bg-green-600' : 'bg-red-600'}`}
                  style={{
                    width: `${Math.min(100, (absContribution / Math.max(...explanation.features.map(f => Math.abs(f.contribution)))) * 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <p className="font-semibold mb-1">How to interpret:</p>
        <p>
          Green (↑) = features pushing toward {prediction === 'Graduate' ? 'graduation' : 'dropout'}.
          Red (↓) = features working against it. These are the most influential factors for this prediction.
        </p>
      </div>
    </div>
  );
}
