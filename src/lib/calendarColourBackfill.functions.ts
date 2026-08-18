import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  accessToken: z.string().min(1),
  daysBack: z.number().int().min(0).max(730).optional(),
  daysForward: z.number().int().min(0).max(730).optional(),
});

export const backfillGoogleColours = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { backfillGoogleEventColours } = await import("./calendarColourBackfill.server");
    return backfillGoogleEventColours(data.accessToken, {
      daysBack: data.daysBack,
      daysForward: data.daysForward,
    });
  });
