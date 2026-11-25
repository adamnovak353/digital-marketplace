export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  readonly kind: "smtp" | "memory";
  send(message: MailMessage): Promise<void>;
}

export class MemoryMailer implements Mailer {
  readonly kind = "memory" as const;
  readonly sent: MailMessage[] = [];
  failNext = 0;

  async send(message: MailMessage) {
    if (this.failNext > 0) {
      this.failNext -= 1;
      throw new Error("Simulated mail failure");
    }
    this.sent.push(message);
  }
}

export async function createSmtpMailer(url: string, from: string): Promise<Mailer> {
  const { default: nodemailer } = await import("nodemailer");
  const transport = nodemailer.createTransport(url);
  return {
    kind: "smtp",
    async send(message) {
      await transport.sendMail({ from, to: message.to, subject: message.subject, text: message.text });
    },
  };
}

export function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  const visible = name.slice(0, Math.min(2, Math.max(1, name.length - 1)));
  return `${visible}${"*".repeat(Math.max(1, name.length - visible.length))}@${domain}`;
}
