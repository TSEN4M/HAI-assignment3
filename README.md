# Assignment 6: Model Explainability

## Executive Summary

This report documents the explainability enhancements added to the Student Dropout Prediction System from Assignment 3. The system now provides both **local explanations** (why a specific prediction was made for an individual student) and **global explanations** (how the model behaves overall across all students).

---

## 1. Explainability Approach Overview

### 1.1 Explanation Types Implemented

We implemented two complementary explanation approaches, directly aligned with course concepts:

#### **Local Explanations (Per-Prediction)**

- **Method**: SHAP (linear/LR formulation) with training-set means as background
- **Question Answered**: "Why did the model make THIS prediction for THIS student?"
- **Implementation**: Feature contribution analysis based on model coefficients and input feature values

#### **Global Explanations (Model-Level)**

- **Method**: Feature importance from logistic regression coefficients
- **Question Answered**: "What are the overall most important features the model uses?"
- **Implementation**: Absolute values of model coefficients ranked by influence

### 1.2 Why These Methods?

1. **SHAP (Linear) for Local Explanations**:

   - SHAP provides additive, baseline-referenced attributions and satisfies desired axioms (local accuracy, consistency).
   - For logistic regression, Linear SHAP is exact and simplifies to: `φ_j = coefficient_j × (value_j − feature_mean_j)`.
   - We use the training feature means (with_gender / no_gender) as background, so explanations are centered on the “typical” student.
   - Works consistently across all four variants (Baseline, Gender-Blind, Reweighted, Calibrated — the last applies isotonic calibration after the LR, but SHAP operates on the LR log-odds).

2. **Coefficient Analysis for Global Explanations**:
   - Logistic regression weights directly represent feature importance
   - Larger absolute coefficients = stronger influence on predictions
   - Transparent and mathematically grounded (no black box)
   - Consistent across all student cases

### 1.3 Method Selection Rationale (Why not X?)

- **Why SHAP Linear instead of plain coefficients?**

  - SHAP supplies a clear baseline (expected log-odds using training means) and additive attributions that sum exactly to the prediction.
  - The training-mean background lets advisors interpret contributions as “relative to a typical student,” and the log-odds values convert cleanly to probability deltas.
  - It also keeps the door open for future non-linear models: the UI already accepts SHAP-style payloads, so upgrading the model won’t require a UX rewrite.

- **Why not classic LIME?**

  - LIME perturbs inputs and fits a surrogate. For LR, the surrogate equals the true model, so LIME adds sampling noise and tuning knobs (kernel width, sample size) without extra value.
  - SHAP linear is deterministic, faster, and adheres to desirable axioms, making it more robust for advisors.

- **Why not UMAP for explanations?**

  - UMAP is dimensionality reduction, helpful for exploration (“who looks similar?”) but not a per-prediction rationale.
  - It is stochastic and distance-distorting; can be misread as causal. We prefer showing clear global patterns (feature importance) and per-case reasons (local contributions).

- **Why not PDP/ICE in the main flow?**
  - Partial‑dependence/ICE plots are insightful but slow for interactive, per‑student use and harder to read for non‑technical staff.
  - Our design goal is immediate, action‑oriented explanations; PDP/ICE can be added later as an advanced appendix if needed.

---

## 2. Mapping to Course Explainability Questions

From the lecture materials, the following explanation questions are answered:

### **INPUT: "What are the inputs to the model?"**

- **How Addressed**: The prediction form shows all 12 input features used by the model
- **UI Component**: StudentInputForm displays every feature with validation and defaults
- **Transparency**: Users understand exactly what information the model considers

### **OUTPUT: "What is the output of the model?"**

- **How Addressed**: Clear prediction (Graduate/Dropout) with confidence percentage
- **UI Component**: PredictionResult displays prediction and 0-100% confidence scale
- **Transparency**: Users see the predicted class and model certainty

