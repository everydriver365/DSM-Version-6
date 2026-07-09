import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const InsightInputSchema = z.object({
  todayLessons: z.number(),
  todayUpcoming: z.number(),
  todayCompleted: z.number(),
  todayEarnings: z.number(),
  weekLessons: z.number(),
  weekEarnings: z.number(),
  monthLessons: z.number(),
  monthEarnings: z.number(),
  ytdLessons: z.number(),
  ytdEarnings: z.number(),
  outstanding: z.number(),
  newPupils: z.number(),
  upcomingTests: z.number(),
  pendingSwaps: z.number(),
  freeSlots: z.number(),
  unreadMessages: z.number(),
  waitlistCount: z.number(),
});

const InsightOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
      cta: z.string().nullable(),
      route: z.string().nullable(),
    }),
  ),
});

export type InsightInput = z.infer<typeof InsightInputSchema>;
export type InsightOutput = z.infer<typeof InsightOutputSchema>;

export const generateInsights = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InsightInputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { suggestions: [] };
    }

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3.5-flash");

    const prompt = buildPrompt(data);

    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: InsightOutputSchema }),
        prompt,
        temperature: 0.7,
      });
      return output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        return parseFallback(error.text) ?? { suggestions: [] };
      }
      return { suggestions: [] };
    }
  });

function buildPrompt(data: InsightInput): string {
  return [
    "You are a concise business assistant for a UK driving instructor using the DSM app.",
    "Look at the dashboard numbers below and generate 3-4 short, actionable, specific suggestions.",
    "Each suggestion should have a friendly title, a one-sentence body, an optional CTA label, and an optional app route.",
    "Only suggest routes that exist: /bookings, /schedule, /pupils, /payments, /messages, /waitlist, /gaps, /tools.",
    "If nothing notable needs attention, return a single encouraging suggestion instead.",
    "",
    "Dashboard data:",
    `- Today: ${data.todayLessons} lessons (${data.todayUpcoming} upcoming, ${data.todayCompleted} completed), £${Math.round(data.todayEarnings)} earned`,
    `- This week: ${data.weekLessons} lessons, £${Math.round(data.weekEarnings)} earned`,
    `- This month: ${data.monthLessons} lessons completed, £${Math.round(data.monthEarnings)} earned`,
    `- Year to date: ${data.ytdLessons} lessons completed, £${Math.round(data.ytdEarnings)} earned`,
    `- Outstanding balance: £${Math.round(data.outstanding)}`,
    `- Needs attention: ${data.newPupils} new pupil jobs, ${data.upcomingTests} tests in next 7 days, ${data.pendingSwaps} pending swap enquiries`,
    `- Free slots: ${data.freeSlots}, Waitlist: ${data.waitlistCount}, Unread messages: ${data.unreadMessages}`,
  ].join("\n");
}

function parseFallback(text: string | undefined): InsightOutput | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.suggestions)) {
      return { suggestions: parsed.suggestions };
    }
  } catch {
    // ignore
  }
  return null;
}
