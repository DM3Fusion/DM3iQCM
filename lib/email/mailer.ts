import "server-only";
import nodemailer from "nodemailer";

export type MailResult = { ok: true } | { ok: false; errorCode: string; safeMessage: string };
export async function sendApplicationEmail(input: { to: string; subject: string; text: string; }): Promise<MailResult> {
  const host = process.env.DM3IQCM_SMTP_HOST?.trim();
  const user = process.env.DM3IQCM_SMTP_USER?.trim();
  const password = process.env.DM3IQCM_SMTP_PASSWORD;
  const from = process.env.DM3IQCM_SMTP_FROM_EMAIL?.trim();
  if (!host || !user || !password || !from) return { ok: false, errorCode: "MAIL_NOT_CONFIGURED", safeMessage: "Email notification is not configured." };
  try {
    const transport = nodemailer.createTransport({ host, port: Number(process.env.DM3IQCM_SMTP_PORT ?? 587), secure: process.env.DM3IQCM_SMTP_SECURE === "true", auth: { user, pass: password } });
    await transport.sendMail({ from: process.env.DM3IQCM_SMTP_FROM_NAME ? `"${process.env.DM3IQCM_SMTP_FROM_NAME}" <${from}>` : from, to: input.to, subject: input.subject, text: input.text });
    return { ok: true };
  } catch (error) {
    const value = error as { code?: string; message?: string };
    console.error("Application email delivery failed", { code: value.code ?? "MAIL_SEND_FAILED", message: value.message ?? "delivery failed" });
    return { ok: false, errorCode: value.code ?? "MAIL_SEND_FAILED", safeMessage: "Email notification could not be sent." };
  }
}
