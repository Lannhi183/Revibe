// backend/routes/auth.routes.js
import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

import { User } from '../models/User.js';
import { OtpToken } from '../models/OtpToken.js';
import { RefreshToken } from '../models/RefreshToken.js';

import { hashPassword, comparePassword } from '../utils/hash.js';
import { signAccess, signRefresh, verifyRefresh } from '../utils/jwt.js';
import { sendMail } from '../utils/mailer.js';
import { requireAuth } from '../middlewares/auth.js';

/* ----------------------------- Config & Helpers ---------------------------- */

const r = Router();

// thời hạn OTP (ms)
const OTP_TTL_MS = Number(process.env.OTP_TTL_MS || 10 * 60 * 1000); // 10 phút
// thời hạn Refresh lưu trong DB (ngày)
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TTL_DAYS || 7);

function genOTP(len = 6) {
  // 6 chữ số, padding 0 ở đầu nếu cần
  return crypto.randomInt(0, 10 ** len).toString().padStart(len, '0');
}
function addMs(ms) {
  return new Date(Date.now() + ms);
}
function addDays(days) {
  return new Date(Date.now() + days * 24 * 3600 * 1000);
}
function sanitizeUser(u) {
  return u
    ? { id: String(u._id), email: u.email, name: u.name, role: u.role, email_verified: !!u.email_verified }
    : null;
}

async function issueRefreshToken(user, ip, ua) {
  const jti = crypto.randomUUID();
  await RefreshToken.create({
    user_id: user._id,
    token: jti,
    ip,
    ua,
    expires_at: addDays(REFRESH_TTL_DAYS),
  });
  // refresh JWT chứa jti để đối chiếu DB khi refresh/revoke
  return signRefresh({ sub: String(user._id), role: user.role, jti });
}
function pairTokens(user, refreshJwt) {
  const access_token = signAccess({ sub: String(user._id), role: user.role, email: user.email });
  return { access_token, refresh_token: refreshJwt, user: sanitizeUser(user) };
}

/* ------------------------------ Rate limiting ------------------------------ */

// Giới hạn gửi/kiểm tra OTP theo email (giảm spam).
// Key dựa theo body.email nếu có, fallback IP.
const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => (req.body && req.body.email) || req.ip,
  message: { error: 'Too many OTP requests, please try again later' },
});

/* --------------------------------- Schemas -------------------------------- */

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const VerifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RequestOtpSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(['login', 'verify_email', 'reset_password', 'change_password']).default('login'),
});

const RefreshSchema = z.object({
  refresh_token: z.string().min(10),
});

const LogoutSchema = z.object({
  refresh_token: z.string().min(10),
});

const ResetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4),
  new_password: z.string().min(6),
});

const UpdateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

const ChangePasswordSchema = z.object({
  otp: z.string().min(4),
  new_password: z.string().min(6),
});

/* -------------------------------- Endpoints -------------------------------- */

/**
 * POST /auth/register
 * Đăng ký với email + password → gửi OTP verify email.
 */
r.post('/register', async (req, res) => {
  const p = RegisterSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid payload' });

  const { email, password, name } = p.data;
  const existed = await User.findOne({ email });
  if (existed) return res.status(409).json({ error: 'Email already exists' });

  const user = await User.create({
    email,
    password_hash: await hashPassword(password),
    name,
  });

  const otp = genOTP();
  await OtpToken.create({
    email,
    otp, // NOTE: production có thể hash OTP thay vì lưu plain
    purpose: 'verify_email',
    expires_at: addMs(OTP_TTL_MS),
  });

  await sendMail({
    to: email,
    subject: 'ReVibe — verify email',
    html: `<p>Mã xác minh của bạn là: <b>${otp}</b> (hết hạn sau ${Math.round(
      OTP_TTL_MS / 60000
    )} phút).</p>`,
  });

  res.status(201).json({ message: 'Registered. Check your email for OTP to verify.' });
});

