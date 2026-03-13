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

- extending the loan term
- reducing the interest rate
- deferring payments
- consolidating loans
- applying writedown
- liquidating a loan

The engine first tries to find a valid restructure without writedown. If it can do that, writedown versus net recovery analysis is not needed for the recommended path. If it cannot, the engine moves into writedown or liquidation analysis.

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

- `FO-101` is restructured through term extension and rate reduction
- `OL-210` is restructured through rate reduction only

Recommended path:

- `FO-101: Extend 8 Years, Rate -1.3%`
- `OL-210: Rate -1.3%`

That means the engine found that the two loans should not be treated the same way. The farm ownership loan benefits from both term extension and rate reduction, while the operating loan only benefits from rate reduction because it is already at its term limit.

## Why the two loans can get different recommendations

A-STAR evaluates each loan against its own:

- current rate
- remaining term
- maximum term
- servicing eligibility
- loan type policy constraints

In the current sample:

- `FO-101` can still be extended, so it gets both a term change and a rate change
- `OL-210` is already at its maximum term of `6 years`, so it cannot be extended further
- the engine can still reduce the rate on `OL-210`, so that becomes the recommended action

That produces two different recommendations inside the same case.

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

## What this tool is not

A-STAR is not a final policy authority and not a policy-complete USDA servicing engine.

It is a deterministic, explainable decision-support tool designed to help a lender:

- understand the structure of a recommendation
- compare alternatives
- see borrower affordability and lender protection in one place
- iterate on assumptions during review
