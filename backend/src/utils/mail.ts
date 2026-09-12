import nodemailer, { type Transporter } from "nodemailer";
import { HttpError } from "../middleware/errorHandler.js";

type MailAttachment = { filename: string; content: Buffer };

function mailConfig(): {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
} {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  if (!host || !user || !pass) {
    throw new HttpError(
      501,
      "EMAIL_NOT_CONFIGURED",
      "SMTP is not configured on this server. Set SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM.",
    );
  }
  return {
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user,
    pass,
    from: from || `COMMANDCENTER <${user}>`,
  };
}

let cached: { key: string; transport: Transporter } | null = null;

function transport(): Transporter {
  const cfg = mailConfig();
  const key = `${cfg.host}|${cfg.port}|${cfg.user}|${cfg.pass}`;
  if (cached && cached.key === key) return cached.transport;
  const created = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  cached = { key, transport: created };
  return created;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  body: string;
  attachments?: MailAttachment[];
}): Promise<void> {
  const cfg = mailConfig();
  await transport().sendMail({
    from: cfg.from,
    to: options.to,
    subject: options.subject,
    text: options.body,
    attachments: options.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
  });
}