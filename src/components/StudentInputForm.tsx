import { useEffect, useMemo, useState } from 'react';
import { StudentData, ModelType } from '../types';
import { HelpCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_SUPABASE_URL;

interface StudentInputFormProps {
  onSubmit: (data: StudentData, modelType: ModelType) => void;
  loading: boolean;
}

export function StudentInputForm({ onSubmit, loading }: StudentInputFormProps) {
  const [modelType, setModelType] = useState<ModelType>('reweighted');

  // Essentials
  const [admissionGrade, setAdmissionGrade] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [scholarship, setScholarship] = useState<'Yes' | 'No'>('No');
  const [tuitionUpToDate, setTuitionUpToDate] = useState<'Yes' | 'No'>('Yes');
  const [debtor, setDebtor] = useState<'Yes' | 'No'>('No');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');

  // Advanced
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [displaced, setDisplaced] = useState<'Yes' | 'No'>('No');
  const [specialNeeds, setSpecialNeeds] = useState<'Yes' | 'No'>('No');
  const [international, setInternational] = useState<'Yes' | 'No'>('No');
  const [unemployment, setUnemployment] = useState<string>(''); // %
  const [inflation, setInflation] = useState<string>('');       // %
  const [gdp, setGdp] = useState<string>('');                   // (normalized) ~ -10..10

  const genderHidden = modelType === 'drop_gender';

  // ---- Bounds for fields (single source of truth) ----
  const BOUNDS = {
    admission: { min: 0, max: 200 },
    age: { min: 15, max: 70 },
    unemployment: { min: 0, max: 50 },
    inflation: { min: 0, max: 50 },
    gdp: { min: -10, max: 10 },
  };

  // Prefill from /defaults (training medians/modes)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/defaults`);
        const d = await r.json();
        setAdmissionGrade(String(d['Admission grade'] ?? ''));
        setAge(String(d['Age at enrollment'] ?? ''));
        setScholarship(d['Scholarship holder'] ? 'Yes' : 'No');
        setTuitionUpToDate(d['Tuition fees up to date'] ? 'Yes' : 'No');
        setDebtor(d['Debtor'] ? 'Yes' : 'No');
        setGender((d['Gender'] ?? 0) === 1 ? 'Female' : 'Male');

        setDisplaced(d['Displaced'] ? 'Yes' : 'No');
        setSpecialNeeds(d['Educational special needs'] ? 'Yes' : 'No');
        setInternational(d['International'] ? 'Yes' : 'No');
        setUnemployment(String(d['Unemployment rate'] ?? ''));
        setInflation(String(d['Inflation rate'] ?? ''));
        setGdp(String(d['GDP'] ?? ''));
      } catch (e) {
        console.warn('Failed to load defaults', e);
      }
    })();
  }, []);

  const defaultsNote = useMemo(
    () => 'Defaults come from training set medians/modes. You can edit them under Advanced.',
    []
  );

  // Helpers
  const numOrUndef = (s: string) => (s === '' ? undefined : Number(s));
  const inRange = (s: string, min: number, max: number, required = false) => {
    if (s === '') return !required; // empty allowed if not required
    const v = Number(s);
    return Number.isFinite(v) && v >= min && v <= max;
  };

  // Validation
  const essentialsValid =
    inRange(admissionGrade, BOUNDS.admission.min, BOUNDS.admission.max, true) &&
    inRange(age, BOUNDS.age.min, BOUNDS.age.max, true);

  const advancedValid =
    inRange(unemployment, BOUNDS.unemployment.min, BOUNDS.unemployment.max, false) &&
    inRange(inflation, BOUNDS.inflation.min, BOUNDS.inflation.max, false) &&
    inRange(gdp, BOUNDS.gdp.min, BOUNDS.gdp.max, false);

  const formValid = essentialsValid && advancedValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;

    const student_data: StudentData = {
      // Essentials
      Admission_grade: Number(admissionGrade),
      Age_at_enrollment: Number(age),
      Scholarship_holder: scholarship,      // "Yes"/"No" OK (backend coerces)
      Tuition_up_to_date: tuitionUpToDate,  // "Yes"/"No" OK
      Debtor: debtor,                       // "Yes"/"No" OK
      Gender: genderHidden ? undefined : (gender === 'Female' ? 1 : 0),

      // Advanced (send undefined when blank to allow backend defaults)
      Displaced: displaced,
      Educational_special_needs: specialNeeds,
      International: international,
      Unemployment_rate: numOrUndef(unemployment),
      Inflation_rate: numOrUndef(inflation),
      GDP: numOrUndef(gdp),
    };

    onSubmit(student_data, modelType);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
            <h3 className="font-semibold text-blue-900 mb-1">About This System</h3>
            <p className="text-sm text-blue-800">
              Predicts graduation vs dropout with fairness-aware logistic regression.
              Advanced fields are prefilled from training defaults.
            </p>
          </div>
        </div>
      </div>

      {/* Model selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Select Prediction Model
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { value: 'baseline', label: 'Baseline', desc: 'Uses Gender' },
            { value: 'drop_gender', label: 'Drop Gender', desc: 'Ignores Gender' },
            { value: 'reweighted', label: 'Reweighted (Recommended)', desc: 'Balances A×Y for fairness' },
            { value: 'calibrated', label: 'Calibrated', desc: 'Isotonic on no-gender LR' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setModelType(opt.value as ModelType)}
              className={`text-left p-3 rounded-lg border transition ${
                modelType === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">{opt.label}</div>
              <div className="text-sm text-gray-600 mt-1">{opt.desc}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Note: Gender is ignored by <span className="font-medium">Gender-Blind</span> and <span className="font-medium">Calibrated</span> models.
        </p>
      </div>

      {/* Essentials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldNumber
          label="Admission grade"
          value={admissionGrade}
          setValue={setAdmissionGrade}
          min={BOUNDS.admission.min}
          max={BOUNDS.admission.max}
          required
        />
        <FieldNumber
          label="Age at enrollment"
          value={age}
          setValue={setAge}
          min={BOUNDS.age.min}
          max={BOUNDS.age.max}
          required
        />
        <FieldYesNo label="Scholarship holder" value={scholarship} setValue={setScholarship} />
        <FieldYesNo label="Tuition fees up to date" value={tuitionUpToDate} setValue={setTuitionUpToDate} />
        <FieldYesNo label="Debtor" value={debtor} setValue={setDebtor} />
        {!genderHidden && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Gender</span>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={gender}
              onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
            >
              <option>Male</option>
              <option>Female</option>
            </select>
          </label>
        )}
      </div>

      {/* Advanced */}
      <div className="border rounded-lg p-4">
        <button type="button" className="underline text-sm" onClick={() => setShowAdvanced((s) => !s)}>
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </button>
        {showAdvanced ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <FieldYesNo label="Displaced" value={displaced} setValue={setDisplaced} />
            <FieldYesNo label="Educational special needs" value={specialNeeds} setValue={setSpecialNeeds} />
            <FieldYesNo label="International" value={international} setValue={setInternational} />
            <FieldNumber
              label="Unemployment rate (%)"
              value={unemployment}
              setValue={setUnemployment}
              min={BOUNDS.unemployment.min}
              max={BOUNDS.unemployment.max}
            />
            <FieldNumber
              label="Inflation rate (%)"
              value={inflation}
              setValue={setInflation}
              min={BOUNDS.inflation.min}
              max={BOUNDS.inflation.max}
            />
            <FieldNumber
              label="GDP (normalized)"
              value={gdp}
              setValue={setGdp}
              min={BOUNDS.gdp.min}
              max={BOUNDS.gdp.max}
            />
            <p className="col-span-full text-xs text-gray-500">{defaultsNote}</p>
          </div>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={loading || !formValid}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        {loading ? 'Predicting…' : 'Predict Graduation Outcome'}
      </button>

      {!formValid && (
        <p className="text-xs text-red-600">
          Please fix out-of-range values: Admission grade {BOUNDS.admission.min}–{BOUNDS.admission.max}, Age {BOUNDS.age.min}–{BOUNDS.age.max}
          {showAdvanced && ' (and check Advanced fields)'}.
        </p>
      )}
    </form>
  );
}

/* ---------- Small field components ---------- */

function FieldNumber({
  label, value, setValue, min, max, required = false,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  min: number;
  max: number;
  required?: boolean;
}) {
  const hasValue = value !== '';
  const numeric = Number(value);
  const valid = (!required && !hasValue) || (Number.isFinite(numeric) && numeric >= min && numeric <= max);

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        type="number"
        step="any"
        min={min}
        max={max}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          valid ? 'border-gray-300' : 'border-red-400'
        }`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {!valid && (
        <span className="text-xs text-red-600">Enter a value between {min} and {max}.</span>
      )}
    </label>
  );
}

function FieldYesNo({
  label, value, setValue,
}: { label: string; value: 'Yes' | 'No'; setValue: (v: 'Yes' | 'No') => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <select
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        value={value}
        onChange={(e) => setValue(e.target.value as 'Yes' | 'No')}
      >
        <option>No</option>
        <option>Yes</option>
      </select>
    </label>
  );
}
