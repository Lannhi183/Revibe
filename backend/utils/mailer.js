// import nodemailer from "nodemailer";
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: Number(process.env.SMTP_PORT || 587),
//   secure: process.env.SMTP_SECURE === "true",
//   auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
// });
// export async function sendMail({ to, subject, text, html }) {
//   try {
//     const from = process.env.MAIL_FROM || process.env.SMTP_USER;

//     const info = await transporter.sendMail({
//       from,
//       to,
//       subject,
//       text,
//       html,
//     });

//     console.log("✅ Mail sent:", info.messageId);
//     return info;
//   } catch (err) {
//     console.error("❌ Mail send failed:", err.message);
//     throw err;
//   }
// }


import { google } from "googleapis";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const USER_EMAIL = process.env.GMAIL_USER;


const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const gmail = google.gmail({ version: "v1", auth: oAuth2Client });


export async function sendMail({ to, subject, html, text }) {
  try {
    const rawMessage = [
      `To: ${to}`,
      `From: Revibe Team <${USER_EMAIL}>`,
      `Subject: ${subject}`,
      "Content-Type: text/html; charset=UTF-8",
      "",
      html || text || "",
    ]
      .join("\r\n")
      .trim();

    const encodedMessage = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    console.log("✅ Gmail API sent:", res.data.id);
    return res.data;
  } catch (err) {
    console.error("❌ Gmail API send failed:", err.message);
    throw err;
  }
}