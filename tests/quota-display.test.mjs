import test from "node:test";
import assert from "node:assert/strict";

import {
  quotaLevel,
  quotaWindowLabel,
  selectPrimaryQuotaWindow,
  selectQuotaIndicator,
} from "../packages/dsh-plugin/src/quota-display.mjs";

const now = Date.parse("2026-08-26T13:50:00.000Z");

test("compact quota summary prefers the five-hour window over weekly windows", () => {
  const fiveHour = {
    id: "group:window fraction",
    name: "group:window fraction",
    remaining: 0.99,
    limit: 1,
    resetAt: "2026-08-26T18:43:04.000Z",
  };
  const weekly = {
    id: "group:window fraction",
    name: "group:window fraction",
    remaining: 1,
    limit: 1,
    resetAt: "2026-09-02T13:48:52.000Z",
  };
  assert.equal(selectPrimaryQuotaWindow([weekly, fiveHour], now), fiveHour);
});

test("compact quota summary uses the only available weekly window", () => {
  const weekly = {
    id: "weekly",
    name: "Weekly",
    remaining: 0.72,
    limit: 1,
    resetAt: "2026-09-02T13:48:52.000Z",
  };
  assert.equal(selectPrimaryQuotaWindow([weekly], now), weekly);
});

test("explicit five-hour period wins even when its reset is later", () => {
  const fiveHour = {
    id: "primary",
    name: "5 hour window",
    remaining: 0.8,
    limit: 1,
    resetAt: "2026-08-27T13:50:00.000Z",
  };
  const weekly = {
    id: "secondary",
    name: "Weekly window",
    remaining: 0.2,
    limit: 1,
    resetAt: "2026-08-26T14:00:00.000Z",
  };
  assert.equal(selectPrimaryQuotaWindow([weekly, fiveHour], now), fiveHour);
});

test("compact quota indicator keeps a pay-as-you-go balance as money", () => {
  const balance = {
    id: "credits",
    name: "Remaining credits",
    kind: "balance",
    remaining: 12.8,
    limit: 50,
    unit: "USD",
  };
  assert.deepEqual(selectQuotaIndicator([balance]), {
    type: "balance",
    window: balance,
    remaining: 12.8,
  });
});

test("compact quota indicator hides a window without a readable amount", () => {
  assert.equal(selectQuotaIndicator([{
    id: "weekly",
    remaining: null,
    limit: 100,
  }]), null);
});

test("a provider-reported window length names machine-keyed windows and orders them", () => {
  const t = (key, params) => `${key}${params ? `:${params.count}` : ""}`;
  const fiveHour = { id: "rate_limit.primary_window", name: "primary_window", windowSeconds: 18_000, remaining: 62, limit: 100 };
  const weekly = { id: "rate_limit.secondary_window", name: "secondary_window", windowSeconds: 604_800, remaining: 18, limit: 100 };
  assert.equal(quotaWindowLabel(fiveHour, t), "quota.window.hours:5");
  assert.equal(quotaWindowLabel(weekly, t), "quota.window.weekly");
  assert.equal(selectPrimaryQuotaWindow([weekly, fiveHour], now), fiveHour);
  // A name written for people is never replaced; an unknown machine key is only tidied.
  assert.equal(quotaWindowLabel({ name: "Gemini 3 Pro / Daily", windowSeconds: 86_400 }, t), "Gemini 3 Pro / Daily");
  assert.equal(quotaWindowLabel({ id: "rate_limit.primary_window", name: "primary_window" }, t), "primary window");
  assert.equal(quotaWindowLabel({}, t), "value.quota");
});

test("quota level thresholds match the composer meter", () => {
  assert.deepEqual([0, 10, 11, 25, 26, 100].map(quotaLevel), ["critical", "critical", "warning", "warning", "healthy", "healthy"]);
});
