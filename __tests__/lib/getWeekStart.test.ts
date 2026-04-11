import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getWeekStart } from "@/lib/queries";

describe("getWeekStart", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns the Monday of the current week on a Wednesday", () => {
    // Wednesday 2024-06-12
    vi.setSystemTime(new Date("2024-06-12T12:00:00"));
    expect(getWeekStart(0)).toBe("2024-06-10");
  });

  it("returns the *previous* Monday when called on a Sunday", () => {
    vi.setSystemTime(new Date("2024-06-16T12:00:00")); // Sunday
    expect(getWeekStart(0)).toBe("2024-06-10");
  });

  it("returns Monday when called on a Monday", () => {
    vi.setSystemTime(new Date("2024-06-10T12:00:00"));
    expect(getWeekStart(0)).toBe("2024-06-10");
  });

  it("applies positive offset in whole weeks", () => {
    vi.setSystemTime(new Date("2024-06-10T12:00:00")); // Monday
    expect(getWeekStart(1)).toBe("2024-06-17");
    expect(getWeekStart(2)).toBe("2024-06-24");
  });

  it("applies negative offset in whole weeks", () => {
    vi.setSystemTime(new Date("2024-06-10T12:00:00"));
    expect(getWeekStart(-1)).toBe("2024-06-03");
  });

  it("returns Monday's local date at midnight in UTC+2 (timezone safety)", () => {
    // 2024-06-09T22:30:00Z = Monday 2024-06-10 00:30 CEST (UTC+2)
    // Buggy version returns "2024-06-09" (Sunday in UTC)
    // Fixed version returns "2024-06-10" (Monday in local time)
    vi.setSystemTime(new Date("2024-06-09T22:30:00Z"));
    expect(getWeekStart(0)).toBe("2024-06-10");
  });
});
