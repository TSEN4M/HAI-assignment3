// server/server.js
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Load auxiliary JSON ----------
const readJson = (rel) =>
  JSON.parse(fs.readFileSync(new URL(rel, import.meta.url), "utf-8"));

// metrics shown in Performance tab
const metrics = readJson("./metrics.json");

// defaults (training medians/modes) you computed earlier
// keys like "Admission grade", "Age at enrollment", etc.
// NEW — unwrap when the file is shaped as { defaults: {...}, ... }
const defaultsRaw = readJson("./defaults.json");
const defaults = defaultsRaw?.defaults ?? defaultsRaw;


// ---------- Load models (as you exported them) ----------
const modelBaseline = readJson("./model_baseline.json");
const modelDropGender = readJson("./model_drop_gender.json");
const modelReweighted = readJson("./model_reweighted.json");
const modelCalibrated = readJson("./model_calibrated.json"); // has { base: {...}, isotonic: {x,y} }

// Utility: logistic helpers
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const dot = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

// Utility: linear interpolation for isotonic mapping
function isotonicMap(xArr, yArr, pRaw) {
  // clamp
  if (pRaw <= xArr[0]) return yArr[0];
  if (pRaw >= xArr[xArr.length - 1]) return yArr[yArr.length - 1];

  // binary search for segment
  let lo = 0, hi = xArr.length - 1;
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (xArr[mid] === pRaw) return yArr[mid];
    if (xArr[mid] < pRaw) lo = mid; else hi = mid;
  }
  const x0 = xArr[lo], x1 = xArr[hi];
  const y0 = yArr[lo], y1 = yArr[hi];
  const t = (pRaw - x0) / (x1 - x0);
  return y0 + t * (y1 - y0);
}

// ---------- Input coercion ----------
const yesNoTo01 = (v) => {
  if (v === "Yes" || v === 1 || v === "1" || v === true) return 1;
  if (v === "No" || v === 0 || v === "0" || v === false) return 0;
  // fallback: if undefined, return undefined to allow backend defaults
  return undefined;
};

