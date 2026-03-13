# A-STAR Technical Overview

## Purpose

A-STAR is a deterministic restructuring engine with a Vue frontend and a lightweight Node backend.

The core design is:

```text
Inputs
-> Policy Resolution
-> Scenario Generation
-> Feasibility Calculation
-> Government Protection Calculation
-> Scoring and Ranking
-> Recommendation
```

## Main files

- `backend/config.js`
  Static configuration, sample data, scoring weights, scenario controls, and reference tables
- `backend/engine.js`
  Orchestrates the three engine phases
- `backend/phase1-feasibility.js`
  Loan payment recomputation and affordability logic
- `backend/phase2-government-protection.js`
  Net recovery and present value style calculations
- `backend/phase3-optimizer.js`
  Scenario validation, scoring, ranking, and explanation
- `backend/server.js`
  API surface
- `frontend/src/App.vue`
  Single-screen underwriting-style UI

## Engine phases

### Phase 1: Feasibility

Inputs:

- case
- cash flow
- existing loans

Outputs:

- recomputed payment schedule by loan
- total annual recommended repayment
- usable cash after reserve
- cash flow margin
- per-loan servicing actions

### Phase 2: Government protection

Inputs:

- collateral
- liens
- county and state recovery assumptions
- discount rate

Outputs:

- net recovery value
- projected value of recommended repayment stream
- coverage ratio
- H/M/L priority map
- writedown ordering when needed

### Phase 3: Optimizer

Inputs:

- feasibility result
- government protection result
- scoring weights
- scenario controls

Outputs:

- valid versus rejected scenarios
- scenario score
- ranking
- recommended scenario
- explanation text

## Scenario generation

Scenario generation is brute-force and deterministic.

The current config searches combinations across:

- debt margin target
- term extension years
- rate reduction percent
- deferral years
- support amount
- consolidation flag
- writedown amount
- liquidation flag

The engine starts with the lender-entered debt margin percentage and steps down to `0%`.

Example from current config:

```text
10%, 9%, 8%, 7%, 6%, 5%, 4%, 3%, 2%, 1%, 0%
```

## Key calculations

### 1. Operating income / adjusted balance

The UI displays operating income as:

```text
balanceAvailable - nonAgencyDebtAndTaxes
```

Current sample:

```text
$68,000 - $22,000 = $46,000
```

### 2. Debt margin reserve

For each scenario:

```text
reservedCash = adjustedBalance x marginTarget
usableCash = adjustedBalance - reservedCash + supportAmount
```

If the lender sets `10%` and adjusted balance is `$46,000`:

```text
reservedCash = $46,000 x 10% = $4,600
usableCash = $46,000 - $4,600 = $41,400
```

### 3. Loan payment recalculation

For each eligible loan:

```text
basePrincipal = principal + accruedInterest
principalAfterWritedown = max(basePrincipal - writedown, 0)
targetRate = min(existingRate, regularRate) - rateReduction - consolidationAdjustment
newTerm = remainingTerm + termExtension + consolidationTermBoost
recommendedPayment = annuity(principalAfterWritedown, targetRate, newTerm)
```

If a loan is marked with `servicingAction = N`, A-STAR keeps current terms and labels the action as `Maintain Current Terms`.

### 4. Cash flow margin

```text
cashFlowMargin = (usableCash - totalRecommendedRepayment) / totalRecommendedRepayment
```

Current sample recommendation:

```text
usableCash = $46,000
recommendedRepayment = $41,219.71
cashFlowMargin = ($46,000 - $41,219.71) / $41,219.71
cashFlowMargin = 11.6% (shown as 12% after rounding)
```

### 5. Present value style calculation

Phase 2 approximates the value of the recommended payment stream:

```text
PV = firstYearPayment / (1 + discountRate)
   + remainingPaymentStreamPV
```

The remaining stream uses an annuity factor based on the recommended term and discount rate.

### 6. Net recovery value

For each collateral item:

```text
grossRecovery =
  recoverableValue
  or (marketValue x baseRecoveryRate x valueChangeFactor)

netRecovery =
  grossRecovery
  - liquidationCosts
  - priorLiens
  + managedIncomeOffset
```

Current sample:

- `RE-1` net recovery: `$283,578`
- `CH-1` net recovery: `$46,150`
- total net recovery value: `$329,728`

### 7. Coverage ratio

```text
coverageRatio = projectedValue / netRecoveryValue
```

Current sample:

```text
$384,514.72 / $329,728 = 1.17
```

## Worked sample recommendation

Current sample recommendation:

- scenario margin target selected by optimizer: `7%`
- term extension: `8 years`
- configured rate reduction: `1.00%`
- actual FO-101 rate change shown to the user: `1.30%`

Why the displayed rate change is `1.30%`:

