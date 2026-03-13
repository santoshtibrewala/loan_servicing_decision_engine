# A-STAR Technical Overview

## Purpose

A-STAR is a deterministic restructuring engine with a Vue frontend and a lightweight Node backend.

The core design is:

```text
Inputs
-> Policy Resolution
-> Eligibility Gate Layer
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

- servicing-path classification (`rescheduling` vs `reamortization`)
- scenario constraint checks
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

## Eligibility gate layer

Before ranking, A-STAR now resolves a borrower-level eligibility context from
case inputs and policy rules.

Current gate checks:

- `goodFaith`
- `applicationComplete`
- `completedApplicationDate` inside the configured servicing window relative to `noticeOfDelinquencyDate`
- `daysPastDue >= 90` or `financiallyDistressed = true`
- `distressCause` entered
- `cropInsuranceViolation = false`
- `nonMonetaryDefault = false`

The engine also produces warnings for:

- non-essential assets that appear sufficient to cure delinquency before writedown

This context is returned in `metadata.eligibility` and copied into
`scenario.phaseOutputs.eligibility`.

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

The engine now also classifies the structural action by loan type:

```text
farm_ownership -> reamortization
operating / emergency -> rescheduling
```

So the user-facing action label becomes:

```text
reamortize 5 years
reschedule 3 years
```

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

### 4a. Eligibility timing check

Application timing is calculated as:

```text
completedApplicationDate - noticeOfDelinquencyDate
```

If the configured application window is `60 days`, then:

```text
notice = 2026-01-20
application complete = 2026-03-18
elapsed = 57 days
result = inside servicing window
```

### 4b. Non-essential asset review

The current writedown logic checks whether non-essential assets appear large
enough to cure delinquency before writedown is considered:

```text
nonEssentialAssetLiquidationValue >= totalDelinquentDue
```

Example:

```text
nonEssentialAssetLiquidationValue = $15,000
totalDelinquentDue = $22,000
result = not enough to cure delinquency
```

So writedown remains available for further scenario testing.

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

- borrower is eligible for servicing
- loan type is `farm_ownership`
- remaining term is `30 years`
- max term is `40 years`
- limited-resource reduction is not allowed on this seed loan

Recommended loan outcome:

- `FO-301`
  Current: `30 years`, `3.25%`, `$94,100`
  Recommended: `40 years`, `3.25%`, `$78,906.13`
  Actions: `Reamortize 10 Years`

Portfolio-level result:

```text
current annual repayment = $94,100
adjusted operating income = $80,000
reserved cash at 0% = $0
usable cash = $80,000
recommended annual repayment = $78,906.13
cash retained after payment = $1,093.87
```

Why the action is `reamortize` instead of `extend`:

```text
loanType = farm_ownership
servicingPath = reamortization
newTerm = min(30 + 10, 40) = 40 years
```

So the user sees a policy-specific path label rather than a generic term-change label.

## Worked writedown recommendation

The current writedown preset demonstrates both the eligibility gate and the
recovery test.

Eligibility values:

```text
daysPastDue = 128
application timing = 57 days
goodFaith = true
nonEssentialAssetLiquidationValue = $15,000
totalDelinquentDue = $22,000
```

That means:

```text
servicing eligibility = passed
non-essential asset review = warning only
```

Recommended loan outcome:

- `FO-401`
  Current: `27 years`, `3.10%`, `$104,500`
  Recommended: `32 years`, `2.00%`, `$84,303.03`
  Actions: `Reamortize 5 Years`, `Rate -1%`, `Writedown $300,000`

Why it becomes a writedown case:

```text
adjusted operating income = $147,000 - $60,000 = $87,000
restructure-only payment remains above usable cash
writedown-capped scenario lowers payment to $84,303.03
```

So under the current cap and rule set, writedown is needed to create a feasible
plan.

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
- eligibility status
- application timing
- total delinquent due

For the current sample, the key rows are:

```text
Adjusted Operating Income = $110,000 - $30,000 = $80,000
Debt Margin Reserve = 0% x $80,000 = $0
Usable Cash For Debt Service = $80,000 - $0 = $80,000
Annual Payment Reduction = $94,100 - $78,906.13 = $15,193.87
Eligibility Status = Passed
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
