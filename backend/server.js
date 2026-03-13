import http from "node:http";

import { config } from "./config.js";
import { evaluateCase, validateEvaluationPayload } from "./engine.js";

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function routeRequest(method, url, body, activeConfig = config) {
  if (method === "GET" && url === "/api/config") {
    return {
      statusCode: 200,
      payload: {
        app: activeConfig.app,
        locationOptions: activeConfig.locationOptions,
        referenceData: activeConfig.referenceData,
        sampleCase: activeConfig.sampleCase,
        casePresets: activeConfig.casePresets ?? [],
        scenarioControls: activeConfig.scenarioControls,
        policySummary: {
          collateralRecoveryAssumptions: activeConfig.policy.collateralRecoveryAssumptions,
          scenarioControls: activeConfig.scenarioControls,
          scoringWeights: activeConfig.scoringWeights,
          servicingRules: activeConfig.policy.servicingRules,
          maxTerms: activeConfig.policy.maxTerms,
          loanLimits: activeConfig.policy.loanLimits,
          countyNetRecoveryDefaults: activeConfig.policy.countyNetRecoveryDefaults,
        },
      },
    };
  }

  if (method === "POST" && url === "/api/evaluate") {
    const errors = validateEvaluationPayload(body);
    if (errors.length > 0) {
      return {
        statusCode: 400,
        payload: { errors },
      };
    }
    return {
      statusCode: 200,
      payload: evaluateCase(body, activeConfig),
    };
  }

  return {
    statusCode: 404,
    payload: { error: "Not found" },
  };
}

function createServer(activeConfig = config) {
  return http.createServer(async (request, response) => {
    if (!request.url) {
      json(response, 404, { error: "Not found" });
      return;
    }

    if (request.method === "OPTIONS") {
      json(response, 204, {});
      return;
    }

    if (request.method === "GET" && request.url === "/api/config") {
      const result = await routeRequest("GET", "/api/config", undefined, activeConfig);
      json(response, result.statusCode, result.payload);
      return;
    }

    if (request.method === "POST" && request.url === "/api/evaluate") {
      try {
        const payload = await readJsonBody(request);
        const result = await routeRequest("POST", "/api/evaluate", payload, activeConfig);
        json(response, result.statusCode, result.payload);
      } catch (error) {
        json(response, 400, {
          errors: [error instanceof Error ? error.message : "Invalid JSON payload."],
        });
      }
      return;
    }

    json(response, 404, { error: "Not found" });
  });
}

const port = Number.parseInt(process.env.PORT ?? "3001", 10);

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  createServer().listen(port, () => {
    process.stdout.write(`A-STAR API listening on http://localhost:${port}\n`);
  });
}

export { createServer, routeRequest };
