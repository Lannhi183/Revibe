import { Router } from 'express';
import authRoutes from './auth.routes.js';
import addressRoutes from './address.routes.js';
import listingRoutes from './listings.routes.js';
import categoriesRoutes from './categories.routes.js';
import cartRoutes from './cart.routes.js';
import orderRoutes from './orders.routes.js';
import chatRoutes from './chat.routes.js';
import notificationRoutes from './notifications.routes.js';
import contentRoutes from './content.routes.js';
import reportRoutes from './reports.routes.js';
import devRoutes from './dev.routes.js';
import adminRoutes from './admin.routes.js';
// import addressRoutes from './address.routes.js';

const r = Router();

// mount routes
r.use('/auth', authRoutes);
r.use('/address', addressRoutes);
r.use('/listings', listingRoutes);
r.use('/categories', categoriesRoutes);
r.use('/cart', cartRoutes);
r.use('/orders', orderRoutes);
r.use('/chat', chatRoutes);
r.use('/notifications', notificationRoutes);
r.use('/content', contentRoutes);
r.use('/reports', reportRoutes);
r.use('/addresses', addressRoutes);
r.use('/admin', adminRoutes);

if (process.env.NODE_ENV !== 'production') {
  r.use('/dev', devRoutes);
}

export default r;
