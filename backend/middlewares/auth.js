import { verifyAccess } from "../utils/jwt.js";
export function requireAuth(req, res, next) {
const h = req.headers.authorization || '';
const token = h.startsWith('Bearer ') ? h.slice(7) : null;
// console.log('Auth header:', h);
// console.log('Extracted token:', token);

if (!token) return res.status(401).json({ error: 'Missing bearer token' });
try {
  const decoded = verifyAccess(token);
  // console.log('Decoded JWT:', decoded);

  req.user = { ...decoded, id: decoded.sub }; // Add id field for convenience
  // console.log('req.user set to:', req.user);

  next();
}
catch (error) {
  console.log('JWT verification error:', error);
  return res.status(401).json({ error: 'Invalid or expired token' });
}
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthenticated" });
    if (req.user.role !== role)
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
};

// Admin role required (admin or moderator)
export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });
  if (req.user.role !== 'admin' && req.user.role !== 'moderator')
    return res.status(403).json({ error: "Admin access required" });
  next();
};
