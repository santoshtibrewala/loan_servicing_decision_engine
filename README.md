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

## Create a git repository

If you are starting from a plain folder:

```bash
git init
git add .
git commit -m "Initial commit"
```

If you want to connect it to GitHub:

```bash
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## Suggested first commit flow

```bash
npm install
npm test
npm run build
git add .
git commit -m "Set up A-STAR loan servicing decision engine"
```
