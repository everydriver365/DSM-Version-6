/** Pure helper for the payments-page outstanding total. */
export interface OutstandingLesson {
  amount_due: number | null;
  paid_amount: number | null;
}

export interface PaidOutstandingBreakdown {
  totalDue: number;
  totalPaid: number;
  outstanding: number;
  paidPercent: number;
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

/**
 * Calculate paid vs outstanding breakdown across unpaid/partial lessons.
 *
 * Useful for showing how much of the total due has already been collected
 * and how much remains.
 */
export function calculatePaidOutstandingBreakdown(
  lessons: OutstandingLesson[],
): PaidOutstandingBreakdown {
  const totalDue = lessons.reduce((sum, lesson) => sum + Number(lesson.amount_due || 0), 0);
  const totalPaid = lessons.reduce((sum, lesson) => sum + Number(lesson.paid_amount || 0), 0);
  const outstanding = Math.max(0, totalDue - totalPaid);
  const paidPercent = totalDue > 0 ? totalPaid / totalDue : 0;
  return { totalDue, totalPaid, outstanding, paidPercent };
}

