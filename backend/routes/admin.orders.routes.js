import { Router } from 'express';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { Listing } from '../models/Listing.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const r = Router();

// GET /admin/orders - List all orders with filters and populated data
r.get('/orders', asyncHandler(async (req, res) => {
  const {
    status = 'all',
    buyerId,
    sellerId,
    search,
    startDate,
    endDate,
    sortBy = 'created_at',
    sortOrder = 'desc',
    page = 1,
    limit = 20
  } = req.query;

  // Build query
  let query = {};
  if (status !== 'all') query.order_status = status;
  if (buyerId) query.buyer_id = buyerId;
  if (sellerId) query.seller_id = sellerId;
  if (search && search.trim()) {
    // Search by order ID or buyer/seller name
    const searchTerm = search.trim().toLowerCase();
    // This would require looking up user names - simplified for now
    // In real implementation, you might want to populate first
  }

  // Date range filter
  if (startDate || endDate) {
    query.created_at = {};
    if (startDate) query.created_at.$gte = new Date(startDate);
    if (endDate) query.created_at.$lte = new Date(endDate);
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Get orders with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('buyer_id', 'name email')
    .populate('seller_id', 'name email')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .select('order_status payment_status amounts buyer_id seller_id created_at admin_paid_confirmed')
    .lean();

  // Get stats
  const stats = await Order.aggregate([
    {
      $group: {
        _id: '$order_status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Format stats
  const statusStats = {};
  stats.forEach(stat => {
    statusStats[stat._id] = stat.count;
  });

  const formattedOrders = orders.map(order => ({
    id: order._id,
    orderId: order._id.toString().slice(-8).toUpperCase(),
    buyer: order.buyer_id?.name || order.buyer_id?.email || 'Unknown',
    seller: Array.isArray(order.seller_id)
      ? order.seller_id.map(s => s?.name || s?.email).join(', ')
      : order.seller_id?.name || order.seller_id?.email || 'Unknown',
    status: order.order_status,
    paymentStatus: order.payment_status,
    total: order.amounts?.total || 0,
    currency: order.currency,
    adminPaidConfirmed: order.admin_paid_confirmed,
    createdAt: order.created_at,
  }));

  res.json({
    data: formattedOrders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    stats: {
      total: total,
      ...statusStats
    }
  });
}));

// GET /admin/orders/:id - Get detailed order info with full populated data
r.get('/orders/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id)
    .populate('buyer_id', 'name email avatar_url phone_number')
    .populate('seller_id', 'name email avatar_url phone_number')
    .exec();

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Populate listing details for each item
  const itemsWithDetails = await Promise.all(order.items.map(async (item) => {
    const listing = await Listing.findById(item.listing_id)
      .populate('seller_id', 'name email')
      .select('title images price attributes')
      .lean();

    return {
      ...item.toObject(),
      listing: listing ? {
        id: listing._id,
        title: listing.title,
        images: listing.images,
        price: listing.price,
        attributes: listing.attributes,
        seller: listing.seller_id
      } : null
    };
  }));

  // Format response
  const formattedOrder = {
    id: order._id,
    orderId: order._id.toString().slice(-8).toUpperCase(),
    buyer: {
      id: order.buyer_id?._id,
      name: order.buyer_id?.name || 'Unknown',
      email: order.buyer_id?.email,
      avatar: order.buyer_id?.avatar_url,
      phone: order.buyer_id?.phone_number
    },
    seller: Array.isArray(order.seller_id)
      ? order.seller_id.map(s => ({
          id: s?._id,
          name: s?.name || 'Unknown',
          email: s?.email,
          avatar: s?.avatar_url,
          phone: s?.phone_number
        }))
      : [{
          id: order.seller_id?._id,
          name: order.seller_id?.name || 'Unknown',
          email: order.seller_id?.email,
          avatar: order.seller_id?.avatar_url,
          phone: order.seller_id?.phone_number
        }],
    status: order.order_status,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    shippingStatus: order.shipping_status,
    adminPaidConfirmed: order.admin_paid_confirmed,
    shippingAddress: order.shipping_address,
    amounts: order.amounts,
    currency: order.currency,
    items: itemsWithDetails,
    notes: order.notes,
    history: order.history,
    createdAt: order.created_at,
    updatedAt: order.updated_at
  };

  res.json({ data: formattedOrder });
}));

// POST /admin/orders/:id/mark-paid - Admin confirms payout to seller
r.post('/orders/:id/mark-paid', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  const order = await Order.findById(id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Only allow for completed orders
  if (order.order_status !== 'completed') {
    return res.status(400).json({
      error: 'Can only mark paid for completed orders',
      currentStatus: order.order_status
    });
  }

  // Check if already confirmed
  if (order.admin_paid_confirmed) {
    return res.status(400).json({ error: 'Order already marked as paid' });
  }

  // Update order and add to history
  order.admin_paid_confirmed = true;
  order.history = order.history || [];
  order.history.push({
    at: new Date(),
    by: req.user?.sub,
    action: 'admin_mark_paid',
    from: order.admin_paid_confirmed.toString(),
    to: 'true',
    note: note || 'Admin confirmed payout to seller'
  });

  await order.save();

  res.json({
    data: {
      id: order._id,
      adminPaidConfirmed: order.admin_paid_confirmed,
      updatedAt: order.updated_at
    },
    message: 'Order marked as paid successfully'
  });
}));

export default r;
