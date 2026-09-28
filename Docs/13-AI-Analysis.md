# 13 — AI Analysis

AI is an optional analysis layer, not the system of record.

## Training export

Export structured data containing:
- period
- workouts
- exercises
- sets
- PRs
- volume
- frequency
- goal status

## Nutrition export

- meals
- timestamps
- calories
- macros when provided
- hydration
- body weight when selected

## AI safety

AI output must be presented as analysis, not medical diagnosis.

The app should distinguish:
- observed facts
- calculated metrics
- projections
- AI interpretations

AI must not invent missing training/nutrition records.

FF-027 prepares the consolidated report data but does not send it to an AI
provider. Body weight is marked unavailable when no persisted source exists.
FF-028 owns the explicit export/inspection flow and any future transmission.

FF-028 exports JSON schema version `1` with the type
`forgeflow_ai_analysis`. Observed meal, hydration, goal and body-weight records
are kept apart from report-derived training, nutrition, hydration and goal
metrics. `projections` and `interpretations` remain explicitly empty and marked
`not_generated`; they can only be produced outside the ForgeFlow source-of-truth
layer. The full JSON is shown before the platform share/download action becomes
available.

## Privacy

Sending data to an external AI provider requires explicit user action.

The user should be able to inspect what is being sent.
