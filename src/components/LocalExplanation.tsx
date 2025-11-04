import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, ShieldCheck, AlertTriangle, LifeBuoy } from 'lucide-react';
import { LocalExplanation, FeatureContribution, StudentData, ModelType } from '../types';

const API_BASE = import.meta.env.VITE_SUPABASE_URL;

interface LocalExplanationProps {
  explanation: LocalExplanation;
  prediction: string;
  modelType: ModelType;
  studentInput?: StudentData;
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

const FEATURE_KEY_MAP = {
  'Admission grade': 'Admission_grade',
  'Age at enrollment': 'Age_at_enrollment',
  'Scholarship holder': 'Scholarship_holder',
  'Tuition fees up to date': 'Tuition_up_to_date',
  'Displaced': 'Displaced',
  'Educational special needs': 'Educational_special_needs',
  'Debtor': 'Debtor',
  'International': 'International',
  'Unemployment rate': 'Unemployment_rate',
  'Inflation rate': 'Inflation_rate',
  'GDP': 'GDP',
  'Gender': 'Gender',
} as const satisfies Record<string, keyof StudentData>;

const featureKeyFromName = (name: string): keyof StudentData | null => {
  if (name in FEATURE_KEY_MAP) {
    return FEATURE_KEY_MAP[name as keyof typeof FEATURE_KEY_MAP];
  }
  return null;
};

const to01 = (value: any): number => {
  if (value === 'Yes' || value === 1 || value === true || value === '1') return 1;
  if (value === 'No' || value === 0 || value === false || value === '0') return 0;
  return Number(value ?? 0) || 0;
};

export function LocalExplanationDisplay({
  explanation,
  prediction,
  modelType,
  studentInput,
}: LocalExplanationProps) {
  const predictedClass = prediction === 'Graduate' ? 'graduation' : 'dropout';

  const formatFeatureName = (name: string): string =>
    name
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const formatNumber = (num: number): string => {
    if (!Number.isFinite(num)) return '0';
    const rounded = Math.round(num);
    if (Math.abs(num - rounded) < 1e-6) return String(rounded);
    return Math.abs(num) < 0.001 ? num.toFixed(4) : num.toFixed(3);
  };

  const formatValue = (feature: FeatureContribution): string => {
    const { name, value } = feature;
    if (!Number.isFinite(value)) return '-';
    if (name === 'Gender') return value >= 0.5 ? 'Female' : 'Male';
    if (YES_NO_FEATURES.has(name)) return value >= 0.5 ? 'Yes' : 'No';
    if (PERCENT_FEATURES.has(name)) return `${formatNumber(value)}%`;
    return formatNumber(value);
  };

  const [globalWeights, setGlobalWeights] =
    useState<Array<{ feature: string; weight: number; importance: number }>>([]);
  const [loadingWeights, setLoadingWeights] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/functions/v1/global-explanations/${modelType}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!alive) return;
        setGlobalWeights(data.features || []);
      } catch (error) {
        console.warn('Failed to load global weights', error);
      } finally {
        if (alive) setLoadingWeights(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [modelType]);

  const maxAbsContribution =
    explanation.features.reduce(
      (max, feature) => Math.max(max, Math.abs(feature.contribution)),
      0,
    ) || 1;

  const protective = [...explanation.features]
    .filter((feature) => feature.contribution > 0)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const risks = [...explanation.features]
    .filter((feature) => feature.contribution < 0)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const presentNames = new Set(explanation.features.map((feature) => feature.name));
  const missingSupports: Array<{ name: string; weight: number }> = [];

  if (studentInput && globalWeights.length) {
    for (const gw of globalWeights) {
      if (gw.weight > 0 && gw.importance >= 0.5 && !presentNames.has(gw.feature)) {
        const key = featureKeyFromName(gw.feature);
        const raw = key ? (studentInput as any)[key] : undefined;
        if (to01(raw) === 0) {
          missingSupports.push({ name: gw.feature, weight: gw.weight });
        }
      }
    }
  }

  missingSupports.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  const topMissing = missingSupports.slice(0, 3);

  const summary = useMemo(() => {
    const topProtective = protective[0];
    const topRisk = risks[0];

    if (topProtective && topRisk) {
      return `${formatFeatureName(topProtective.name)} is the strongest positive factor, while ${formatFeatureName(topRisk.name)} is the biggest concern to address.`;
    }

    if (topProtective) {
      return `${formatFeatureName(topProtective.name)} is the strongest positive factor influencing this prediction.`;
    }

    if (topRisk) {
      return `${formatFeatureName(topRisk.name)} is the main reason this prediction leans toward dropout.`;
    }

    return '';
  }, [protective, risks]);

  const actionSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    const topProtective = protective[0];
    const topRisk = risks[0];
    const topGap = topMissing[0];

    if (topRisk) {
      suggestions.push(
        `Check in on ${formatFeatureName(topRisk.name)}—that factor is pulling the prediction toward dropout.`,
      );
    }

    if (topGap) {
      suggestions.push(
        `Explore ways to provide ${formatFeatureName(topGap.name)} support; adding it would boost graduation odds.`,
      );
    }

    if (topProtective) {
      suggestions.push(
        `Keep reinforcing ${formatFeatureName(topProtective.name)} so it continues to support graduation.`,
      );
    }

    return suggestions;
  }, [protective, risks, topMissing]);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Why This Prediction?</h3>
        </div>
        <p className="text-sm text-gray-600">
          Items with the <ShieldCheck className="inline h-3 w-3 text-green-600 align-text-top" aria-hidden="true" /> icon
          support graduation. <AlertTriangle className="inline h-3 w-3 text-red-600 align-text-top" aria-hidden="true" /> warns
          about dropout risk. <LifeBuoy className="inline h-3 w-3 text-amber-600 align-text-top" aria-hidden="true" /> highlights
          important supports currently missing for this {predictedClass} prediction.
        </p>
        <p className="text-xs text-gray-600 mt-2">
          Starting point (baseline): {formatNumber(explanation.base_value)} leaning toward{' '}
          {explanation.base_value >= 0 ? 'graduation' : 'dropout'} before looking at this student's details.
        </p>
      </div>

      {summary && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
          <span className="font-semibold">Story in one sentence: </span>
          {summary}
        </div>
      )}

      {actionSuggestions.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <span className="font-semibold">Advisor to-do ideas:</span>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {actionSuggestions.map((item, idx) => (
              <li key={`action-${idx}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Protective factors
          </h4>
          <div className="space-y-2">
            {protective.length === 0 && (
              <div className="text-xs text-gray-500">No strong protective factors detected.</div>
            )}
            {protective.map((feature) => {
              const absContribution = Math.abs(feature.contribution);
              const width = Math.min(100, (absContribution / maxAbsContribution) * 100);
              return (
                <div
                  key={`protective-${feature.name}`}
                  className="p-3 bg-white rounded-lg border border-green-100"
                >
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {formatFeatureName(feature.name)}
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                        <span className="flex-shrink-0 whitespace-nowrap">
                          Value: {formatValue(feature)}
                        </span>
                        <div
                          className="h-2 w-32 sm:w-40 rounded-full border border-green-200"
                          aria-hidden="true"
                          style={{
                            background: `linear-gradient(to right, rgb(22,163,74) ${width}%, rgba(22,163,74,0.15) ${width}%)`,
                          }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-green-700">
                        Pushes prediction toward graduation by {formatNumber(absContribution)}.
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Risk drivers
          </h4>
          <div className="space-y-2">
            {risks.length === 0 && (
              <div className="text-xs text-gray-500">No strong risk drivers detected.</div>
            )}
            {risks.map((feature) => {
              const absContribution = Math.abs(feature.contribution);
              const width = Math.min(100, (absContribution / maxAbsContribution) * 100);
              return (
                <div
                  key={`risk-${feature.name}`}
                  className="p-3 bg-white rounded-lg border border-red-100"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {formatFeatureName(feature.name)}
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                        <span className="flex-shrink-0 whitespace-nowrap">
                          Value: {formatValue(feature)}
                        </span>
                        <div
                          className="h-2 w-32 sm:w-40 rounded-full border border-red-200"
                          aria-hidden="true"
                          style={{
                            background: `linear-gradient(to right, rgb(220,38,38) ${width}%, rgba(220,38,38,0.15) ${width}%)`,
                          }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-red-700">
                        Pulls prediction toward dropout by {formatNumber(absContribution)}.
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <LifeBuoy className="w-4 h-4 text-amber-600" /> Missing supports to build
        </h4>
        <div className="space-y-2">
          {loadingWeights && (
            <div className="text-xs text-gray-500">Checking important supports…</div>
          )}
          {!loadingWeights && topMissing.length === 0 && (
            <div className="text-xs text-gray-500">No important supports are missing.</div>
          )}
          {topMissing.map((item) => (
            <div
              key={`missing-${item.name}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-2 text-sm text-gray-900">
                <LifeBuoy className="w-4 h-4 text-amber-600" aria-hidden="true" />
                <span>
                  {formatFeatureName(item.name)}: <span className="text-gray-600">Not present yet</span>
                </span>
              </div>
              <div className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-800">
                absence reduces graduation odds by {formatNumber(Math.abs(item.weight))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
        <p className="font-semibold mb-1">What helps most</p>
        <p>
          {topMissing.length > 0
            ? `Focusing on ${formatFeatureName(topMissing[0].name)} would move the prediction toward graduation the most (estimated impact: +${formatNumber(topMissing[0].weight)}).`
            : 'Reinforce the current protective factors by continuing academic support and regular check-ins.'}
        </p>
      </div>
    </div>
  );
}
