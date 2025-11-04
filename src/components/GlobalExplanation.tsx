import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Info, ShieldCheck, Zap } from 'lucide-react';
import { ModelType, GlobalExplanation } from '../types';

const API_BASE = import.meta.env.VITE_SUPABASE_URL;

interface GlobalExplanationProps {
  modelType: ModelType;
}

export function GlobalExplanationDisplay({ modelType }: GlobalExplanationProps) {
  const [explanation, setExplanation] = useState<GlobalExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Partial<Record<ModelType, GlobalExplanation>>>({});

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      const cached = cacheRef.current[modelType];
      if (cached) {
        setExplanation(cached);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/functions/v1/global-explanations/${modelType}`);
        if (!res.ok) throw new Error(await res.text());
        const data: GlobalExplanation = await res.json();

        if (!alive) return;
        setExplanation(data);
        cacheRef.current[modelType] = data;
      } catch (e: any) {
        console.error('Error fetching global explanations:', e);
        if (!alive) return;
        setError('Could not load model explanations.');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [modelType]);

  const formatFeatureName = (name: string): string => {
    return name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatNumber = useMemo(
    () => (num: number): string => (Math.abs(num) < 0.001 ? num.toFixed(4) : num.toFixed(3)),
    [],
  );

  const impactLabel = (importanceRatio: number): string => {
    if (importanceRatio >= 0.75) return 'Very strong impact';
    if (importanceRatio >= 0.5) return 'Strong impact';
    if (importanceRatio >= 0.25) return 'Moderate impact';
    return 'Lower impact';
  };

  const directionLabel = (isPositive: boolean): string =>
    isPositive ? 'Supports graduation' : 'Raises dropout risk';

  if (loading) {
    return <div className="text-center py-6 text-gray-600">Loading model explanation...</div>;
  }

  if (error || !explanation) {
    return <div className="text-center py-6 text-red-600">{error || 'No explanation available'}</div>;
  }

  const maxImportance = Math.max(...explanation.features.map(f => f.importance));
  const positives = explanation.features
    .filter((feature) => feature.weight > 0)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3);
  const negatives = explanation.features
    .filter((feature) => feature.weight < 0)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-gray-900">Model Feature Importance</h3>
      </div>

      <div className="space-y-3 text-sm text-gray-600">
        <p>
          This view shows the model{"'"}s overall patterns — which student factors the selected model leans on most.
        </p>
        <p className="text-xs text-gray-500">
          Larger bars mean a bigger influence on decisions across all students in training data. Use this as context and
          pair it with student-specific explanations when advising.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            Top supports in this model
          </div>
          {positives.length ? (
            <ul className="list-disc space-y-1 pl-4">
              {positives.map((feature) => (
                <li key={`support-${feature.feature}`}>
                  {formatFeatureName(feature.feature)} — helps the model favor graduation.
                </li>
              ))}
            </ul>
          ) : (
            <p>No strong supportive factors identified.</p>
          )}
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Top risks in this model
          </div>
          {negatives.length ? (
            <ul className="list-disc space-y-1 pl-4">
              {negatives.map((feature) => (
                <li key={`risk-${feature.feature}`}>
                  {formatFeatureName(feature.feature)} — pushes predictions toward dropout.
                </li>
              ))}
            </ul>
          ) : (
            <p>No strong risk factors identified.</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {explanation.features.map((feature, idx) => {
          const isPositive = feature.weight > 0;
          const normWidth = (feature.importance / maxImportance) * 100;
          const ratio = feature.importance / maxImportance;
          return (
            <div key={idx} className="space-y-1 rounded-lg border border-gray-100 bg-white/50 p-3">
              <div className="flex items-start gap-3">
                <div className="w-32 flex-shrink-0 text-sm font-medium text-gray-800 truncate">
                  {formatFeatureName(feature.feature)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden" aria-hidden="true">
                      <div
                        className={`h-full ${isPositive ? 'bg-green-600' : 'bg-red-600'}`}
                        style={{ width: `${normWidth}%` }}
                      />
                    </div>
                    <span className={`text-sm font-semibold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                      {isPositive ? '+' : '−'}
                      {formatNumber(feature.weight)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                    {isPositive ? (
                      <ShieldCheck className="h-3 w-3 text-green-600" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-red-600" aria-hidden="true" />
                    )}
                    <span>
                      {impactLabel(ratio)} · {directionLabel(isPositive)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        <div className="flex items-center gap-2 font-semibold text-amber-800">
          <Info className="h-4 w-4" />
          How advisors can use this
        </div>
        <ul className="list-disc space-y-1 pl-4">
          <li>Scan top supports/risks to identify common leverage points to discuss with students.</li>
          <li>Use this alongside individual explanations — this shows patterns, not guaranteed causes.</li>
          <li>Model was trained on Portuguese higher-ed data; confirm factors match your institution before acting.</li>
        </ul>
      </div>
    </div>
  );
}
