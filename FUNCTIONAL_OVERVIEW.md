# A-STAR

## What A-STAR does

A-STAR stands for **Allocore Servicing Term Analysis and Recommendation**.

It is a calculator-style decision support tool for loan servicing and restructuring. It helps a lender compare:

- the borrower's current loan structure
- one or more possible restructured loan structures
- the likely affordability of each option
- the likely collateral and recovery position behind each option

The goal is not to replace policy judgment. The goal is to make the tradeoffs visible and explainable.

## What the lender enters

The lender reviews or enters information in these main sections:

- borrower and case details
- cash flow
- existing loans
- collateral
- liens and security
- policy settings

The current application also includes two case presets:

- `Case 1 - Iowa Farm Ownership`
- `Case 2 - Ranch Land Writedown`
- `Case 3 - Multi-Loan Multi-Collateral`

These presets are meant to demonstrate two different recommendation patterns:

- a restructure without writedown
- a writedown-driven path when a standard restructure is not enough
- a multi-loan, multi-collateral case where different loans can receive different actions inside the same recommendation

The lender can also adjust the debt margin reserve. This is the amount of cash that should be held back instead of being fully committed to debt service.

## What A-STAR tests

A-STAR can test restructuring paths such as:

- rescheduling operating-style debt
- reamortizing real-estate-style debt
- reducing the interest rate
- deferring payments
- consolidating loans
- applying writedown
- liquidating a loan

The engine first tries to find a valid restructure without writedown. If it can do that, writedown versus net recovery analysis is not needed for the recommended path. If it cannot, the engine moves into writedown or liquidation analysis.

## USDA-style gate checks now included

Before a scenario can rank well, A-STAR now checks a first layer of servicing eligibility:

- good faith
- application completeness
- timely application relative to notice of delinquency
- delinquency or financial distress
- distress cause entered
- crop insurance violation flag
- non-monetary default flag

It also applies path-specific constraints:

- `Deferral` requires temporary hardship and cannot exceed the configured maximum
- `Interest rate reduction` is limited to loans marked as limited-resource eligible
- `Consolidation` is blocked for excluded security types and can be blocked by lien-position mismatch or referral-to-counsel
- `Writedown` is flagged for review if non-essential assets appear sufficient to cure delinquency first

These checks are visible in the recommendation flags, the calculation worksheet, and the policy snapshot.

## How the recommendation is chosen

The engine generates many scenarios and scores them. It looks at:

- whether the borrower can afford the recommended annual payment
- whether the debt margin reserve is preserved
- whether collateral and recovery still support the structure
- how much concession is required
- whether the solution is simpler than other valid options

The top-ranked valid option becomes the recommendation. Ranked alternatives are still shown so the lender can choose a different path.

## Plain-language example

The seeded sample case currently behaves like this:

- current annual debt repayment: `$47,310`
- operating income after non-agency debt and taxes: `$46,000`
- selected debt margin reserve: `7%`
- usable cash after reserve: `$42,780`
- recommended annual repayment: `$39,025.48`
- improvement versus current structure: `$8,284.52`

That means the borrower is short against the current annual payment, but the recommended structure brings the annual debt load below the available operating income.

## Debt margin example

Suppose available cash for debt service is `$40,000` and the lender wants a `10%` reserve.

The reserve is:

```text
$40,000 x 10% = $4,000
```

The usable cash for debt service becomes:

```text
$40,000 - $4,000 = $36,000
```

A-STAR starts at the selected debt margin and steps downward until it either finds a valid scenario or reaches `0%`.

## Current sample recommendation example

In the current sample:

- the borrower passes the servicing eligibility gate
- `FO-301` is treated as a real-estate-style loan
- the recommended path is reamortization rather than a generic term extension

Recommended path:

- `FO-301: Reamortize 10 Years`

That means the engine found that a longer real-estate amortization alone was enough to restore feasibility, so no limited-resource rate relief or writedown was needed.

## Why different loan types can get different recommendations

A-STAR evaluates each loan against its own:

- current rate
- remaining term
- maximum term
- servicing eligibility
- loan type policy constraints
- servicing path type

The engine now distinguishes:

- `Rescheduling` for operating-style or non-real-estate loans
- `Reamortization` for real-estate-style loans such as farm ownership

So two loans in the same case may still receive different actions because they are not governed by the same servicing path.

## Multi-loan recommendation example

The multi-loan preset still shows different actions inside one case:

- `FO-101: Reamortize 8 Years, Rate -0.3%`
- `OL-210: Rate -0.3%`

This happens because the farm ownership loan still has reamortization room, while the operating loan does not.

## Writedown case example

The writedown preset now demonstrates an important USDA-style distinction:

- the borrower is still eligible for servicing overall
- non-essential assets are present, but not enough to fully cure delinquency
- because of that, writedown can still be considered after other options fail

Current writedown preset recommendation:

- `FO-401: Reamortize 5 Years, Rate -1%, Writedown $300,000`

This shows the current engine behavior:

1. try restructure first,
2. only move into writedown when restructure alone is not feasible,
3. compare writedown against recovery logic.

## Collateral and recovery example

The current sample also shows how collateral is used:

- recoverable value is entered directly when available
- prior liens are deducted
- liquidation costs are deducted
- the remaining value becomes net recovery

Current sample net recovery results:

- `RE-1`: `$283,578`
- `CH-1`: `$46,150`
- total net recovery value: `$329,728`

Current selected recommendation also shows:

- projected value: `$379,390.84`
- coverage ratio: `1.15x`

## How to read the screen

The most important parts of the screen are:

- case banner: quick case status and headline metrics
- pre-decision briefing: borrower, cash flow, loan, collateral, and policy context
- decision summary: recommendation, score, payment impact, and outcome graph
- recommendation comparison: top 3 materially different ranked paths shown side by side
- recommended actions by loan: current versus proposed terms for each loan
- current versus recommended loan terms: side-by-side comparison table
- calculation detail worksheet: a lender-readable table showing the formulas, basis, and results used for cash capacity, payments, and government protection
- printable lender worksheet: the selected calculation detail can be exported to a print-friendly worksheet for case review or discussion
- policy snapshot: scenario controls, scoring weights, and recovery assumptions
- USDA-style eligibility and servicing rules: delinquency threshold, application window, deferral cap, and rate-reduction gate

## What this tool is not

A-STAR is not a final policy authority and not a policy-complete USDA servicing engine.

It is a deterministic, explainable decision-support tool designed to help a lender:

- understand the structure of a recommendation
- compare alternatives
- see borrower affordability and lender protection in one place
- iterate on assumptions during review
