import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import adminCategoriesRoutes from './admin.categories.routes.js';
import adminUsersRoutes from './admin.users.routes.js';
import adminStatsRoutes from './admin.stats.routes.js';
import adminListingsRoutes from './admin.listings.routes.js';
import adminOrdersRoutes from './admin.orders.routes.js';

const r = Router();

// Apply admin auth to all admin routes
r.use(requireAuth);
r.use(requireAdmin);

// Mount admin sub-routes
r.use(adminCategoriesRoutes);
r.use(adminUsersRoutes);
r.use(adminStatsRoutes);
r.use(adminListingsRoutes);
r.use(adminOrdersRoutes);
export default r;