/**
 * POST /auth/verify-email
 * Xác minh email bằng OTP (sau đăng ký).
 */
r.post('/verify-email', otpLimiter, async (req, res) => {
  const p = VerifyOtpSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });

  const { email, otp } = p.data;
  const t = await OtpToken.findOne({
    email,
    purpose: 'verify_email',
    consumed_at: null,
  }).sort('-created_at');

  if (!t) return res.status(400).json({ error: 'OTP not found' });
  if (t.expires_at < new Date()) return res.status(400).json({ error: 'OTP expired' });
  if (t.otp !== otp) {
    t.attempts += 1;
    await t.save();
    return res.status(400).json({ error: 'OTP invalid' });
  }

  t.consumed_at = new Date();
  await t.save();

  await User.updateOne({ email }, { $set: { email_verified: true } });
  res.json({ message: 'Email verified' });
});

/**
 * POST /auth/login
 * Đăng nhập bằng password → trả access/refresh token.
 * (Không bắt buộc email_verified ở dev; nếu muốn, bật chặn khi chưa verify.)
 */
r.post('/login', async (req, res) => {
  const p = LoginSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid payload' });

  const { email, password } = p.data;
  const user = await User.findOne({ email });
  if (!user || !user.password_hash) return res.status(400).json({ error: 'Invalid credentials' });

  // const ok = await comparePassword(password, user.password_hash);
  // if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

  // nếu muốn bắt buộc xác minh email trước khi login thì bật dòng dưới:
  // if (!user.email_verified) return res.status(403).json({ error: 'Email not verified' });

  const refreshJwt = await issueRefreshToken(user, req.ip, req.headers['user-agent']);
  res.json(pairTokens(user, refreshJwt));
});

/**
 * POST /auth/request-otp
 * Yêu cầu OTP cho mục đích 'login', 'reset_password', hoặc 'change_password'.
 */
r.post('/request-otp', otpLimiter, async (req, res) => {
  console.log('=== REQUEST OTP DEBUG ===');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  
  const p = RequestOtpSchema.safeParse(req.body);
  console.log('Schema parse result:', p);
  
  if (!p.success) {
    console.log('Validation errors:', p.error);
    return res.status(400).json({ error: 'Invalid payload', details: p.error.errors });
  }

  const { email, purpose, currentPassword } = p.data;
  console.log('Request OTP', email, purpose);
  // For change_password purpose, require authentication
  if (purpose === 'change_password') {
    const authHeader = req.headers.authorization;  
     console.log('Lmeo');  
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      const authUser = await User.findById(decoded.id);
      console.log('Lmao'); 
      if (!authUser || authUser.email !== email) {
        return res.status(401).json({ error: 'Invalid authentication or email mismatch' });
      }
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'Email not found' });

  const otp = genOTP();
  await OtpToken.create({
    email,
    otp,
    purpose,
    expires_at: addMs(OTP_TTL_MS),
  });

  const subjects = {
    login: 'ReVibe — Mã OTP đăng nhập',
    reset_password: 'ReVibe — Mã OTP đặt lại mật khẩu',
    change_password: 'ReVibe — Mã OTP thay đổi mật khẩu'
  };

  const messages = {
    login: 'Mã OTP đăng nhập của bạn',
    reset_password: 'Mã OTP để đặt lại mật khẩu',
    change_password: 'Mã OTP để thay đổi mật khẩu'
  };

  await sendMail({
    to: email,
    subject: subjects[purpose] || `ReVibe — OTP code (${purpose})`,
    html: `<p>${messages[purpose] || 'Mã OTP'}: <b>${otp}</b> (hết hạn sau ${Math.round(OTP_TTL_MS / 60000)} phút).</p>`,
  });

  res.json({ message: 'OTP sent to email' });
});

/**
 * POST /auth/verify-otp
 * Xác thực OTP cho login/reset (không dùng OTP verify_email).
 * Với login: phát hành access/refresh token.
 */
