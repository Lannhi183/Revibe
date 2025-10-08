import { Router } from 'express';
import { Listing } from '../models/Listing.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const r = Router();

// GET /admin/listings - List listings for admin với stats
r.get('/listings', asyncHandler(async (req, res) => {
  const {
    search,
    seller_id,
    status = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc',
    page = 1,
    limit = 10
  } = req.query;

  // Build query
  let query = {};
  if (search && search.trim()) {
    const searchTerm = search.trim().toLowerCase();
    query.$or = [
      { title: new RegExp(searchTerm, 'i') },
      { description: new RegExp(searchTerm, 'i') }
    ];
  }
  if (seller_id) query.seller_id = seller_id;
  if (status !== 'all') query.status = status;

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Get listings
  const listings = await Listing.find(query)
    .populate('seller_id', 'name email')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('-__v')
    .lean();

  const total = await Listing.countDocuments(query);

  // Get basic stats for the listing queue header
  const [
    totalAll,
    pendingCount,
    approvedCount,
    rejectedCount
  ] = await Promise.all([
    Listing.countDocuments(),
    Listing.countDocuments({ status: 'pending_review' }),
    Listing.countDocuments({ status: 'active' }),
    Listing.countDocuments({ status: 'rejected' })
  ]);

  // Format response similar to frontend expectation
  const formattedListings = listings.map(listing => ({
    id: listing._id,
    name: listing.title,
    description: listing.description,
    price: listing.price,
    image: listing.images?.[0] || '/placeholder.svg',
    images: listing.images || [],
    seller: listing.seller_id?.name || listing.seller_id?.email || 'Unknown',
    dateListed: listing.created_at,
    status: listing.status,
    declineReason: listing.moderation?.reason || null,
    hashtags: listing.attributes?.style_tags || listing.hashtags || []
  }));

  res.json({
    data: formattedListings,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    stats: {
      total: totalAll,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount
    }
  });
}));

// PUT /admin/listings/:id/approve - Approve a listing
r.put('/listings/:id/approve', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findByIdAndUpdate(
    id,
    {
      status: 'active',
      'moderation.state': 'approved',
      'moderation.reason': null,
      'moderation.reviewer_id': req.user.id,
      updated_at: new Date()
    },
    { new: true, runValidators: true }
  ).populate('seller_id', 'name email').select('-__v');

  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  res.json({
    data: {
      id: listing._id,
      status: listing.status,
      moderation: listing.moderation,
      seller: listing.seller_id?.name || listing.seller_id?.email || 'Unknown'
    },
    message: 'Listing approved successfully'
  });
}));

// PUT /admin/listings/:id/reject - Reject a listing với reason
r.put('/listings/:id/reject', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  const listing = await Listing.findByIdAndUpdate(
    id,
    {
      status: 'rejected',
      'moderation.state': 'rejected',
      'moderation.reason': reason.trim(),
      'moderation.reviewer_id': req.user.id,
      updated_at: new Date()
    },
    { new: true, runValidators: true }
  ).populate('seller_id', 'name email').select('-__v');

  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  res.json({
    data: {
      id: listing._id,
      status: listing.status,
      moderation: listing.moderation,
      seller: listing.seller_id?.name || listing.seller_id?.email || 'Unknown'
    },
    message: 'Listing rejected successfully'
  });
}));

// GET /admin/listings/:id - Get detailed listing info
r.get('/listings/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id)
    .populate('seller_id', 'name email avatar_url')
    .select('-__v');

  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  // Format response for detail modal
  const formatted = {
    id: listing._id,
    name: listing.title,
    description: listing.description,
    price: listing.price,
    images: listing.images,
    seller: listing.seller_id?.name || 'Unknown',
    dateListed: listing.created_at,
    status: listing.status,
    declineReason: listing.moderation?.reason || null,
    attributes: listing.attributes,
    hashtags: listing.attributes?.style_tags || listing.hashtags || []
  };

  res.json({ data: formatted });
}));

export default r;
