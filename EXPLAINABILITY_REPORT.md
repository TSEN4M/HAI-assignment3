# Assignment 4: Model Explainability Report

## Executive Summary

This report documents the explainability enhancements added to the Student Dropout Prediction System from Assignment 3. The system now provides both **local explanations** (why a specific prediction was made for an individual student) and **global explanations** (how the model behaves overall across all students).

---

## 1. Explainability Approach Overview

### 1.1 Explanation Types Implemented

We implemented two complementary explanation approaches, directly aligned with course concepts:

#### **Local Explanations (Per-Prediction)**
- **Method**: Coefficient-based feature contributions for logistic regression (exact for LR)
- **Question Answered**: "Why did the model make THIS prediction for THIS student?"
- **Implementation**: Feature contribution analysis based on model coefficients and input feature values

#### **Global Explanations (Model-Level)**
- **Method**: Feature importance from logistic regression coefficients
- **Question Answered**: "What are the overall most important features the model uses?"
- **Implementation**: Absolute values of model coefficients ranked by influence

### 1.2 Why These Methods?

1. **Coefficient-based Local Explanations (for LR)**:
   - Logistic regression is inherently interpretable; the linear terms are the explanation.
   - For each prediction, we calculate: `contribution = feature_value * coefficient`.
   - Shows which specific features push the prediction toward graduation or dropout for that individual.
   - Exact for LR and consistent across our four variants (Baseline, Gender‑Blind, Reweighted, Calibrated — the last adds isotonic calibration on top).

2. **Coefficient Analysis for Global Explanations**:
   - Logistic regression weights directly represent feature importance
   - Larger absolute coefficients = stronger influence on predictions
   - Transparent and mathematically grounded (no black box)
   - Consistent across all student cases

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

#### New Function: `calculateFeatureContributions()`
```javascript
- Normalizes student input data
- Builds feature vector in model order
- Calculates linear contribution: feature_value * coefficient
- Returns contributions sorted by impact
```

#### Enhanced Prediction Endpoint
- Returns explanation object alongside prediction
- Includes: type (lime), base_value (intercept), features with contributions
- Shows impact direction (increases/decreases)

#### New Endpoint: `/functions/v1/global-explanations/:model_type`
- Returns feature importance rankings
- Calculates importance as absolute value of coefficients
- Includes description: "Feature coefficients from logistic regression..."

### 3.2 Frontend (React Components)

#### New Component: `LocalExplanationDisplay` (src/components/LocalExplanation.tsx)
- Shows protective factors and risk drivers sorted by absolute impact
- Fixed-length contribution tracks with proportional fill; value + bar on one line; impact text below
- Color + icon coding (Shield = support, Warning = risk) for accessibility
- Adds a concise narrative, advisor to‑do ideas, and “missing supports” inferred from global importance
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
  contribution: number;   // value * weight
  impact: 'increases' | 'decreases';
}

LocalExplanation {
  type: string;           // "lime"
  base_value: number;     // Model intercept
  output_value: number;   // Linear combination before sigmoid
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

### 4.1 LIME (Local Interpretable Model-agnostic Explanations)
- **Concept**: Approximate model behavior locally using simple, interpretable model
- **Our Implementation**: For logistic regression, the "simple model" IS the actual model, so explanations are exact
- **Formula**: `prediction ~= intercept + sum(feature_i * coefficient_i)`
- **Advantage**: Users see the exact linear contribution of each feature to the prediction

### 4.2 Model-Agnostic Approach
- **Concept**: Explanation method works with any model type (not just our logistic regression)
- **Our Implementation**: Feature contribution calculation is general and works for:
  - Baseline model (with Gender)
  - Drop-Gender model (without Gender)
  - Reweighted model (fairness-adjusted coefficients)
  - Calibrated model (with isotonic recalibration)

### 4.3 Transparency vs. Explainability vs. Interpretability
From lecture concepts:
- **Transparency**: What features does the model use? [x] Input form shows all 12
- **Interpretability**: Can humans understand the model? [x] Linear coefficients are directly interpretable
- **Explainability**: Why specific predictions? [x] Feature contribution analysis explains individual predictions

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

### 5.3 Actionability

For each prediction, advisors can now:
- See exactly which factors influenced the prediction
- Understand the magnitude of each factor's impact
- Compare against model-wide patterns (global explanations)
- Identify intervention points (e.g., "clear debtor status")
- Test "what-if" scenarios by changing inputs and re-running

---

## 6. Addressing Common User Questions

| User Question | Explanation Type | Where to Find |
|---|---|---|
| "Why did you predict this student will drop out?" | Local | Prediction result page |
| "What are the most important factors for graduation?" | Global | Model Explanations tab |
| "How well does the model actually work?" | Performance | Model Performance tab |
| "What inputs does the model use?" | Transparency | Student form + documentation |
| "What if I change this student's GPA?" | Local (re-run) | Re-run prediction with new input |
| "Does this model treat gender fairly?" | Global + Fairness | Model Performance & Fairness tab |
| "Which model should we use?" | Fairness + Explanation | All tabs combined |
| "How should I act on this?" | Actionability | Local (story + to‑do), Global (top supports/risks) |

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

## 8. Implementation Checklist

- [x] Local explanations showing feature contributions for each prediction
- [x] Global explanations showing feature importance across all students
- [x] Both explanation types provided as required
- [x] Addresses all 8 user explainability questions from course
- [x] Clear UI showing "Why this prediction" (local) and "How the model thinks" (global)
- [x] Integrated into prediction workflow
- [x] Works with all 4 model variants (baseline, gender-blind, reweighted, calibrated)
- [x] Transparent limitations and honest about what explanations show/don't show
- [x] Actionable guidance for academic advisors
- [x] Maintains fairness context from Assignment 3

---

## 9. Files Modified/Created

### Created:
- `src/components/LocalExplanation.tsx` - Local explanation display
- `src/components/GlobalExplanation.tsx` - Global explanation display
- `EXPLAINABILITY_REPORT.md` - This document

### Modified:
- `server/server.js` - Added explanation endpoints and feature contribution calculation
- `src/types/index.ts` - Added explanation data types and `MODEL_LABELS` for consistent model names
- `src/components/PredictionResult.tsx` - Integrated local explanations and cautionary copy
- `src/components/LocalExplanation.tsx` - Accessibility icons, fixed tracks, narrative + to‑do ideas, missing supports
- `src/components/GlobalExplanation.tsx` - Impact labels, top supports/risks, advisor guidance
- `src/components/ModelPerformance.tsx` - Quick takeaway, fairness badges; uses centralized labels
- `src/App.tsx` - Added Model Explanations tab and default selection to Reweighted model
- `src/main.tsx` - Removed debug logging

---

## 10. Testing & Validation

To test the explainability system:

1. **Local Explanations**: Make predictions and verify:
   - Protective factors and risk drivers are displayed, sorted by impact
   - Contributions match feature_value * coefficient
   - Color coding matches prediction direction (Graduate=green push, Dropout=red push)

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
