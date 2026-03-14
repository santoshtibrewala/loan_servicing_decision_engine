import test from "node:test";
import assert from "node:assert/strict";

import { config, resolveCountyRecoveryDefaults } from "../backend/config.js";
import {
  buildMarginTargets,
  buildScenarioCombosForStage,
  evaluateCase,
  generateScenarioCombos,
  normalizePayload,
  resolvePolicyContext,
  validateEvaluationPayload,
} from "../backend/engine.js";
import { routeRequest } from "../backend/server.js";

test("county defaults fall back from statewide to state to county override", () => {
  const statewide = resolveCountyRecoveryDefaults(config.policy, "MO", "Boone", "2026-03-01");
  assert.equal(statewide.liquidationDiscountRate, 0.14);

  const stateOverride = resolveCountyRecoveryDefaults(config.policy, "NE", "Hall", "2026-03-01");
  assert.equal(stateOverride.liquidationDiscountRate, 0.12);

  const countyOverride = resolveCountyRecoveryDefaults(config.policy, "NE", "Lancaster", "2026-03-01");
  assert.equal(countyOverride.liquidationDiscountRate, 0.105);
});

test("policy context resolves state-specific rate data and county defaults", () => {
  const input = normalizePayload(config.sampleCase);
  const context = resolvePolicyContext(input, config);

  assert.equal(context.discountRate, 0.045);
  assert.equal(context.countyDefaults.salesCommissionRate, 0.053);
  assert.equal(context.rateTable.farm_ownership.length > 0, true);
});

test("margin targets step from ten percent down to zero", () => {
  assert.deepEqual(buildMarginTargets(config), [0.1, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01, 0]);
});

test("scenario generation respects configured cap", () => {
  const baseScenarios = buildScenarioCombosForStage(config, config.sampleCase, "base");
  const fallbackScenarios = buildScenarioCombosForStage(config, config.sampleCase, "fallback");
  const scenarios = generateScenarioCombos(config);
  assert.equal(baseScenarios.some((scenario) => scenario.rateReductionPercent > 0), true);
  assert.equal(fallbackScenarios.some((scenario) => scenario.liquidateLoan), true);
  assert.equal(fallbackScenarios.some((scenario) => scenario.buyoutAtCmv), true);
  assert.equal(scenarios.length >= config.scenarioControls.maxScenarioCount, true);
});

test("evaluation returns a recommended scenario and deterministic ranking", () => {
  const result = evaluateCase(config.sampleCase, config);

  assert.ok(result.recommendedScenarioId);
  assert.equal(result.scenarios.length > 0, true);
  assert.equal(result.scenarios[0].status, "valid and recommendable");
  assert.equal(result.scenarios.length, 5);
  assert.equal(result.scenarios[0].rank, 1);
  assert.equal(result.scenarios[0].score >= result.scenarios[1].score, true);
  assert.equal(typeof result.metadata.pipelineCounts.generated, "number");
  assert.equal(typeof result.metadata.pipelineCounts.feasible, "number");
  assert.equal(result.scenarios[0].scenario.deferralYears, 0);
  assert.equal(
    result.scenarios[0].scenario.termExtensionYears > 0 || result.scenarios[0].scenario.rateReductionPercent > 0,
    true,
  );
  assert.deepEqual(result.scenarios[0].paymentScheduleByLoan[0].servicingActions, [
    "reamortize 10 years",
  ]);
  assert.equal(result.scenarios[0].scenario.writedownAmount, 0);
  assert.equal(result.metadata.eligibility.overallEligible, true);
});

test("second preset recommends a writedown path", () => {
  const result = evaluateCase(config.casePresets[1].data, config);

  assert.ok(result.recommendedScenarioId);
  assert.equal(result.scenarios[0].status, "valid and recommendable");
  assert.equal(result.scenarios[0].scenario.writedownAmount > 0, true);
  assert.equal(result.scenarios[0].scenario.writedownAmount <= config.scenarioControls.writedownCapAmount, true);
  assert.deepEqual(result.scenarios[0].paymentScheduleByLoan[0].servicingActions, [
    "reamortize 5 years",
    "rate -1%",
    "writedown 300000",
  ]);
  assert.equal(result.metadata.eligibility.nonEssentialAssetsCanCureDelinquency, false);
});

