import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
host: process.env.SMTP_HOST,
port: Number(process.env.SMTP_PORT || 587),
secure: process.env.SMTP_SECURE === 'true',
auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});
export async function sendMail({ to, subject, text, html }){
return transporter.sendMail({ from: process.env.MAIL_FROM || 'no-reply@revibe.vn', to, subject, text, html });
}