r.post('/verify-otp', otpLimiter, async (req, res) => {
  const p = VerifyOtpSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });

  const { email, otp } = p.data;
  const t = await OtpToken.findOne({
    email,
    purpose: { $in: ['login', 'reset_password'] },
    consumed_at: null,
  }).sort('-created_at');

  if (!t) return res.status(400).json({ error: 'OTP not found' });
  if (t.expires_at < new Date()) return res.status(400).json({ error: 'OTP expired' });
  if (t.otp !== otp) {
    t.attempts += 1;
    await t.save();
    return res.status(400).json({ error: 'OTP invalid' });
  }

  t.consumed_at = new Date();
  await t.save();

  // Login OTP → phát token
  const user = await User.findOne({ email });
  const refreshJwt = await issueRefreshToken(user, req.ip, req.headers['user-agent']);
  res.json(pairTokens(user, refreshJwt));
});

/**
 * POST /auth/refresh
 * Cấp mới access token từ refresh token (kiểm tra DB để tránh token đã revoke/hết hạn).
 */
r.post('/refresh', async (req, res) => {
  const p = RefreshSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });

  try {
    const payload = verifyRefresh(p.data.refresh_token);
    const rt = await RefreshToken.findOne({
      token: payload.jti,
      user_id: payload.sub,
      revoked_at: null,
    });
    if (!rt || rt.expires_at < new Date()) return res.status(401).json({ error: 'Refresh revoked/expired' });

    const user = await User.findById(payload.sub);
    const access_token = signAccess({ sub: String(user._id), role: user.role, email: user.email });
    res.json({ access_token });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

/**
 * POST /auth/logout
 * Revoke refresh token hiện tại.
 */
r.post('/logout', async (req, res) => {
  const p = LogoutSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });

  try {
    const payload = verifyRefresh(p.data.refresh_token);
    await RefreshToken.updateOne({ token: payload.jti }, { $set: { revoked_at: new Date() } });
  } catch {
    // ignore lỗi verify để tránh lộ thông tin
  }
  res.json({ message: 'Logged out' });
});

/**
 * GET /auth/me
 * Trả về hồ sơ gọn cho người dùng đang đăng nhập.
 */
r.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.sub);
  res.json({ user: sanitizeUser(user) });
});

/**
 * PUT /auth/profile
 * Cập nhật thông tin cơ bản của user (name, email).
 * Nếu đổi email sẽ đặt lại email_verified = false và gửi OTP xác minh mới.
 */