### **PERFORMANCE: "How well does the model perform?"**

- **How Addressed**: Dedicated Model Performance & Fairness tab shows metrics
- **Metrics Displayed**: Accuracy, Precision, Recall, F1, SPD (Statistical Parity Difference), EOD (Equal Opportunity Difference)
- **Per-Group Breakdown**: Performance separately for male and female students
- **Transparency**: Academic advisors understand model limitations and fairness

### **WORKING: "How does the model work?"**

- **How Addressed**: Model Explanations tab shows global feature importance
- **Visualization**: Ranked list of all features with their coefficients
- **Explanation**: "Feature coefficients from logistic regression. Larger absolute values indicate stronger influence."
- **Transparency**: Users understand the model uses linear relationships between features and outcomes

### **WHY: "Why did the model make THIS prediction?"** [x] PRIMARY FOCUS

- **How Addressed**: Local Explanation section in prediction results
- **Feature Contributions**: Protective factors and risk drivers, sorted by impact (not a fixed top‑5)
- **Direction Indicators**: Icons + labels (Shield = supports graduation; Warning = raises dropout risk) with color‑blind‑friendly styling
- **Interpretation**: Impact text describes how much each factor pushes/pulls this prediction
- **Transparency**: “Story in one sentence,” advisor to‑do ideas, and “missing supports” aid actionability

### **WHY NOT: "Why did the model NOT predict the other class?"**

- **How Addressed**: Inverse interpretation of feature contributions
- **Example**: If a student has a red (negative) contribution from "Debtor status", that's WHY they weren't predicted as Graduate
- **UI Hint**: The interpretation box explains what would need to change for a different prediction
- **Transparency**: Actionable insight for intervention (e.g., "clearing debtor status might improve outcome")

### **WHAT IF: "What if I change an input?"**

- **How Addressed**: Interactive form allows changing any feature and re-running prediction
- **Re-explanation**: Each new prediction regenerates explanations with new feature contributions
- **Supported**: Users can explore counterfactuals by changing inputs and seeing how explanations change
- **Transparency**: Advisors can understand which factors are most levers for intervention

### **HOW TO BE THAT: "How can a student move to the positive class?"**

- **How Addressed**: Advice section in prediction results
- **Guidance**: "Consider proactive advising, financial-aid check-ins, or counseling referrals"
- **Context**: Linked to the specific risk factors shown in the explanation
- **Example**: If "Debtor status" is pushing toward dropout, clearing that debt is actionable
- **Transparency**: Advisors see concrete intervention points

### **HOW TO REMAIN HERE: "How can positive outcomes be maintained?"**

- **How Addressed**: Advice section for positive predictions
- **Guidance**: "Use this insight to keep reinforcing supports"
- **Context**: Graduate predictions show which strengths to maintain
- **Transparency**: Proactive intervention to sustain success

---

## 3. Technical Implementation Details

### 3.1 Backend (server/server.js)

#### New Function: `calculateShapContributions()`

```javascript
- Normalizes student input data
- Builds feature vector in model order
- Looks up SHAP background means (with_gender / no_gender)
- Calculates SHAP value: coefficient × (value − mean)
- Returns SHAP contributions plus base/output log-odds
```

#### Enhanced Prediction Endpoint

- Returns explanation object alongside prediction
- Includes: type "shap_linear", domain "logit", base/output values, features with SHAP contributions
- Shows impact direction (increases/decreases)

#### New Endpoint: `/functions/v1/global-explanations/:model_type`

- Returns feature importance rankings
- Calculates importance as absolute value of coefficients
- Includes description: "Feature coefficients from logistic regression..."

### 3.2 Frontend (React Components)

#### New Component: `LocalExplanationDisplay` (src/components/LocalExplanation.tsx)

