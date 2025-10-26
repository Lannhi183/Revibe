import { Router } from 'express';
import { Category } from '../models/Category.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { ok } from '../utils/response.js';

const r = Router();

// GET /categories - Public endpoint for active categories
r.get('/', asyncHandler(async (req, res) => {
  const {
    type,
    limit = 50,
    sortBy = 'name',
    sortOrder = 'asc'
  } = req.query;

  // Build query - only show active categories for public
  let query = { status: 'active' };
  
  if (type && type !== 'all') {
    query.type = type;
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query
  const categories = await Category.find(query)
    .sort(sort)
    .limit(parseInt(limit))
    .select('name slug type image status created_at'); // Only select needed fields for public

  ok(res, categories);
}));

// GET /categories/:id - Get single category by ID
r.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const category = await Category.findOne({ 
    _id: id, 
    status: 'active' 
  }).select('name slug type image status created_at');

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  ok(res, category);
}));

export default r;