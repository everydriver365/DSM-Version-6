import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({ accessToken: z.string().min(1) });

export const backfillGoogleColours = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { backfillGoogleEventColours } = await import("./calendarColourBackfill.server");
    return backfillGoogleEventColours(data.accessToken);
  });
