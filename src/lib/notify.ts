import "server-only";
import { Resend } from "resend";

/**
 * Sends a notification email to the business owner. Uses Resend when
 * RESEND_API_KEY is set; otherwise logs to the console so local dev still works.
 */
export async function notifyOwner(to: string | null, subject: string, lines: string[]) {
  const text = lines.join("\n");
  if (!to || !process.env.RESEND_API_KEY) {
    console.info(`[notify] ${subject}${to ? ` → ${to}` : ""}\n${text}`);
    return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "SupportPilot <onboarding@resend.dev>",
      to,
      subject,
      text,
    });
  } catch (err) {
    console.error("[notify] failed to send email", err);
  }
}
