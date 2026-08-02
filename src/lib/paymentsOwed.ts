/** Pure helper for the payments-page outstanding total. */
export interface OutstandingLesson {
  amount_due: number | null;
  paid_amount: number | null;
}

/**
 * Calculate the total still owed across a list of unpaid/partial lessons.
 *
 * - Partially paid lessons contribute only their remaining balance.
 * - Fully paid or zero-value lessons contribute 0.
 * - Negative balances (refunds/overpayments) are clamped to 0 per lesson.
 */
export function calculateOutstandingOwed(
  lessons: OutstandingLesson[],
): number {
  return lessons.reduce((sum, lesson) => {
    const due = Number(lesson.amount_due || 0);
    const paid = Number(lesson.paid_amount || 0);
    return sum + Math.max(0, due - paid);
  }, 0);
}
