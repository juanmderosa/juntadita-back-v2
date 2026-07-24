import { getSupabaseAdmin } from "../config/supabase.js";
import { mapProfileRow, type Profile, type ProfileRow } from "../types/profile.js";

const profileSelect =
  "id,email,display_name,avatar_url,onboarding_completed_at,created_at,updated_at";

export const usersRepository = {
  async findProfileByUserId(userId: string): Promise<Profile | null> {
    const { data, error } = await getSupabaseAdmin()
      .from("profiles")
      .select(profileSelect)
      .eq("id", userId)
      .maybeSingle<ProfileRow>();

    if (error) throw error;
    if (!data) return null;

    return mapProfileRow(data);
  },

  async findProfilesByEmails(emails: string[]): Promise<Profile[]> {
    if (emails.length === 0) return [];

    const { data, error } = await getSupabaseAdmin()
      .from("profiles")
      .select(profileSelect)
      .in("email", emails)
      .overrideTypes<ProfileRow[]>();

    if (error) throw error;
    return (data ?? []).map(mapProfileRow);
  },

  async updateProfileDisplayName(userId: string, displayName: string): Promise<Profile> {
    const existing = await this.findProfileByUserId(userId);
    const onboardingCompletedAt = existing?.onboardingCompletedAt ?? new Date().toISOString();

    const { data, error } = await getSupabaseAdmin()
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        onboarding_completed_at: onboardingCompletedAt,
      })
      .eq("id", userId)
      .select(profileSelect)
      .single<ProfileRow>();

    if (error) throw error;

    return mapProfileRow(data);
  },
};