- Shows protective factors and risk drivers sorted by absolute impact (top two visible by default with “Show all” toggles)
- Fixed-length contribution tracks with proportional fill; value + bar on one line; impact text below
- Color + icon coding (Shield = support, Warning = risk) for accessibility
- Adds a concise narrative, advisor to‑do ideas, and “missing supports” derived from SHAP (falls back to global weights only when SHAP penalty is zero)
- Formatted output: readable feature names and impact values

#### New Component: `GlobalExplanationDisplay` (src/components/GlobalExplanation.tsx)

- Fetches (and caches) global explanations by model; ranks features by importance
- Bar visualization with direction icons and qualitative impact labels (Very strong/Strong/Moderate/Lower)
- Quick-glance cards: Top supports (helps graduation) and Top risks (pushes toward dropout)
- Advisor guidance box explains how to use patterns and reminds about dataset limits

#### Updated Component: `PredictionResultDisplay` (src/components/PredictionResult.tsx)

- Integrates LocalExplanationDisplay
- Shows local explanations within prediction result
- Added guidance linking local to global explanations
- “Use With Care” reminder moved to the left column (form) so advisors review caveats before submitting

#### Updated App: Model Explanations Tab

- New "Model Explanations" tab in main navigation
- Model selector (Baseline, Gender-Blind, Reweighted, Calibrated)
- Defaults to Reweighted so explanations load immediately; users can switch models
- Displays global feature importance for the selected model

### 3.3 Data Types (src/types/index.ts)

```typescript
FeatureContribution {
  name: string;           // Feature name
  value: number;          // Student's value for this feature
  weight: number;         // Model coefficient
  contribution: number;   // SHAP value (log-odds contribution)
  impact: 'increases' | 'decreases';
}

LocalExplanation {
  type: string;           // "shap_linear"
  domain: 'logit';        // indicates log-odds space
  base_value: number;     // Expected log-odds using training means
  output_value: number;   // Student log-odds before sigmoid
  features: FeatureContribution[];
}

GlobalExplanation {
  model_type: ModelType;
  explanation_type: string;
  description: string;
  features: Array<{feature, weight, importance}>;
}
```

---

## 4. Alignment with Course Concepts

### 4.1 SHAP (SHapley Additive exPlanations)

- **Concept**: Attribute prediction differences relative to a baseline using Shapley values; provides additive, locally accurate explanations.
- **Our Implementation**: Linear SHAP for logistic regression with training-mean baseline: `φ_j = coef_j × (value_j − mean_j)`.
- **Formula**: `logit(student) = base_value + Σ φ_j`; we also show approximate probability shifts.
- **Advantage**: Baseline-centered, additive, model-agnostic in spirit (future-proof for non-linear models) while remaining exact for LR.

### 4.2 Model-Agnostic Approach

- **Concept**: Explanation method works with any model type (not just our logistic regression)
- **Our Implementation**: SHAP calculation is general and works for:
  - Baseline model (with Gender)
  - Drop-Gender model (without Gender)
  - Reweighted model (fairness-adjusted coefficients)
  - Calibrated model (with isotonic recalibration)

### 4.3 Transparency vs. Explainability vs. Interpretability

From lecture concepts:

- **Transparency**: What features does the model use? [x] Input form shows all 12
- **Interpretability**: Can humans understand the model? [x] Linear coefficients are directly interpretable
- **Explainability**: Why specific predictions? [x] SHAP contributions explain individual predictions relative to a baseline

### 4.4 Global vs. Local Explanations

- **Global**: "What is the model's overall strategy?" -> Feature importance tab
- **Local**: "Why THIS prediction for THIS student?" -> Explanation in result section
- **Both Needed**: Global patterns help advisors understand the model; local explanations support individual case understanding

---

## 5. User Experience & Trust

### 5.1 Information Architecture

The system now guides users through understanding predictions:

1. **Make Prediction** -> See result + local explanation (focused view)
2. **Model Explanations** -> Understand how each model variant thinks (global pattern understanding)
3. **Model Performance & Fairness** -> Understand model limitations and equity (contextual trust)

