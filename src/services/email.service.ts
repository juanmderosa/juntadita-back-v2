import { Resend } from "resend";
import { config } from "../config/config.js";

type SendInviteEmailInput = {
  to: string;
  eventTitle: string;
  eventUrl: string;
};

export type SendInviteEmailResult =
  { ok: true; providerMessageId: string | null } | { ok: false; errorMessage: string };

let resendClient: Resend | null = null;

function getResendClient() {
  if (!config.resendApiKey) {
    throw new Error("RESEND_API_KEY is required to send invitation emails");
  }

  resendClient ??= new Resend(config.resendApiKey);
  return resendClient;
}

export const emailService = {
  async sendInviteEmail(input: SendInviteEmailInput): Promise<SendInviteEmailResult> {
    if (!config.inviteFromEmail) {
      return {
        ok: false,
        errorMessage: "INVITE_FROM_EMAIL is required to send invitation emails",
      };
    }

    try {
      const eventTitle = escapeHtml(input.eventTitle);
      const eventUrl = escapeHtml(input.eventUrl);
      const result = await getResendClient().emails.send({
        from: config.inviteFromEmail,
        to: input.to,
        subject: `Te invitaron a ${input.eventTitle} en Juntadita`,
        html: `
          <main style="font-family: Arial, sans-serif; color: #0f172a;">
            <h1>Te invitaron a una juntadita</h1>
            <p>Tenes una invitacion para participar de <strong>${eventTitle}</strong>.</p>
            <p>Ingresa con este mismo email para ver las opciones y participar.</p>
            <p>
              <a href="${eventUrl}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700;">
                Ver evento
              </a>
            </p>
          </main>
        `,
      });

      if (result.error) {
        return { ok: false, errorMessage: result.error.message };
      }

      return { ok: true, providerMessageId: result.data?.id ?? null };
    } catch (error) {
      return {
        ok: false,
        errorMessage: error instanceof Error ? error.message : "Unknown email provider error",
      };
    }
  },
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
