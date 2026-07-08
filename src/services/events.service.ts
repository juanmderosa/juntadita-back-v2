import type {
  CreateEventInput,
  UpdateEventInput,
} from "../schemas/events.schemas.js";
import { eventsRepository } from "../repositories/events.repository.js";
import { usersRepository } from "../repositories/users.repository.js";
import type { AuthContext } from "../types/auth.js";
import { HttpError } from "../types/httpError.js";

async function getEventIdentity(auth: AuthContext) {
  const profile = await usersRepository.findProfileByUserId(auth.userId);

  if (!profile) {
    throw new HttpError("Authenticated user profile was not found", 404);
  }

  return {
    userId: auth.userId,
    email: (auth.email ?? profile.email).trim().toLowerCase(),
    displayName: profile.displayName,
  };
}

export const eventsService = {
  async create(auth: AuthContext, input: CreateEventInput) {
    const identity = await getEventIdentity(auth);
    return eventsRepository.createWithAdmin(input, identity);
  },

  async list(auth: AuthContext, page: number, limit: number) {
    const identity = await getEventIdentity(auth);
    return eventsRepository.listForUser(
      identity.userId,
      identity.email,
      page,
      limit,
    );
  },

  async getById(auth: AuthContext, eventId: string) {
    const identity = await getEventIdentity(auth);
    const event = await eventsRepository.findAccessibleById(
      identity.userId,
      identity.email,
      eventId,
    );

    if (!event) throw new HttpError("Event not found", 404);
    return event;
  },

  async update(auth: AuthContext, eventId: string, input: UpdateEventInput) {
    const event = await this.getById(auth, eventId);

    if (event.currentUserRole !== "admin") {
      throw new HttpError("Only event admins can edit this event", 403);
    }

    return eventsRepository.updateBasicData(eventId, input, event.currentUserRole);
  },
};