const numOrDefault = (v, def) => {
  if (v === undefined || v === null || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

// Map frontend keys -> canonical feature names used in your model JSONs
function normalizeStudent(student) {
  // accept either underscores or spaces; keep both
  const src = student || {};

  // Coerce booleans/YesNo/number to 0/1 where needed
  const S = {
    "Admission grade": numOrDefault(
      src.Admission_grade ?? src["Admission grade"],
      defaults["Admission grade"]
    ),
    "Age at enrollment": numOrDefault(
      src.Age_at_enrollment ?? src["Age at enrollment"],
      defaults["Age at enrollment"]
    ),
    "Scholarship holder":
      yesNoTo01(src.Scholarship_holder ?? src["Scholarship holder"]) ??
      defaults["Scholarship holder"],
    "Tuition fees up to date":
      yesNoTo01(src.Tuition_up_to_date ?? src["Tuition fees up to date"]) ??
      defaults["Tuition fees up to date"],
    "Displaced":
      yesNoTo01(src.Displaced ?? src["Displaced"]) ?? defaults["Displaced"],
    "Educational special needs":
      yesNoTo01(
        src.Educational_special_needs ?? src["Educational special needs"]
      ) ?? defaults["Educational special needs"],
    "Debtor": yesNoTo01(src.Debtor ?? src["Debtor"]) ?? defaults["Debtor"],
    "International":
      yesNoTo01(src.International ?? src["International"]) ??
      defaults["International"],
    "Unemployment rate": numOrDefault(
      src.Unemployment_rate ?? src["Unemployment rate"],
      defaults["Unemployment rate"]
    ),
    "Inflation rate": numOrDefault(
      src.Inflation_rate ?? src["Inflation rate"],
      defaults["Inflation rate"]
    ),
    GDP: numOrDefault(src.GDP ?? src["GDP"], defaults["GDP"]),
    // Gender may be omitted by UI for drop_gender; default if still missing
    Gender:
      (src.Gender === 0 || src.Gender === 1
        ? src.Gender
        : yesNoTo01(src.Gender)) ?? defaults["Gender"],
  };

  return S;
}

// Build feature vector in the exact order defined in the model JSON
function buildX(featureNames, S) {
  return featureNames.map((fname) => {
    if (!(fname in S)) {
      throw new Error(`Missing feature "${fname}" after normalization`);
    }
    return Number(S[fname]);
  });
}

// Single LR predict (probability of class 1)
function predictLR({ coef, intercept }, x) {
  const z = dot(coef, x) + intercept;
  return sigmoid(z);
}

// Top-level predict by model_type
function predictByModel(modelType, studentRaw) {
  const S = normalizeStudent(studentRaw);

  if (modelType === "baseline") {
    const features = modelBaseline.schema.features;
    const x = buildX(features, S);
    const { coef, intercept } = modelBaseline.logreg;
    if (coef.length !== x.length) {
      throw new Error(
        `Model weights/feature length mismatch for baseline (coef=${coef.length}, features=${x.length})`
      );
    }
    return predictLR({ coef, intercept }, x);
  }

  if (modelType === "drop_gender") {
    const features = modelDropGender.schema.features; // excludes Gender
    const x = buildX(features, S);
    const { coef, intercept } = modelDropGender.logreg;
    if (coef.length !== x.length) {
      throw new Error(
        `Model weights/feature length mismatch for drop_gender (coef=${coef.length}, features=${x.length})`
      );
    }
    return predictLR({ coef, intercept }, x);
  }

  if (modelType === "reweighted") {
    const features = modelReweighted.schema.features; // includes Gender
    const x = buildX(features, S);
    const { coef, intercept } = modelReweighted.logreg;
    if (coef.length !== x.length) {
      throw new Error(
        `Model weights/feature length mismatch for reweighted (coef=${coef.length}, features=${x.length})`
      );
    }
    return predictLR({ coef, intercept }, x);
  }

  if (modelType === "calibrated") {
    // Calibrated = LR(no-gender) -> isotonic(x,y)
    const base = modelCalibrated.base; // {features, coef, intercept}
    const x = buildX(base.features, S);
    if (base.coef.length !== x.length) {
      throw new Error(
        `Model weights/feature length mismatch for calibrated base (coef=${base.coef.length}, features=${x.length})`
      );
    }
    const pRaw = predictLR({ coef: base.coef, intercept: base.intercept }, x);
    const pCal = isotonicMap(modelCalibrated.isotonic.x, modelCalibrated.isotonic.y, pRaw);
    return pCal;
  }

  throw new Error(`Unknown model_type "${modelType}"`);
}

// ---------- ROUTES ----------

// Metrics for Performance tab
app.get("/metrics", (_req, res) => res.json(metrics));

// Supabase-compat for Performance tab (front-end calls /rest/v1/model_metrics?select=*)
app.get("/rest/v1/model_metrics", (_req, res) => res.json(metrics));

// Expose defaults so UI can prefill
app.get("/defaults", (_req, res) => res.json(defaults));

// Get model weights and schema
function getModelParams(modelType) {
  if (modelType === "baseline") {
    return {
      features: modelBaseline.schema.features,
      coef: modelBaseline.logreg.coef,
      intercept: modelBaseline.logreg.intercept,
    };
  }
  if (modelType === "drop_gender") {
    return {
      features: modelDropGender.schema.features,
      coef: modelDropGender.logreg.coef,
      intercept: modelDropGender.logreg.intercept,
    };
  }
  if (modelType === "reweighted") {
    return {
      features: modelReweighted.schema.features,
      coef: modelReweighted.logreg.coef,
      intercept: modelReweighted.logreg.intercept,
    };
  }
  if (modelType === "calibrated") {
    return {
      features: modelCalibrated.base.features,
      coef: modelCalibrated.base.coef,
      intercept: modelCalibrated.base.intercept,
      isCalibrated: true,
      isotonic: modelCalibrated.isotonic,
    };
  }
}

// Calculate linear terms (feature contributions) for LIME-like local explanations
function calculateFeatureContributions(modelType, studentRaw) {
  const S = normalizeStudent(studentRaw);
  const params = getModelParams(modelType);

  if (!params) throw new Error(`Unknown model_type "${modelType}"`);

  const x = buildX(params.features, S);
  const z = dot(params.coef, x) + params.intercept;

  const contributions = params.features.map((fname, i) => ({
    feature: fname,
    value: x[i],
    weight: params.coef[i],
    contribution: x[i] * params.coef[i],
  }));

  return { contributions, z, intercept: params.intercept };
}

// Main prediction endpoint with explanations
app.post("/functions/v1/predict-dropout", (req, res) => {
  try {
    const { model_type = "reweighted", student_data = {} } = req.body || {};
    const probGraduate = predictByModel(model_type, student_data);

    const prediction = probGraduate >= 0.5 ? "Graduate" : "Dropout";

    const confidence =
      prediction === "Graduate" ? probGraduate : (1 - probGraduate);

    const conf = Math.min(1, Math.max(0, Number(confidence)));

    // Calculate local explanations
    const { contributions, z, intercept } = calculateFeatureContributions(model_type, student_data);

    // Sort by absolute contribution to show most impactful features
    const topContributions = contributions
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 5);

    res.json({
      prediction,
      confidence: conf,
      model_type,
      explanation: {
        type: "lime",
        base_value: intercept,
        output_value: z,
        features: topContributions.map(c => ({
          name: c.feature,
          value: c.value,
          weight: c.weight,
          contribution: c.contribution,
          impact: c.contribution > 0 ? "increases" : "decreases",
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .json({ error: err?.message || "Prediction failed on server." });
  }
});

// Global explanations endpoint - feature importance from model coefficients
app.get("/functions/v1/global-explanations/:model_type", (req, res) => {
  try {
    const { model_type } = req.params;
    const params = getModelParams(model_type);

    if (!params) {
      return res.status(400).json({ error: `Unknown model_type "${model_type}"` });
    }

    const featureImportance = params.features.map((fname, i) => ({
      feature: fname,
      weight: params.coef[i],
      importance: Math.abs(params.coef[i]),
    }))
    .sort((a, b) => b.importance - a.importance);

    res.json({
      model_type,
      explanation_type: "global_feature_importance",
      description: "Feature coefficients from logistic regression. Larger absolute values indicate stronger influence.",
      features: featureImportance,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err?.message || "Failed to get explanations." });
  }
});

// use PORT env in cloud, default 3001 locally
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
