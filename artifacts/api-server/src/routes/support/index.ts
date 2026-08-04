import { Router, type IRouter } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";

const router: IRouter = Router();

function buildRawEmail({
  to,
  from,
  replyTo,
  subject,
  body,
}: {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  body: string;
}): string {
  const lines = [
    `To: ${to}`,
    `From: ${from}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ];
  const raw = lines.join("\r\n");
  // Base64url encode (Gmail API requirement)
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

router.post("/support/contact", async (req, res) => {
  const { name, email, subject, message } = req.body as {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
  };

  if (!name || !email || !subject || !message) {
    res.status(400).json({ error: "All fields are required." });
    return;
  }

  const to = process.env.SUPPORT_EMAIL;
  if (!to) {
    req.log.error("SUPPORT_EMAIL env var is not set");
    res.status(500).json({ error: "Support email not configured." });
    return;
  }

  try {
    const connectors = new ReplitConnectors();

    const rawEmail = buildRawEmail({
      to,
      from: "me",
      replyTo: email,
      subject: `[AVI Support] ${subject}`,
      body: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });

    const response = await connectors.proxy(
      "google-mail",
      "/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: rawEmail }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      req.log.error({ status: response.status, body: errorText }, "Gmail send failed");
      res.status(500).json({ error: "Failed to send message. Please try again." });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Support contact error");
    res.status(500).json({ error: "Failed to send message. Please try again." });
  }
});

export default router;
