import { defaultConfig, normalizePayload, resolvePolicyContext, sum, toCurrency, buildMarginTargets } from "./engine-utils.js";
import { buildScenarioCombosForStage, generateScenarioCombos, runPhase1Feasibility } from "./phase1-feasibility.js";
import { runPhase2GovernmentProtection } from "./phase2-government-protection.js";
import { rankScenarios, runPhase3Optimizer } from "./phase3-optimizer.js";

function summarizeResults(input, ranked) {
  const baselineFirstYearRepayment = sum(input.existingLoans.map((loan) => loan.firstYearPayment));
  const recommended = ranked.find((scenario) => scenario.status === "valid and recommendable") ?? ranked[0] ?? null;

  return {
    baseline: {
      firstYearRepayment: toCurrency(baselineFirstYearRepayment),
    },
    recommendedDelta: recommended
      ? {
          firstYearRepaymentChange: toCurrency(recommended.firstYearMetrics.totalDebtRepayment - baselineFirstYearRepayment),
          writedownAmount: toCurrency(recommended.scenario.writedownAmount),
          supportAmount: toCurrency(recommended.scenario.conservationSupportAmount),
          conservationCancellationAmount: toCurrency(recommended.scenario.conservationCancellationAmount ?? 0),
        }
      : null,
  };
}

function evaluateCase(payload, activeConfig = defaultConfig) {
  const input = normalizePayload(payload);
  const policyContext = resolvePolicyContext(input, activeConfig);
  const evaluateScenarioSet = (scenarioSet) =>
    scenarioSet.map((scenario) => {
      const phase1 = runPhase1Feasibility(input, policyContext, scenario);
      const phase2 = runPhase2GovernmentProtection(input, policyContext, scenario, phase1);
      return runPhase3Optimizer(input, policyContext, scenario, phase1, phase2, activeConfig);
    });

  const baseEvaluated = evaluateScenarioSet(buildScenarioCombosForStage(activeConfig, input, "base"));
  const baseValid = baseEvaluated.filter((scenario) => scenario.status === "valid");
  const evaluated = baseValid.length > 0
    ? baseEvaluated
    : evaluateScenarioSet(buildScenarioCombosForStage(activeConfig, input, "fallback"));
  const ranked = rankScenarios(evaluated);
  const recommended = ranked.find((scenario) => scenario.status === "valid and recommendable") ?? null;
  const validCount = ranked.filter((scenario) => scenario.status !== "rejected").length;
  const rejectedCount = ranked.filter((scenario) => scenario.status === "rejected").length;

  return {
    recommendedScenarioId: recommended?.id ?? null,
    scenarios: ranked.slice(0, activeConfig.scenarioControls.explanationTopCount),
    summaryMetrics: summarizeResults(input, ranked),
    rejectedAlternatives: ranked.filter((scenario) => scenario.status === "rejected").slice(0, 10),
    metadata: {
      state: input.case.state,
      county: input.case.county,
      proposedServicingDate: input.case.proposedServicingDate,
      marginTargets: buildMarginTargets(
        activeConfig,
        input.case.debtMarginPercent ?? activeConfig.scenarioControls.marginStartPercent,
      ),
      scenarioCount: evaluated.length,
      pipelineCounts: {
        generated: evaluated.length,
        feasible: validCount,
        rejected: rejectedCount,
        recommended: recommended ? 1 : 0,
      },
      countyPolicy: policyContext.countyDefaults,
      eligibility: policyContext.eligibility,
      restructureWithoutWritedownFound: baseValid.some(
        (scenario) => scenario.scenario.writedownAmount === 0 && !scenario.scenario.liquidateLoan,
      ),
      phases: [
        "Phase 1 — Feasibility engine",
        "Phase 2 — Government protection engine",
        "Phase 3 — Full scenario optimizer",
      ],
    },
  };
}

function validateEvaluationPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") {
    return ["Payload must be a JSON object."];
  }
  if (!payload.case || typeof payload.case !== "object") {
    errors.push("case is required.");
  }
  if (!payload.cashFlow || typeof payload.cashFlow !== "object") {
    errors.push("cashFlow is required.");
  }
  if (!Array.isArray(payload.existingLoans) || payload.existingLoans.length === 0) {
    errors.push("existingLoans must contain at least one loan.");
  }
  if (!Array.isArray(payload.collateral) || payload.collateral.length === 0) {
    errors.push("collateral must contain at least one asset.");
  }
  return errors;
}

export {
  buildMarginTargets,
  buildScenarioCombosForStage,
  evaluateCase,
  generateScenarioCombos,
  normalizePayload,
  resolvePolicyContext,
  validateEvaluationPayload,
};
