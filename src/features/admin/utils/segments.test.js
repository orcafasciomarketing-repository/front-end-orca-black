import { describe, expect, it } from "vitest";

import { getSegmentGoal, getSegmentOptions } from "./segments";

const goal = {
  goal: 3000000,
  total: 300000,
  percent: 10,
  segments: {
    b2b: { goal: 2000000, total: 200000, percent: 10 },
    b2g: { goal: 1000000, total: 100000, percent: 10 },
  },
};

describe("getSegmentGoal", () => {
  it("com setor: usa a meta do setor", () => {
    expect(getSegmentGoal(goal, "B2B")).toEqual({ value: 2000000, isTotal: false });
    expect(getSegmentGoal(goal, "B2G")).toEqual({ value: 1000000, isTotal: false });
  });

  it("sem setor (Todos): meta total", () => {
    expect(getSegmentGoal(goal, "")).toEqual({ value: 3000000, isTotal: true });
  });

  it("backend antigo, sem segments: meta total, como era antes", () => {
    expect(getSegmentGoal({ goal: 3000000, total: 0, percent: 0 }, "B2B")).toEqual({ value: 3000000, isTotal: true });
  });

  it("meta do setor não configurada no backend (0): meta total", () => {
    const withoutSegmentGoals = { ...goal, segments: { b2b: { goal: 0, total: 0, percent: 0 } } };

    expect(getSegmentGoal(withoutSegmentGoals, "B2B")).toEqual({ value: 3000000, isTotal: true });
  });
});

describe("getSegmentOptions", () => {
  it("admin: Todos, B2B e B2G", () => {
    expect(getSegmentOptions("").map((option) => option.label)).toEqual(["Todos", "B2B", "B2G"]);
  });

  it("b2b/b2g: só o próprio setor", () => {
    expect(getSegmentOptions("B2B").map((option) => option.label)).toEqual(["B2B"]);
    expect(getSegmentOptions("B2G").map((option) => option.label)).toEqual(["B2G"]);
  });
});
