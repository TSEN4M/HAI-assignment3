import { useEffect, useState } from 'react';
import { BarChart3, Users, Scale } from 'lucide-react';
import { ModelMetrics, ModelType } from '../types';

const API_BASE = import.meta.env.VITE_SUPABASE_URL;

export function ModelPerformance() {
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/rest/v1/model_metrics?select=*`, { cache: 'no-store' });
        if (!res.ok) throw new Error(await res.text());
        const rows: ModelMetrics[] = await res.json();

        // Stable ordering for display
        const order: ModelType[] = ['baseline', 'drop_gender', 'reweighted', 'calibrated'];
        rows.sort((a, b) => order.indexOf(a.model_type) - order.indexOf(b.model_type));

        if (!alive) return;
        setMetrics(rows);
      } catch (e: any) {
        console.error('Error fetching metrics:', e);
        if (!alive) return;
        setError('Could not load model metrics.');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Loading model metrics...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  const getModelName = (type: ModelType | string) => {
    const names: Record<string, string> = {
      baseline: 'Baseline Model',
      drop_gender: 'Gender-Blind Model',
      reweighted: 'Reweighted Model (Recommended)',
      calibrated: 'Calibrated Model',
    };
    return names[type] || type;
  };

  const pct = (v?: number) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : '-');
  const dec = (v?: number) => (typeof v === 'number' ? v.toFixed(3) : '-');
  const f1 = (p?: number, r?: number) =>
    typeof p === 'number' && typeof r === 'number' && p + r !== 0 ? (2 * p * r) / (p + r) : 0;
  const pctRounded = (v?: number) => (typeof v === 'number' ? Math.round(v * 100) : null);

  const fairnessBadge = (m: ModelMetrics) => {
    const spdAbs = Math.abs(m.spd);
    const eodAbs = Math.abs(m.eod);
    if (spdAbs < 0.15 && eodAbs < 0.10) return 'Good';
    if (spdAbs < 0.25 && eodAbs < 0.15) return 'Fair';
    return 'Poor';
  };

  const recommended = metrics.find((m) => m.model_type === 'reweighted');
  const baseline = metrics.find((m) => m.model_type === 'baseline');

  return (
    <div className="space-y-6">
      {/* OVERVIEW */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Model Performance Overview</h2>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">What This Model Does</h3>
          <p className="text-sm text-gray-700">
            This system predicts whether a student will graduate or drop out using academic and contextual features.
            Metrics below summarize overall performance (Accuracy, Precision, Recall, F1) across the four model variants.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Model</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Accuracy</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Precision</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Recall</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">F1</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.model_type} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{getModelName(m.model_type)}</td>
                  <td className="text-center py-3 px-4">{pct(m.accuracy)}</td>
                  <td className="text-center py-3 px-4">{pct(m.precision)}</td>
                  <td className="text-center py-3 px-4">{pct(m.recall)}</td>
                  <td className="text-center py-3 px-4">{pct(m.f1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-gray-600">
          <p><strong>Accuracy:</strong> Percentage of correct predictions overall</p>
          <p><strong>Precision:</strong> Of predicted graduates, how many actually graduated?</p>
          <p><strong>Recall (TPR):</strong> Of actual graduates, how many were identified?</p>
          <p><strong>F1:</strong> Harmonic mean of precision and recall</p>
        </div>

        {recommended && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 space-y-1">
            <p>
              <strong>Quick takeaway:</strong> The Reweighted Model gets about{' '}
              {pctRounded(recommended.accuracy) ?? '–'} out of 100 students right overall and keeps gender
              fairness rated as {fairnessBadge(recommended).toLowerCase()}.
            </p>
            {baseline && (
              <p>
                Compared with the Baseline Model, the Reweighted Model improves parity
                (SPD {dec(baseline.spd)} → {dec(recommended.spd)}; EOD {dec(baseline.eod)} → {dec(recommended.eod)}).
              </p>
            )}
            <p>Use the tables below whenever you need the detailed numbers.</p>
          </div>
        )}
      </div>

      {/* FAIRNESS */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Scale className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Fairness Metrics</h2>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-amber-900 mb-2">Why Fairness Matters</h3>
          <p className="text-sm text-amber-800">
            The baseline model showed gender disparity. We explored mitigation strategies (dropping the sensitive
            attribute, reweighting, and calibration) to improve parity while retaining useful accuracy.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Model</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">SPD</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">EOD</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Fairness</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => {
                const spdAbs = Math.abs(m.spd);
                const eodAbs = Math.abs(m.eod);
                const fairnessScore = fairnessBadge(m);
                const fairnessColor =
                  fairnessScore === 'Good' ? 'text-green-700 bg-green-100'
                  : fairnessScore === 'Fair' ? 'text-amber-700 bg-amber-100'
                  : 'text-red-700 bg-red-100';

                return (
                  <tr key={m.model_type} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{getModelName(m.model_type)}</td>
                    <td className="text-center py-3 px-4">{dec(m.spd)}</td>
                    <td className="text-center py-3 px-4">{dec(m.eod)}</td>
                    <td className="text-center py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${fairnessColor}`}>
                        {fairnessScore}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-gray-600 space-y-1">
          <p><strong>SPD (Statistical Parity Difference):</strong> Closer to 0 is better parity.</p>
          <p><strong>EOD (Equal Opportunity Difference):</strong> Closer to 0 is better parity in recall.</p>
          <p><strong>Negative values:</strong> indicate worse outcomes for female students in these metrics.</p>
        </div>
      </div>

      {/* PER-GROUP */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">Per-Group Performance</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metrics.map((m) => {
            const fF1 = f1(m.female_precision, m.female_recall);
            const mF1 = f1(m.male_precision, m.male_recall);
            return (
              <div key={m.model_type} className="border-2 border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">{getModelName(m.model_type)}</h3>

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Female Students</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-pink-50 p-2 rounded">
                        <div className="text-gray-600">Recall</div>
                        <div className="font-bold text-pink-700">{pct(m.female_recall)}</div>
                      </div>
                      <div className="bg-pink-50 p-2 rounded">
                        <div className="text-gray-600">Precision</div>
                        <div className="font-bold text-pink-700">{pct(m.female_precision)}</div>
                      </div>
                      <div className="bg-pink-50 p-2 rounded">
                        <div className="text-gray-600">F1</div>
                        <div className="font-bold text-pink-700">{pct(fF1)}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Male Students</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-blue-50 p-2 rounded">
                        <div className="text-gray-600">Recall</div>
                        <div className="font-bold text-blue-700">{pct(m.male_recall)}</div>
                      </div>
                      <div className="bg-blue-50 p-2 rounded">
                        <div className="text-gray-600">Precision</div>
                        <div className="font-bold text-blue-700">{pct(m.male_precision)}</div>
                      </div>
                      <div className="bg-blue-50 p-2 rounded">
                        <div className="text-gray-600">F1</div>
                        <div className="font-bold text-blue-700">{pct(mF1)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-xs text-gray-600">
          <p><strong>Recall:</strong> Of all graduates, how many did we identify correctly?</p>
          <p><strong>Precision:</strong> Of all predicted graduates, how many actually graduated?</p>
          <p><strong>F1:</strong> Harmonic mean of precision and recall (computed here from P/R).</p>
        </div>
      </div>
    </div>
  );
}
