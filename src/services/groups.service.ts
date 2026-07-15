import type { AuthContext } from "../types/auth.js";
import { HttpError } from "../types/httpError.js";
import { mapGroupRow } from "../types/groups.js";
import type {
  AddGroupMembersInput,
  CreateGroupInput,
  UpdateGroupInput,
} from "../schemas/groups.schemas.js";
import { groupsRepository } from "../repositories/groups.repository.js";

async function requireOwnedGroup(userId: string, groupId: string) {
  const group = await groupsRepository.findOwnedById(userId, groupId);
  if (!group) throw new HttpError("Group not found", 404);
  return group;
}

async function toDetail(userId: string, groupId: string) {
  const group = await requireOwnedGroup(userId, groupId);
  const members = await groupsRepository.listMembers(groupId);
  return { ...mapGroupRow(group, members.length), members };
}

export const groupsService = {
  async list(auth: AuthContext) {
    const groups = await groupsRepository.listOwned(auth.userId);
    return Promise.all(
      groups.map(async (group) => {
        const members = await groupsRepository.listMembers(group.id);
        return mapGroupRow(group, members.length);
      }),
    );
  },

  async getById(auth: AuthContext, groupId: string) {
    return toDetail(auth.userId, groupId);
  },

  async create(auth: AuthContext, input: CreateGroupInput) {
    const existing = await groupsRepository.findOwnedByName(
      auth.userId,
      input.name,
    );
    if (existing)
      throw new HttpError("You already have a group with this name", 409);
    const group = await groupsRepository.create(auth.userId, input.name);
    return { ...mapGroupRow(group), members: [] };
  },

  async update(auth: AuthContext, groupId: string, input: UpdateGroupInput) {
    await requireOwnedGroup(auth.userId, groupId);
    const existing = await groupsRepository.findOwnedByName(
      auth.userId,
      input.name,
    );
    if (existing && existing.id !== groupId) {
      throw new HttpError("You already have a group with this name", 409);
    }
    await groupsRepository.update(groupId, input.name);
    return toDetail(auth.userId, groupId);
  },

  async delete(auth: AuthContext, groupId: string) {
    await requireOwnedGroup(auth.userId, groupId);
    await groupsRepository.delete(groupId);
    return { deleted: true as const };
  },

  async addMembers(
    auth: AuthContext,
    groupId: string,
    input: AddGroupMembersInput,
  ) {
    await requireOwnedGroup(auth.userId, groupId);
    const existing = await groupsRepository.findMembersByEmails(
      groupId,
      input.emails,
    );
    const existingEmails = new Set(existing.map((member) => member.email));
    const emailsToCreate = input.emails.filter(
      (email) => !existingEmails.has(email),
    );
    if (emailsToCreate.length > 0)
      await groupsRepository.createMembers(groupId, emailsToCreate);
    return toDetail(auth.userId, groupId);
  },

  async deleteMember(auth: AuthContext, groupId: string, memberId: string) {
    await requireOwnedGroup(auth.userId, groupId);
    await groupsRepository.deleteMember(groupId, memberId);
    return { deleted: true as const };
  },
};
