import { describe, expect, test } from "bun:test";
import { calculateOutstandingOwed, calculatePaidOutstandingBreakdown } from "./paymentsOwed";

describe("calculateOutstandingOwed", () => {
  test("returns 0 for an empty list", () => {
    expect(calculateOutstandingOwed([])).toBe(0);
  });

  test("sums full unpaid lessons", () => {
    const lessons = [
      { amount_due: 50, paid_amount: 0 },
      { amount_due: 60, paid_amount: 0 },
    ];
    expect(calculateOutstandingOwed(lessons)).toBe(110);
  });

  test("counts only the remaining balance for partially paid lessons", () => {
    const lessons = [
      { amount_due: 100, paid_amount: 75 },
      { amount_due: 40, paid_amount: 10 },
    ];
    expect(calculateOutstandingOwed(lessons)).toBe(55);
  });

  test("treats fully paid lessons as 0", () => {
    const lessons = [
      { amount_due: 80, paid_amount: 80 },
      { amount_due: 30, paid_amount: 0 },
    ];
    expect(calculateOutstandingOwed(lessons)).toBe(30);
  });

  test("handles null amounts as 0", () => {
    const lessons = [
      { amount_due: null, paid_amount: null },
      { amount_due: 45, paid_amount: null },
    ];
    expect(calculateOutstandingOwed(lessons)).toBe(45);
  });

  test("does not subtract overpayments from the total", () => {
    const lessons = [{ amount_due: 50, paid_amount: 60 }];
    expect(calculateOutstandingOwed(lessons)).toBe(0);
  });
});

describe("calculatePaidOutstandingBreakdown", () => {
  test("returns zero breakdown for an empty list", () => {
    expect(calculatePaidOutstandingBreakdown([])).toEqual({
      totalDue: 0,
      totalPaid: 0,
      outstanding: 0,
      paidPercent: 0,
    });
  });

  test("breaks down fully unpaid lessons", () => {
    const lessons = [
      { amount_due: 50, paid_amount: 0 },
      { amount_due: 60, paid_amount: 0 },
    ];
    expect(calculatePaidOutstandingBreakdown(lessons)).toEqual({
      totalDue: 110,
      totalPaid: 0,
      outstanding: 110,
      paidPercent: 0,
    });
  });

  test("shows how partial payments reduce the total", () => {
    const lessons = [
      { amount_due: 100, paid_amount: 75 },
      { amount_due: 40, paid_amount: 10 },
    ];
    expect(calculatePaidOutstandingBreakdown(lessons)).toEqual({
      totalDue: 140,
      totalPaid: 85,
      outstanding: 55,
      paidPercent: 85 / 140,
    });
  });

  test("treats fully paid lessons as fully collected", () => {
    const lessons = [
      { amount_due: 80, paid_amount: 80 },
      { amount_due: 30, paid_amount: 0 },
    ];
    expect(calculatePaidOutstandingBreakdown(lessons)).toEqual({
      totalDue: 110,
      totalPaid: 80,
      outstanding: 30,
      paidPercent: 80 / 110,
    });
  });

  test("handles null amounts as 0", () => {
    const lessons = [
      { amount_due: null, paid_amount: null },
      { amount_due: 45, paid_amount: null },
    ];
    expect(calculatePaidOutstandingBreakdown(lessons)).toEqual({
      totalDue: 45,
      totalPaid: 0,
      outstanding: 45,
      paidPercent: 0,
    });
  });

  test("clamps outstanding to 0 on overpayment", () => {
    const lessons = [{ amount_due: 50, paid_amount: 60 }];
    expect(calculatePaidOutstandingBreakdown(lessons)).toEqual({
      totalDue: 50,
      totalPaid: 60,
      outstanding: 0,
      paidPercent: 60 / 50,
    });
  });
});