r.put('/profile', requireAuth, async (req, res) => {
  const p = UpdateProfileSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid payload' });

  const userId = req.user.sub;
  const updateData = {};
  const { name, email } = p.data;

  if (name) {
    updateData.name = name.trim();
  }

  if (email) {
    const emailTrimmed = email.trim().toLowerCase();
    
    // Check if email already exists (by another user)
    const existingUser = await User.findOne({ 
      email: emailTrimmed, 
      _id: { $ne: userId } 
    });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // If changing email, reset verification status
    const currentUser = await User.findById(userId);
    if (currentUser.email !== emailTrimmed) {
      updateData.email = emailTrimmed;
      updateData.email_verified = false;

      // Send new verification OTP
      const otp = genOTP();
      await OtpToken.create({
        email: emailTrimmed,
        otp,
        purpose: 'verify_email',
        expires_at: addMs(OTP_TTL_MS),
      });

      await sendMail({
        to: emailTrimmed,
        subject: 'ReVibe — Verify new email',
        html: `<p>Email của bạn đã được thay đổi. Mã xác minh mới: <b>${otp}</b> (hết hạn sau ${Math.round(
          OTP_TTL_MS / 60000
        )} phút).</p>`,
      });
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No data to update' });
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId, 
    { $set: updateData }, 
    { new: true }
  );

  res.json({ 
    user: sanitizeUser(updatedUser),
    message: email && updateData.email_verified === false 
      ? 'Profile updated. Please check your new email for verification OTP.'
      : 'Profile updated successfully'
  });
});

/**
 * POST /auth/change-password
 * Đổi mật khẩu với OTP xác minh (dành cho user đã đăng nhập).
 * User phải request OTP trước qua /auth/request-otp với purpose='change_password'.
 */
r.post('/change-password', requireAuth, otpLimiter, async (req, res) => {
  const p = ChangePasswordSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid payload' });

  const userId = req.user.sub;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { otp, new_password } = p.data;
  
  // Find OTP for change_password purpose
  const t = await OtpToken.findOne({
    email: user.email,
    purpose: 'change_password',
    consumed_at: null,
  }).sort('-created_at');

  if (!t) return res.status(400).json({ error: 'OTP not found. Please request a new OTP.' });
  if (t.expires_at < new Date()) return res.status(400).json({ error: 'OTP expired' });
  if (t.otp !== otp) {
    t.attempts += 1;
    await t.save();
    return res.status(400).json({ error: 'OTP invalid' });
  }

  // Consume OTP
  t.consumed_at = new Date();
  await t.save();

  // Update password
  await User.updateOne(
    { _id: userId }, 
    { $set: { password_hash: await hashPassword(new_password) } }
  );

  // Revoke all refresh tokens for security
  await RefreshToken.updateMany(
    { user_id: userId, revoked_at: null },
    { $set: { revoked_at: new Date() } }
  );

  res.json({ message: 'Password changed successfully. Please login again.' });
});

/**
 * POST /auth/reset-password
 * Đặt lại mật khẩu bằng OTP (đã yêu cầu qua /auth/request-otp với purpose=reset_password).
 */
r.post('/reset-password', otpLimiter, async (req, res) => {
  const p = ResetPasswordSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid' });

  const { email, otp, new_password } = p.data;
  const t = await OtpToken.findOne({
    email,
    purpose: 'reset_password',
    consumed_at: null,
  }).sort('-created_at');

  if (!t) return res.status(400).json({ error: 'OTP not found' });
  if (t.expires_at < new Date()) return res.status(400).json({ error: 'OTP expired' });
  if (t.otp !== otp) {
    t.attempts += 1;
    await t.save();
    return res.status(400).json({ error: 'OTP invalid' });
  }

  t.consumed_at = new Date();
  await t.save();

  await User.updateOne({ email }, { $set: { password_hash: await hashPassword(new_password) } });
  res.json({ message: 'Password updated' });
});

// Fake login
r.post("/fake-login", async (req, res) => {
  try {
    const email = (req.body && req.body.email) || "user2@example.com";
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        name: req.body?.name || "Nguyen Van A",
        password_hash: null,
        email_verified: true,
      });
    }

    const refreshJwt = await issueRefreshToken(user, req.ip, req.headers["user-agent"]);
    return res.json(pairTokens(user, refreshJwt));
  } catch (err) {
    console.error("fake-login error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// Fake register
r.post("/fake-register", async (req, res) => {
  try {
    const bodyEmail = req.body?.email;
    const bodyName = req.body?.name || "New User";

    // nếu client gửi password thì hash, nếu không thì tạo user dev không có password
    const password = req.body?.password || null;
    const existed = bodyEmail ? await User.findOne({ email: bodyEmail }) : null;
    let user;
    if (existed) {
      user = existed;
    } else {
      user = await User.create({
        email: bodyEmail || `dev+${Date.now()}@example.com`,
        name: bodyName,
        password_hash: password ? await hashPassword(password) : null,
        email_verified: true,
      });
    }

    const refreshJwt = await issueRefreshToken(user, req.ip, req.headers["user-agent"]);
    return res.status(201).json(pairTokens(user, refreshJwt));
  } catch (err) {
    console.error("fake-register error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default r;
