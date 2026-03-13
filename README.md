# A-STAR

Allocore Servicing Term Analysis and Recommendation.

This is a lightweight loan servicing and restructuring application with:

- a Node backend in [backend](/Users/santosh.tibrewala/Work/loan_servicing_decision_engine/backend)
- a Vue frontend in [frontend](/Users/santosh.tibrewala/Work/loan_servicing_decision_engine/frontend)
- seeded case presets for restructure, writedown, and multi-loan scenarios

## Prerequisites

- Node.js 20+
- npm 10+

## Install

```bash
npm install
```

## Run locally

Start the backend:

```bash
npm run dev:backend
```

Start the frontend in a second terminal:

```bash
npm run dev:frontend
```

Default local URLs:

- frontend: `http://localhost:5173`
- backend: `http://localhost:3001`

## Build

Standard build command:

```bash
npm run build
```

This builds the frontend production bundle into `dist/`.

## Tailwind CSS

Tailwind CSS is installed and wired into Vite.

Key files:

- [vite.config.js](/Users/santosh.tibrewala/Work/loan_servicing_decision_engine/vite.config.js): includes the Tailwind Vite plugin
- [frontend/src/main.js](/Users/santosh.tibrewala/Work/loan_servicing_decision_engine/frontend/src/main.js): imports the global stylesheet
- [frontend/src/styles.css](/Users/santosh.tibrewala/Work/loan_servicing_decision_engine/frontend/src/styles.css): loads Tailwind and defines a small theme

You can now use Tailwind classes directly in Vue templates while keeping the existing scoped CSS during migration.

## Test

```bash
npm test
```

## Project structure

- [backend/config.js](/Users/santosh.tibrewala/Work/loan_servicing_decision_engine/backend/config.js): app config, policy tables, presets, scoring weights
- [backend/engine.js](/Users/santosh.tibrewala/Work/loan_servicing_decision_engine/backend/engine.js): orchestration
- [backend/phase1-feasibility.js](/Users/santosh.tibrewala/Work/loan_servicing_decision_engine/backend/phase1-feasibility.js): repayment feasibility
- [backend/phase2-government-protection.js](/Users/santosh.tibrewala/Work/loan_servicing_decision_engine/backend/phase2-government-protection.js): recovery and protection logic
- [backend/phase3-optimizer.js](/Users/santosh.tibrewala/Work/loan_servicing_decision_engine/backend/phase3-optimizer.js): ranking and recommendations
- [frontend/src/App.vue](/Users/santosh.tibrewala/Work/loan_servicing_decision_engine/frontend/src/App.vue): main UI
- [FUNCTIONAL_OVERVIEW.md](/Users/santosh.tibrewala/Work/loan_servicing_decision_engine/FUNCTIONAL_OVERVIEW.md): business explanation
- [TECHNICAL_OVERVIEW.md](/Users/santosh.tibrewala/Work/loan_servicing_decision_engine/TECHNICAL_OVERVIEW.md): formulas and engine behavior
