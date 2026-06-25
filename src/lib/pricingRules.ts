export interface PricingRule {
  id: string;
  rule_name: string;
  rule_type: 'time_of_day' | 'day_of_week' | 'postcode_zone' | 'advance_notice';
  condition: Record<string, any>;
  adjustment_type: 'flat' | 'percentage';
  adjustment_value: number;
  is_active: boolean;
}

export function applyPricingRules(
  baseRate: number,
  rules: PricingRule[],
  context: {
    lessonDate: string;  // YYYY-MM-DD
    lessonTime: string;  // HH:MM
    postcode?: string;
    bookedAt?: string;   // ISO timestamp when booked
  }
): { total: number; adjustments: { rule_name: string; amount: number }[] } {
  const adjustments: { rule_name: string; amount: number }[] = [];
  let total = baseRate;

  const lessonDateTime = new Date(`${context.lessonDate}T${context.lessonTime}`);
  const dayOfWeek = lessonDateTime.getDay(); // 0=Sun, 6=Sat
  const hour = lessonDateTime.getHours();
  const minute = lessonDateTime.getMinutes();
  const lessonMinutes = hour * 60 + minute;

  for (const rule of rules.filter(r => r.is_active)) {
    let applies = false;
    const c = rule.condition;

    if (rule.rule_type === 'time_of_day' && c.after) {
      const [ah, am] = c.after.split(':').map(Number);
      const afterMinutes = ah * 60 + am;
      applies = lessonMinutes >= afterMinutes;
    }

    if (rule.rule_type === 'day_of_week' && c.days) {
      const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      applies = c.days.some((d: string) =>
        d.toLowerCase() === dayNames[dayOfWeek].toLowerCase() ||
        d.toLowerCase() === dayNames[dayOfWeek].toLowerCase().slice(0,3)
      );
    }

    if (rule.rule_type === 'postcode_zone' && c.postcodes && context.postcode) {
      const pupilOutcode = context.postcode.trim().toUpperCase().split(' ')[0];
      applies = c.postcodes.some((p: string) =>
        context.postcode!.toUpperCase().startsWith(p.trim().toUpperCase()) ||
        pupilOutcode === p.trim().toUpperCase()
      );
    }

    if (rule.rule_type === 'advance_notice' && c.within_hours && context.bookedAt) {
      const hoursNotice = (lessonDateTime.getTime() - new Date(context.bookedAt).getTime()) / (1000 * 60 * 60);
      applies = hoursNotice <= c.within_hours;
    }

    if (applies) {
      const adj = rule.adjustment_type === 'flat'
        ? rule.adjustment_value
        : (baseRate * rule.adjustment_value / 100);
      adjustments.push({ rule_name: rule.rule_name, amount: adj });
      total += adj;
    }
  }

  return { total: Math.round(total * 100) / 100, adjustments };
}
