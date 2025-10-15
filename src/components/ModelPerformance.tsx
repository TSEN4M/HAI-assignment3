import { useEffect, useState } from 'react';
import { BarChart3, Users, Scale } from 'lucide-react';
import { ModelMetrics } from '../types';
import { supabase } from '../lib/supabase';

export function ModelPerformance() {
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      const { data, error } = await supabase
        .from('model_metrics')
        .select('*')
        .order('model_type');

      if (error) {
        console.error('Error fetching metrics:', error);
      } else {
        setMetrics(data || []);
      }
      setLoading(false);
    }

    fetchMetrics();
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Loading model metrics...</div>;
  }

  const getModelName = (type: string) => {
    const names: Record<string, string> = {
      baseline: 'Baseline Model',
      drop_gender: 'Gender-Blind Model',
      reweighted: 'Reweighted Model',
      calibrated: 'Calibrated Model',
    };
    return names[type] || type;
  };

  const formatMetric = (value: number, isPercentage = false) => {
    if (isPercentage) {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toFixed(3);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Model Performance Overview</h2>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">What This Model Does</h3>
          <p className="text-sm text-gray-700">
            This system predicts whether a student will graduate or drop out based on their academic
            performance, demographics, and economic factors. The model has been trained on historical
            student data and evaluated for both accuracy and fairness across gender groups.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Model</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Accuracy</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Female Recall</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Male Recall</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {getModelName(metric.model_type)}
                  </td>
                  <td className="text-center py-3 px-4">{formatMetric(metric.accuracy, true)}</td>
                  <td className="text-center py-3 px-4">{formatMetric(metric.female_recall, true)}</td>
                  <td className="text-center py-3 px-4">{formatMetric(metric.male_recall, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-gray-600">
          <p><strong>Accuracy:</strong> Percentage of correct predictions overall</p>
          <p><strong>Recall:</strong> Percentage of actual graduates correctly identified</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Scale className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Fairness Metrics</h2>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-amber-900 mb-2">Why Fairness Matters</h3>
          <p className="text-sm text-amber-800">
            The baseline model showed significant gender bias, with female students being incorrectly
            predicted to drop out more often than males. We applied fairness mitigation techniques
            to reduce this bias while maintaining predictive accuracy.
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
              {metrics.map((metric) => {
                const spdAbs = Math.abs(metric.spd);
                const eodAbs = Math.abs(metric.eod);
                const fairnessScore = spdAbs < 0.15 && eodAbs < 0.10 ? 'Good' : spdAbs < 0.25 && eodAbs < 0.15 ? 'Fair' : 'Poor';
                const fairnessColor = fairnessScore === 'Good' ? 'text-green-700 bg-green-100' : fairnessScore === 'Fair' ? 'text-amber-700 bg-amber-100' : 'text-red-700 bg-red-100';

                return (
                  <tr key={metric.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {getModelName(metric.model_type)}
                    </td>
                    <td className="text-center py-3 px-4">{formatMetric(metric.spd)}</td>
                    <td className="text-center py-3 px-4">{formatMetric(metric.eod)}</td>
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
          <p><strong>SPD (Statistical Parity Difference):</strong> Measures if both genders receive positive predictions equally. Closer to 0 is better.</p>
          <p><strong>EOD (Equal Opportunity Difference):</strong> Measures if graduates are identified equally across genders. Closer to 0 is better.</p>
          <p><strong>Negative values:</strong> Indicate worse outcomes for female students</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">Per-Group Performance</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metrics.map((metric) => (
            <div key={metric.id} className="border-2 border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">{getModelName(metric.model_type)}</h3>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-2">Female Students</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-pink-50 p-2 rounded">
                      <div className="text-gray-600">Recall</div>
                      <div className="font-bold text-pink-700">{formatMetric(metric.female_recall, true)}</div>
                    </div>
                    <div className="bg-pink-50 p-2 rounded">
                      <div className="text-gray-600">Precision</div>
                      <div className="font-bold text-pink-700">{formatMetric(metric.female_precision, true)}</div>
                    </div>
                    <div className="bg-pink-50 p-2 rounded">
                      <div className="text-gray-600">F1</div>
                      <div className="font-bold text-pink-700">{formatMetric(metric.female_f1, true)}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-600 mb-2">Male Students</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="text-gray-600">Recall</div>
                      <div className="font-bold text-blue-700">{formatMetric(metric.male_recall, true)}</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="text-gray-600">Precision</div>
                      <div className="font-bold text-blue-700">{formatMetric(metric.male_precision, true)}</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="text-gray-600">F1</div>
                      <div className="font-bold text-blue-700">{formatMetric(metric.male_f1, true)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-xs text-gray-600">
          <p><strong>Recall:</strong> Of all graduates, how many did we identify correctly?</p>
          <p><strong>Precision:</strong> Of all predicted graduates, how many actually graduated?</p>
          <p><strong>F1:</strong> Harmonic mean of precision and recall</p>
        </div>
      </div>
    </div>
  );
}