test("third preset supports multi-loan and multi-collateral recommendations", () => {
  const result = evaluateCase(config.casePresets[2].data, config);

  assert.ok(result.recommendedScenarioId);
  assert.equal(result.scenarios[0].status, "valid and recommendable");
  assert.equal(result.scenarios[0].paymentScheduleByLoan.length, 2);
  assert.deepEqual(result.scenarios[0].paymentScheduleByLoan[0].servicingActions, [
    "reamortize 8 years",
    "rate -0.3%",
  ]);
  assert.deepEqual(result.scenarios[0].paymentScheduleByLoan[1].servicingActions, [
    "rate -0.3%",
  ]);
  assert.equal(config.casePresets[2].data.collateral.length, 3);
});

test("fourth preset recommends consolidation for delinquent operating loans", () => {
  const result = evaluateCase(config.casePresets[3].data, config);

  assert.ok(result.recommendedScenarioId);
  assert.equal(result.scenarios[0].status, "valid and recommendable");
  assert.equal(result.scenarios[0].scenario.consolidateLoans, true);
  assert.deepEqual(result.scenarios[0].paymentScheduleByLoan[0].servicingActions, [
    "reschedule 6 years",
    "rate -0.25%",
    "consolidate",
  ]);
  assert.deepEqual(result.scenarios[0].paymentScheduleByLoan[1].servicingActions, [
    "reschedule 5 years",
    "rate -0.25%",
    "consolidate",
  ]);
});

test("fifth preset recommends consolidation across operating and emergency loans", () => {
  const result = evaluateCase(config.casePresets[4].data, config);

  assert.ok(result.recommendedScenarioId);
  assert.equal(result.scenarios[0].status, "valid and recommendable");
  assert.equal(result.scenarios[0].scenario.consolidateLoans, true);
  assert.equal(result.scenarios[0].paymentScheduleByLoan.length, 3);
  assert.deepEqual(result.scenarios[0].paymentScheduleByLoan[2].servicingActions, [
    "reschedule 7 years",
    "rate -0.25%",
    "consolidate",
  ]);
});

test("buyout path can be recommended when CMV funds cover the buyout value", () => {
  const buyoutCase = structuredClone(config.sampleCase);
  buyoutCase.cashFlow.firstYear.balanceAvailable = 20000;
  buyoutCase.cashFlow.firstYear.nonAgencyDebtAndTaxes = 5000;
  buyoutCase.case.buyoutFundsAvailable = 2500000;
  buyoutCase.case.nonEssentialAssetsAvailable = false;
  buyoutCase.case.nonEssentialAssetLiquidationValue = 0;

  const result = evaluateCase(buyoutCase, config);

  assert.ok(result.recommendedScenarioId);
  assert.equal(result.scenarios[0].scenario.buyoutAtCmv, true);
  assert.deepEqual(result.scenarios[0].paymentScheduleByLoan[0].servicingActions, [
    "buyout at cmv",
  ]);
  assert.equal(result.scenarios[0].governmentProtectionMetrics.cmvBuyoutValue > 0, true);
});

test("payload validation rejects missing required buckets", () => {
  const errors = validateEvaluationPayload({ case: {} });
  assert.deepEqual(errors, [
    "cashFlow is required.",
    "existingLoans must contain at least one loan.",
    "collateral must contain at least one asset.",
  ]);
});

test("api exposes config and evaluation endpoints", async () => {
  const configResponse = await routeRequest("GET", "/api/config", undefined, config);
  assert.equal(configResponse.statusCode, 200);
  const configPayload = configResponse.payload;
  assert.equal(configPayload.sampleCase.case.state, "IA");
  assert.equal(configPayload.casePresets.length, 5);
  assert.deepEqual(configPayload.locationOptions.IA.counties.includes("Polk"), true);
  assert.equal(configPayload.referenceData.loanTypes.some((item) => item.value === "operating"), true);
  assert.equal(typeof configPayload.policySummary.scoringWeights.feasibility, "number");
  assert.equal(configPayload.policySummary.scenarioControls.writedownCapAmount, 300000);
  assert.equal(configPayload.policySummary.servicingRules.delinquencyDaysThreshold, 90);

  const evaluationResponse = await routeRequest("POST", "/api/evaluate", config.sampleCase, config);
  assert.equal(evaluationResponse.statusCode, 200);
  const evaluationPayload = evaluationResponse.payload;
  assert.ok(evaluationPayload.recommendedScenarioId);
  assert.equal(evaluationPayload.metadata.eligibility.overallEligible, true);
});
