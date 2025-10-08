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


import nodemailer from "nodemailer";
import { google } from "googleapis";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const USER_EMAIL = process.env.GMAIL_USER;


const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });


export async function sendMail({ to, subject, html, text }) {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: USER_EMAIL,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    const info = await transporter.sendMail({
      from: `"Revibe Team"`,
      to,
      subject,
      text,
      html,
    });

    console.log("✅ Gmail sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Gmail send failed:", err.message);
    throw err;
  }
}
