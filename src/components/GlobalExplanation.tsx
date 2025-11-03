import { useEffect, useMemo, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
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

  if (loading) {
    return <div className="text-center py-6 text-gray-600">Loading model explanation...</div>;
  }

  if (error || !explanation) {
    return <div className="text-center py-6 text-red-600">{error || 'No explanation available'}</div>;
  }

  const maxImportance = Math.max(...explanation.features.map(f => f.importance));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-gray-900">Model Feature Importance</h3>
      </div>

      <p className="text-sm text-gray-600">
        These features have the strongest influence on predictions across all students. Positive weights increase
        graduation likelihood; negative weights increase dropout likelihood.
      </p>

      <div className="space-y-3">
        {explanation.features.map((feature, idx) => {
          const isPositive = feature.weight > 0;
          const normWidth = (feature.importance / maxImportance) * 100;

          return (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-32 text-sm font-medium text-gray-700 truncate">
                {formatFeatureName(feature.feature)}
              </div>

              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${isPositive ? 'bg-green-600' : 'bg-red-600'}`}
                    style={{ width: `${normWidth}%` }}
                  />
                </div>
              </div>

              <div className="w-16 text-right">
                <div className={`text-sm font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                  {isPositive ? '+' : '−'}{formatNumber(feature.weight)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
        <p className="font-semibold">Understanding Feature Importance:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Longer bars = stronger influence on predictions</li>
          <li>Green = increases likelihood of predicted class</li>
          <li>Red = decreases likelihood of predicted class</li>
          <li>This is the model's learned behavior across all students in training</li>
        </ul>
      </div>
    </div>
  );
}