### 5.2 Visual Design for Clarity

- **Color + Icons**: Green Shield = supports graduation; Red Warning = raises dropout risk
- **Fixed Tracks**: Contribution tracks are fixed length; fill shows strength for consistent comparison
- **Readable Numbers**: Appropriate precision and units (e.g., %)
- **Narrative & Guidance**: “Story in one sentence” + advisor to‑do ideas support action
- **Progressive Disclosure**: Protective/risk sections show the top two factors by default with “Show all” toggles to reduce scroll fatigue

### 5.3 Actionability

For each prediction, advisors can now:

- See exactly which factors influenced the prediction (with the most impactful surfaced first)
- Understand the magnitude of each factor's impact
- Compare against model-wide patterns (global explanations)
- Identify intervention points (e.g., "clear debtor status")
- Review “Use With Care” guidance directly under the form before submitting
- Test "what-if" scenarios by changing inputs and re-running

---

## 6. Addressing Common User Questions

| User Question                                         | Explanation Type       | Where to Find                                      |
| ----------------------------------------------------- | ---------------------- | -------------------------------------------------- |
| "Why did you predict this student will drop out?"     | Local                  | Prediction result page                             |
| "What are the most important factors for graduation?" | Global                 | Model Explanations tab                             |
| "How well does the model actually work?"              | Performance            | Model Performance tab                              |
| "What inputs does the model use?"                     | Transparency           | Student form + documentation                       |
| "What if I change this student's GPA?"                | Local (re-run)         | Re-run prediction with new input                   |
| "Does this model treat gender fairly?"                | Global + Fairness      | Model Performance & Fairness tab                   |
| "Which model should we use?"                          | Fairness + Explanation | All tabs combined                                  |
| "How should I act on this?"                           | Actionability          | Local (story + to‑do), Global (top supports/risks) |

---

## 7. Limitations & Honest Transparency

### 7.1 What These Explanations Are

- **Accurate** for logistic regression (linear model explanations are exact, not approximations)
- **Local** (show individual prediction factors, not universal rules)
- **Feature-based** (show what features mattered, not why those features are important in reality)

### 7.2 What These Explanations Are Not

- **Causal** (correlation with dropout != causes dropout)
- **Predictive of intervention success** (knowing why a prediction was made != knowing what intervention works)
- **Complete** (showing top 5 features, not all features)

### 7.3 User Guidance in UI

- Prediction result includes: "Use this alongside advisor judgment and current context"
- Fairness section explains: "Model performance varies across demographic groups"
- Footer notes: "Does not account for external factors like personal circumstances"

---

## 8. Testing & Validation

To test the explainability system:

1. **Local Explanations**: Make predictions and verify:

   - Protective factors and risk drivers are displayed, sorted by impact
   - SHAP contributions match `coefficient × (value − background_mean)`
   - Color/icon coding matches prediction direction (Graduate=green support, Dropout=red risk)

2. **Global Explanations**: Check Model Explanations tab:

   - Features ranked by importance
   - Weights match model coefficients
   - Different models show different patterns (with top supports/risks and qualitative impact labels)

3. **Consistency**: Verify:

   - Same model produces same explanations
   - Changing inputs changes local explanations predictably
   - Local features align with global importance

4. **Fairness Context**: Ensure:
   - Explanations work for all 4 model variants
   - Reweighted model shows fairness-adjusted patterns
   - Users understand gender fairness implications

---

## Conclusion

The enhanced system provides transparent, interpretable predictions through both local and global explanations. This enables academic advisors to:

1. **Understand** individual predictions (local explanations)
2. **Trust** model behavior (global explanations + performance metrics)
3. **Act** on insights (clear intervention points)
4. **Verify** fairness (explicit gender comparisons)

The implementation directly addresses all eight explainability question types from the course, providing a comprehensive answer to "Why should we trust this prediction?"