`FO-101` starts at `5.25%`, but the engine first caps it to the lower regular/reference rate before applying the configured reduction.

```text
starting rate = 5.25%
reference regular rate = 4.95%
configured reduction = 1.00%
target rate = 3.95%
actual change = 5.25% - 3.95% = 1.30%
```

Recommended loan outcomes:

- `FO-101`
  Current: `18 years`, `5.25%`, `$26,940`
  Recommended: `26 years`, `3.95%`, `$19,371.26`
  Actions: `Extend 8 Years`, `Rate -1.3%`
- `OL-210`
  Current: `6 years`, `6.10%`, `$20,370`
  Recommended: `6 years`, `4.80%`, `$19,654.22`
  Actions: `Rate -1.3%`

Portfolio-level result:

```text
current annual repayment = $47,310
adjusted operating income = $46,000
reserved cash at 7% = $3,220
usable cash = $42,780
recommended annual repayment = $39,025.48
improvement = $8,284.52
cash retained after payment = $3,754.52
```

Why the second loan gets a different recommendation:

```text
OL-210 remaining term = 6 years
OL-210 max term = 6 years
term extension available = 0 years
```

So for `OL-210`, the engine cannot extend the term further. It can still reduce the rate:

```text
current rate = 6.10%
reference regular rate = 5.80%
configured reduction = 1.00%
target rate = 4.80%
actual change = 6.10% - 4.80% = 1.30%
```

That is why the same scenario produces:

- `FO-101`: `Extend 8 Years` and `Rate -1.3%`
- `OL-210`: `Rate -1.3%` only

## UI calculation detail table

The UI now exposes the selected scenario calculations in two lender-facing tables.

### Portfolio-level table

The first table shows:

- adjusted operating income
- debt margin reserve
- usable cash for debt service
- current annual payment
- recommended annual payment
- annual payment reduction
- cash retained after payment
- projected value
- net recovery value
- coverage ratio

For the current sample, the key rows are:

```text
Adjusted Operating Income = $68,000 - $22,000 = $46,000
Debt Margin Reserve = 7% x $46,000 = $3,220
Usable Cash For Debt Service = $46,000 - $3,220 = $42,780
Annual Payment Reduction = $47,310 - $39,025.48 = $8,284.52
Coverage Ratio = $379,390.84 / $329,728 = 1.15x
```

### Loan-level table

The second table shows, for each loan:

- current rate
- proposed rate
- current term
- proposed term
- current payment
- proposed payment
- payment reduction
- recommended actions

For the current sample:

```text
FO-101 payment reduction = $26,940 - $19,371.26 = $7,568.74
OL-210 payment reduction = $20,370 - $19,654.22 = $715.78
```

These tables are intended to make the recommendation easier for a lender to explain and defend during review.

The same calculation detail is now exportable from the UI as a printable lender worksheet. The worksheet includes:

- borrower and case identifiers
- restructuring date
- selected scenario rank and outcome
- the portfolio-level calculation table
- the loan-level calculation table

This export is generated client-side from the selected scenario and opens in a print-friendly window.

## Scoring

The default scoring model combines:

- feasibility
- government protection
- concession minimization
- margin attainment
- simplicity

Current USDA-style weights from config:

- Feasibility: `40%`
- Government Protection: `35%`
- Margin Attainment: `10%`
- Concession Minimization: `10%`
- Simplicity: `5%`

Why this works better for an agency-style servicing engine:

- feasibility is weighted highest because a restructure that does not support repayment capacity should not outrank one that does
- government protection is nearly as important, because the agency still needs a defensible recovery position
- margin attainment still matters, but it is secondary to basic feasibility
- concession minimization matters, but should not dominate the ranking ahead of a workable restructure
- simplicity stays lowest, because a slightly more complex restructure can still be the better agency decision

This remains a policy proxy, not an official USDA scoring formula. The preference order is:

`Feasible -> Government-Protective -> Meets Margin -> Minimizes Concession -> Simpler When Otherwise Similar`

## API contract

### `GET /api/config`

Returns:

- app metadata
- sample case
- case presets
- location options
- reference dropdown values
- scenario controls
- policy snapshot values

Current presets include:

- a single-loan restructure case
- a writedown case
- a multi-loan, multi-collateral case

### `POST /api/evaluate`

Returns:

- `recommendedScenarioId`
- ranked scenarios
- summary metrics
- rejected alternatives
- metadata including margin targets and county policy

## Notes on determinism

A-STAR does not use a database or live feeds. All reference values are loaded from `backend/config.js`.

That means:

- the same input produces the same output
- scenario ordering is stable
- explanations are reproducible
- demo behavior is easy to tune

## Current limitations

- simplified policy logic rather than full USDA policy completeness
- no persistence or workflow states
- no live rate or county data feeds
- government protection is a proxy model, not a legally binding recovery calculation
