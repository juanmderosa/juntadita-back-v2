import { z } from "zod";
import { normalizedEmailSchema, uuidSchema } from "./common.schemas.js";

const groupNameSchema = z
  .string()
  .trim()
  .min(1, "Group name is required")
  .max(120, "Group name must be at most 120 characters");

export const groupParamsSchema = z.object({ groupId: uuidSchema });
export const groupMemberParamsSchema = z.object({
  groupId: uuidSchema,
  memberId: uuidSchema,
});
export const createGroupSchema = z.object({ name: groupNameSchema }).strict();
export const updateGroupSchema = z.object({ name: groupNameSchema }).strict();
export const addGroupMembersSchema = z
  .object({
    emails: z
      .array(normalizedEmailSchema)
      .min(1, "At least one email is required")
      .max(50, "At most 50 emails can be added at once")
      .refine((emails) => new Set(emails).size === emails.length, "Emails must be unique"),
  })
  .strict();

export type GroupParams = z.infer<typeof groupParamsSchema>;
export type GroupMemberParams = z.infer<typeof groupMemberParamsSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type AddGroupMembersInput = z.infer<typeof addGroupMembersSchema>;
