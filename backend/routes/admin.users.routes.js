import { Router } from 'express';
import { User } from '../models/User.js';
import { coerceToObjectId } from '../utils/idCoerce.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const r = Router();

// GET /admin/users - List users với filter
r.get('/users', asyncHandler(async (req, res) => {
  const {
    search,
    status = 'all',
    badge,
    sortBy = 'join_date',
    sortOrder = 'desc',
    page = 1,
    limit = 10
  } = req.query;

  // Build query
  let query = { is_deleted: false };
  if (search && search.trim()) {
    const searchTerm = search.trim().toLowerCase();
    query.$or = [
      { name: new RegExp(searchTerm, 'i') },
      { email: new RegExp(searchTerm, 'i') },
      { _id: coerceToObjectId(searchTerm) ? coerceToObjectId(searchTerm) : undefined }
    ].filter(Boolean); // Remove undefined values
  }

  if (status !== 'all') {
    query.is_banned = status === 'banned';
  }

  if (badge && badge !== 'all') {
    query.badges = badge;
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query
  const users = await User.find(query)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('banned_by', 'name email')
    .select('-password_hash -__v');

  const total = await User.countDocuments(query);

  res.json({
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// PUT /admin/users/:id/ban - Ban or unban a user
r.put('/users/:id/ban', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { ban = true, reason } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.role === 'admin') {
    return res.status(403).json({ error: 'Cannot ban admin users' });
  }

  if (ban) {
    // Ban user
    user.is_banned = true;
    user.banned_reason = reason || 'Banned by admin';
    user.banned_at = new Date();
    user.banned_by = req.user.id; // Admin who banned
  } else {
    // Unban user
    user.is_banned = false;
    user.banned_reason = null;
    user.banned_at = null;
    user.banned_by = null;
  }

  user.updated_at = new Date();
  await user.save();

  // Populate banned_by for response
  await user.populate('banned_by', 'name email');

  res.json({
    data: user,
    message: ban ? 'User banned successfully' : 'User unbanned successfully'
  });
}));

// PUT /admin/users/:id/badges - Update user badges
r.put('/users/:id/badges', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { badges } = req.body; // Array of badge strings

  if (!Array.isArray(badges)) {
    return res.status(400).json({ error: 'Badges must be an array' });
  }

  // Validate badges
  const validBadges = ['verified', 'top_seller', 'premium'];
  const invalidBadges = badges.filter(badge => !validBadges.includes(badge));
  if (invalidBadges.length > 0) {
    return res.status(400).json({
      error: `Invalid badges: ${invalidBadges.join(', ')}. Valid badges: ${validBadges.join(', ')}`
    });
  }

  const user = await User.findByIdAndUpdate(
    id,
    { badges, updated_at: new Date() },
    { new: true, runValidators: true }
  ).select('-password_hash -__v');

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ data: user, message: 'User badges updated successfully' });
}));

// POST /admin/users/:id/badges - Add a specific badge
r.post('/users/:id/badges/:badge', asyncHandler(async (req, res) => {
  const { id, badge } = req.params;

  const validBadges = ['verified', 'top_seller', 'premium'];
  if (!validBadges.includes(badge)) {
    return res.status(400).json({
      error: `Invalid badge. Valid badges: ${validBadges.join(', ')}`
    });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!user.badges.includes(badge)) {
    user.badges.push(badge);
    user.updated_at = new Date();
    await user.save();
  }

  res.json({ data: user, message: `Badge '${badge}' added to user` });
}));

// DELETE /admin/users/:id/badges/:badge - Remove a specific badge
r.delete('/users/:id/badges/:badge', asyncHandler(async (req, res) => {
  const { id, badge } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.badges = user.badges.filter(b => b !== badge);
  user.updated_at = new Date();
  await user.save();

  res.json({ data: user, message: `Badge '${badge}' removed from user` });
}));

export default r;
