import { useState } from 'react';
import { StudentData, ModelType } from '../types';
import { HelpCircle } from 'lucide-react';

interface StudentInputFormProps {
  onSubmit: (data: StudentData, modelType: ModelType) => void;
  loading: boolean;
}

export function StudentInputForm({ onSubmit, loading }: StudentInputFormProps) {
  const [modelType, setModelType] = useState<ModelType>('reweighted');
  const [formData, setFormData] = useState<StudentData>({
    marital_status: 1,
    application_mode: 1,
    application_order: 1,
    course: 33,
    attendance: 1,
    previous_qualification: 1,
    nationality: 1,
    mothers_qualification: 1,
    fathers_qualification: 1,
    mothers_occupation: 1,
    fathers_occupation: 1,
    displaced: 0,
    educational_special_needs: 0,
    debtor: 0,
    tuition_fees_up_to_date: 1,
    gender: 0,
    scholarship_holder: 0,
    age_at_enrollment: 20,
    international: 0,
    curricular_units_1st_sem_credited: 0,
    curricular_units_1st_sem_enrolled: 6,
    curricular_units_1st_sem_evaluations: 6,
    curricular_units_1st_sem_approved: 5,
    curricular_units_1st_sem_grade: 13.5,
    curricular_units_1st_sem_without_evaluations: 0,
    curricular_units_2nd_sem_credited: 0,
    curricular_units_2nd_sem_enrolled: 6,
    curricular_units_2nd_sem_evaluations: 6,
    curricular_units_2nd_sem_approved: 5,
    curricular_units_2nd_sem_grade: 13.0,
    curricular_units_2nd_sem_without_evaluations: 0,
    unemployment_rate: 10.8,
    inflation_rate: 1.4,
    gdp: 1.74,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, modelType);
  };

  const updateField = (field: keyof StudentData, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">About This System</h3>
            <p className="text-sm text-blue-800">
              This system predicts student dropout risk using fairness-aware machine learning.
              Enter student information below to receive a prediction with transparency about model
              performance and fairness across gender groups.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Select Prediction Model
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { value: 'baseline', label: 'Baseline Model', desc: 'Original model with gender feature' },
            { value: 'drop_gender', label: 'Gender-Blind', desc: 'Model without gender information' },
            { value: 'reweighted', label: 'Reweighted (Recommended)', desc: 'Best fairness balance' },
            { value: 'calibrated', label: 'Calibrated', desc: 'Adjusted predictions' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setModelType(option.value as ModelType)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                modelType === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="font-medium text-gray-900">{option.label}</div>
              <div className="text-sm text-gray-600 mt-1">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gender
          </label>
          <select
            value={formData.gender}
            onChange={(e) => updateField('gender', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={0}>Male</option>
            <option value={1}>Female</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Age at Enrollment
          </label>
          <input
            type="number"
            value={formData.age_at_enrollment}
            onChange={(e) => updateField('age_at_enrollment', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min={17}
            max={70}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scholarship Holder
          </label>
          <select
            value={formData.scholarship_holder}
            onChange={(e) => updateField('scholarship_holder', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={0}>No</option>
            <option value={1}>Yes</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tuition Fees Up to Date
          </label>
          <select
            value={formData.tuition_fees_up_to_date}
            onChange={(e) => updateField('tuition_fees_up_to_date', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={0}>No</option>
            <option value={1}>Yes</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Debtor
          </label>
          <select
            value={formData.debtor}
            onChange={(e) => updateField('debtor', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={0}>No</option>
            <option value={1}>Yes</option>
          </select>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="font-semibold text-gray-900 mb-4">First Semester Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Units Enrolled
            </label>
            <input
              type="number"
              value={formData.curricular_units_1st_sem_enrolled}
              onChange={(e) => updateField('curricular_units_1st_sem_enrolled', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Units Approved
            </label>
            <input
              type="number"
              value={formData.curricular_units_1st_sem_approved}
              onChange={(e) => updateField('curricular_units_1st_sem_approved', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Average Grade (0-20)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.curricular_units_1st_sem_grade}
              onChange={(e) => updateField('curricular_units_1st_sem_grade', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min={0}
              max={20}
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="font-semibold text-gray-900 mb-4">Second Semester Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Units Enrolled
            </label>
            <input
              type="number"
              value={formData.curricular_units_2nd_sem_enrolled}
              onChange={(e) => updateField('curricular_units_2nd_sem_enrolled', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Units Approved
            </label>
            <input
              type="number"
              value={formData.curricular_units_2nd_sem_approved}
              onChange={(e) => updateField('curricular_units_2nd_sem_approved', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Average Grade (0-20)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.curricular_units_2nd_sem_grade}
              onChange={(e) => updateField('curricular_units_2nd_sem_grade', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min={0}
              max={20}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        {loading ? 'Predicting...' : 'Predict Graduation Outcome'}
      </button>
    </form>
  );
}
