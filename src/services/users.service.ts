import { usersRepository } from "../repositories/users.repository.js";
import { HttpError } from "../types/httpError.js";
import type { AuthContext } from "../types/auth.js";
import type { Profile } from "../types/profile.js";

export type CurrentUserResponse = {
  user: {
    id: string;
    email: string | null;
  };
  profile: Profile;
  requiresProfileOnboarding: boolean;
};

function buildCurrentUserResponse(
  auth: AuthContext,
  profile: Profile,
): CurrentUserResponse {
  return {
    user: {
      id: auth.userId,
      email: auth.email,
    },
    profile,
    requiresProfileOnboarding: profile.onboardingCompletedAt == null,
  };
}

export const usersService = {
  async getCurrentUser(auth: AuthContext) {
    const profile = await usersRepository.findProfileByUserId(auth.userId);

    if (!profile) {
      throw new HttpError("Authenticated user profile was not found", 404);
    }

    return buildCurrentUserResponse(auth, profile);
  },

  async updateCurrentUserProfile(auth: AuthContext, displayName: string) {
    const existingProfile = await usersRepository.findProfileByUserId(
      auth.userId,
    );

    if (!existingProfile) {
      throw new HttpError("Authenticated user profile was not found", 404);
    }

    const profile = await usersRepository.updateProfileDisplayName(
      auth.userId,
      displayName,
    );

    return buildCurrentUserResponse(auth, profile);
  },
};
