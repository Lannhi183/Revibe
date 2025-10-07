import jwt from "jsonwebtoken";
import dotenv from 'dotenv';

// Đảm bảo dotenv được load trước
dotenv.config();
const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_TTL = "1h",
  JWT_REFRESH_TTL = "7d",
} = process.env;

// if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
//   if (process.env.NODE_ENV === "production") {
//     throw new Error(
//       "JWT secrets are not set. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in env." + JWT_ACCESS_SECRET + "\n" + JWT_REFRESH_SECRET
//     );
//   } else {
//     console.warn(
//       "[jwt] WARNING: JWT_ACCESS_SECRET or JWT_REFRESH_SECRET not set — using dev fallback secrets. " + JWT_ACCESS_SECRET + "\n" + JWT_REFRESH_SECRET
//     );
//   }
// }

// Dev fallback (only used when env vars missing)
const ACCESS_KEY = JWT_ACCESS_SECRET || "dev_access_secret_change_me";
const REFRESH_KEY = JWT_REFRESH_SECRET || "dev_refresh_secret_change_me";

export function signAccess(payload) {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: JWT_ACCESS_TTL });
}
export function signRefresh(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_TTL });
}
export function verifyAccess(token) {
  return jwt.verify(token, JWT_ACCESS_SECRET);
}
export function verifyRefresh(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}
