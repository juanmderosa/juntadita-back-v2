import { describe, expect, it } from "vitest";
import {
  addGroupMembersSchema,
  createGroupSchema,
} from "../src/schemas/groups.schemas.js";
import { inviteParticipantsSchema } from "../src/schemas/events.schemas.js";

describe("group schemas", () => {
  it("normalizes group names and member emails", () => {
    expect(createGroupSchema.parse({ name: "  Amigos  " })).toEqual({
      name: "Amigos",
    });
    expect(
      addGroupMembersSchema.parse({ emails: [" ANA@example.com "] }),
    ).toEqual({
      emails: ["ana@example.com"],
    });
  });

  it("rejects duplicate group member emails", () => {
    expect(() =>
      addGroupMembersSchema.parse({
        emails: ["ana@example.com", "ana@example.com"],
      }),
    ).toThrow();
  });

  it("accepts manual emails, groups or both for invitations", () => {
    const groupId = "550e8400-e29b-41d4-a716-446655440000";
    expect(
      inviteParticipantsSchema.parse({ emails: ["ana@example.com"] }),
    ).toEqual({ emails: ["ana@example.com"] });
    expect(inviteParticipantsSchema.parse({ groupIds: [groupId] })).toEqual({
      groupIds: [groupId],
    });
    expect(() => inviteParticipantsSchema.parse({})).toThrow();
  });
});
