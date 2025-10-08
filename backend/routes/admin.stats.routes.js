import { Router } from 'express';
import { User } from '../models/User.js';
import { Listing } from '../models/Listing.js';
import { Order } from '../models/Order.js';
import { Review } from '../models/Review.js';
import { KpiDaily } from '../models/KpiDaily.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const r = Router();

// GET /admin/stats/overview - Overview statistics
r.get('/stats/overview', asyncHandler(async (req, res) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Overview stats
  const [
    totalUsers,
    activeListings,
    ordersToday,
    revenueToday
  ] = await Promise.all([
    User.countDocuments({ is_deleted: false }), // Total users
    Listing.countDocuments({ status: 'active' }), // Active listings
    Order.countDocuments({
      created_at: { $gte: today },
      order_status: { $ne: 'canceled' }
    }), // Orders today
    Order.aggregate([
      { $match: {
        created_at: { $gte: today },
        order_status: { $ne: 'canceled' },
        payment_status: 'paid'
      }},
      { $group: { _id: null, total: { $sum: '$amounts.total' } } }
    ]) // Revenue today
  ]);

  const revenue = revenueToday.length > 0 ? revenueToday[0].total : 0;

  res.json({
    data: {
      totalUsers,
      activeListings,
      ordersToday,
      revenueToday: revenue
    }
  });
}));

// GET /admin/stats/charts - Charts data (week data)
r.get('/stats/charts', asyncHandler(async (req, res) => {
  const now = new Date();

  // Get last 7 days data
  const weekData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    weekData.push({ date: startOfDay, dayName: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][startOfDay.getDay()] });
  }

  // Orders count for each day
  const ordersWeek = await Promise.all(
    weekData.map(async (day) => {
      const nextDay = new Date(day.date);
      nextDay.setDate(nextDay.getDate() + 1);

      const count = await Order.countDocuments({
        created_at: { $gte: day.date, $lt: nextDay },
        order_status: { $ne: 'canceled' }
      });

      return { name: day.dayName, orders: count };
    })
  );

  // Revenue for each day (paid orders)
  const revenueWeek = await Promise.all(
    weekData.map(async (day) => {
      const nextDay = new Date(day.date);
      nextDay.setDate(nextDay.getDate() + 1);

      const result = await Order.aggregate([
        {
          $match: {
            created_at: { $gte: day.date, $lt: nextDay },
            order_status: { $ne: 'canceled' },
            payment_status: 'paid'
          }
        },
        { $group: { _id: null, revenue: { $sum: '$amounts.total' } } }
      ]);

      return { name: day.dayName, revenue: result.length > 0 ? result[0].revenue : 0 };
    })
  );

  res.json({
    data: {
      ordersWeek,
      revenueWeek
    }
  });
}));

// GET /admin/stats/listings-pie - Pie chart data for listings status
r.get('/stats/listings-pie', asyncHandler(async (req, res) => {
  const total = await Listing.countDocuments();

  const stats = await Listing.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Format for pie chart (map status to labels)
  const statusMap = {
    active: 'Đã duyệt',
    pending_review: 'Chờ duyệt',
    rejected: 'Từ chối',
    sold: 'Đã bán',
    paused: 'Tạm dừng',
    draft: 'Nháp',
    removed: 'Đã gỡ'
  };

  const pieData = stats.map(stat => ({
    name: statusMap[stat._id] || stat._id,
    value: stat.count
  }));

  // Ensure we always have the top 3 categories even if count is 0
  if (!pieData.find(item => item.name === 'Đã duyệt')) pieData.push({ name: 'Đã duyệt', value: 0 });
  if (!pieData.find(item => item.name === 'Chờ duyệt')) pieData.push({ name: 'Chờ duyệt', value: 0 });
  if (!pieData.find(item => item.name === 'Từ chối')) pieData.push({ name: 'Từ chối', value: 0 });

  res.json({
    data: {
      pieData,
      total
    }
  });
}));

// GET /admin/stats/top-sellers - Top sellers của tuần
r.get('/stats/top-sellers', asyncHandler(async (req, res) => {
  const now = new Date();
  const weekAgo = new Date(now.setDate(now.getDate() - 7));

  const topSellers = await Order.aggregate([
    {
      $match: {
        created_at: { $gte: weekAgo },
        order_status: { $ne: 'canceled' }
      }
    },
    {
      $group: {
        _id: '$seller_id',
        sales: { $sum: 1 },
        revenue: { $sum: '$amounts.total' }
      }
    },
    { $sort: { sales: -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        name: '$user.name',
        avatar: '$user.avatar_url',
        sales: 1,
        revenue: 1
      }
    }
  ]);

  const topSeller = topSellers.length > 0 ? topSellers[0] : null;

  res.json({ data: topSeller });
}));

// GET /admin/stats/pending-products - Sản phẩm chờ duyệt (limit 5)
r.get('/stats/pending-products', asyncHandler(async (req, res) => {
  const pendingProducts = await Listing.find({
    status: 'pending_review'
  })
  .populate('seller_id', 'name email')
  .sort({ created_at: -1 })
  .limit(5)
  .select('title price images description seller_id created_at')
  .lean();

  const formatted = pendingProducts.map(product => ({
    id: product._id,
    name: product.title,
    price: product.price,
    image: product.images?.[0] || '/placeholder.svg',
    description: product.description || '',
    seller: product.seller_id?.name || 'Unknown'
  }));

  res.json({ data: formatted });
}));

// GET /admin/stats/low-feedback - Low ratings (3 stars and below)
r.get('/stats/low-feedback', asyncHandler(async (req, res) => {
  const lowFeedback = await Review.find({
    rating: { $lte: 3 }
  })
  .populate('author_user_id', 'name avatar_url')
  .sort({ created_at: -1 })
  .limit(5)
  .select('rating comment author_user_id')
  .lean();

  const formatted = lowFeedback.map(review => ({
    id: review._id,
    user: review.author_user_id?.name || 'Anonymous',
    avatar: review.author_user_id?.avatar_url || '',
    rating: review.rating,
    comment: review.comment || ''
  }));

  res.json({ data: formatted });
}));

export default r;
