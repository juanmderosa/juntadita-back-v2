import { z } from "zod";

export const updateUserProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(80, "Display name must be at most 80 characters"),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
