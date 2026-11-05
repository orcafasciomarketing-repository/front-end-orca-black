import { describe, expect, it } from "vitest";

import { addMonths, daysInMonth, formatRange, monthDays, monthLabel, monthsBetween, weekdayName } from "./dateRange";

describe("dateRange", () => {
  it("dias e meses, inclusive na virada do ano e em fevereiro", () => {
    expect(daysInMonth("2026-11")).toBe(30);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(monthDays("2026-11")).toHaveLength(30);
    expect(monthDays("2026-11")[0]).toBe("2026-11-01");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(monthsBetween("2026-09-29", "2026-11-05")).toEqual(["2026-09", "2026-10", "2026-11"]);
  });

  it("nomes em português", () => {
    expect(monthLabel("2026-11")).toBe("Novembro de 2026");
    expect(weekdayName("2026-10-21")).toBe("Qua");
    expect(formatRange({ start: "2026-10-21", end: "2026-10-21" })).toBe("qua, 21/10");
    expect(formatRange({ start: "2026-10-19", end: "2026-10-25" })).toBe("19/10 a 25/10");
  });
});
