import { getSupabaseAdmin } from "../config/supabase.js";
import type {
  ContactGroupMember,
  GroupMemberRow,
  GroupRow,
} from "../types/groups.js";
import { mapGroupMemberRow } from "../types/groups.js";

const groupSelect = "id,owner_user_id,name,created_at,updated_at";
const memberSelect = "id,group_id,email,created_at,updated_at";

export const groupsRepository = {
  async listOwned(userId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("groups")
      .select(groupSelect)
      .eq("owner_user_id", userId)
      .order("name", { ascending: true })
      .overrideTypes<GroupRow[]>();
    if (error) throw error;
    return data ?? [];
  },

  async findOwnedById(userId: string, groupId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("groups")
      .select(groupSelect)
      .eq("owner_user_id", userId)
      .eq("id", groupId)
      .maybeSingle<GroupRow>();
    if (error) throw error;
    return data;
  },

  async findOwnedByName(userId: string, name: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("groups")
      .select(groupSelect)
      .eq("owner_user_id", userId)
      .eq("name", name)
      .maybeSingle<GroupRow>();
    if (error) throw error;
    return data;
  },

  async create(userId: string, name: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("groups")
      .insert({ owner_user_id: userId, name })
      .select(groupSelect)
      .single<GroupRow>();
    if (error) throw error;
    return data;
  },

  async update(groupId: string, name: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("groups")
      .update({ name })
      .eq("id", groupId)
      .select(groupSelect)
      .single<GroupRow>();
    if (error) throw error;
    return data;
  },

  async delete(groupId: string) {
    const { error } = await getSupabaseAdmin()
      .from("groups")
      .delete()
      .eq("id", groupId);
    if (error) throw error;
  },

  async listMembers(groupId: string): Promise<ContactGroupMember[]> {
    const { data, error } = await getSupabaseAdmin()
      .from("group_members")
      .select(memberSelect)
      .eq("group_id", groupId)
      .order("email", { ascending: true })
      .overrideTypes<GroupMemberRow[]>();
    if (error) throw error;
    return (data ?? []).map(mapGroupMemberRow);
  },

  async createMembers(groupId: string, emails: string[]) {
    const { data, error } = await getSupabaseAdmin()
      .from("group_members")
      .insert(emails.map((email) => ({ group_id: groupId, email })))
      .select(memberSelect)
      .overrideTypes<GroupMemberRow[]>();
    if (error) throw error;
    return (data ?? []).map(mapGroupMemberRow);
  },

  async findMembersByEmails(groupId: string, emails: string[]) {
    if (emails.length === 0) return [];
    const { data, error } = await getSupabaseAdmin()
      .from("group_members")
      .select(memberSelect)
      .eq("group_id", groupId)
      .in("email", emails)
      .overrideTypes<GroupMemberRow[]>();
    if (error) throw error;
    return (data ?? []).map(mapGroupMemberRow);
  },

  async deleteMember(groupId: string, memberId: string) {
    const { error } = await getSupabaseAdmin()
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("id", memberId);
    if (error) throw error;
  },

  async getEmailsForOwnedGroups(userId: string, groupIds: string[]) {
    if (groupIds.length === 0)
      return { foundGroupIds: [], emails: [] as string[] };
    const { data, error } = await getSupabaseAdmin()
      .from("groups")
      .select("id,group_members(email)")
      .eq("owner_user_id", userId)
      .in("id", groupIds)
      .overrideTypes<
        Array<{ id: string; group_members: Array<{ email: string }> }>
      >();
    if (error) throw error;
    return {
      foundGroupIds: (data ?? []).map((group) => group.id),
      emails: (data ?? []).flatMap((group) =>
        group.group_members.map((member) => member.email),
      ),
    };
  },
};
