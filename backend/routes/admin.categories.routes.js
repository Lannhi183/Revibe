import { Router } from 'express';
import { Category } from '../models/Category.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const r = Router();

// Helper function để tạo slug từ tên
const toSlug = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// GET /admin/categories - List categories với filter
r.get('/categories', asyncHandler(async (req, res) => {
  const {
    search,
    type,
    status,
    sortBy = 'created_at',
    sortOrder = 'desc',
    page = 1,
    limit = 50
  } = req.query;

  // Build query
  let query = {};
  if (search && search.trim()) {
    const searchTerm = search.trim().toLowerCase();
    query.$or = [
      { name: new RegExp(searchTerm, 'i') },
      { slug: new RegExp(searchTerm, 'i') },
      { type: new RegExp(searchTerm, 'i') }
    ];
  }
  if (type && type !== 'all') query.type = type;
  if (status && status !== 'all') query.status = status;

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query
  const categories = await Category.find(query)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('-__v');

  const total = await Category.countDocuments(query);

  res.json({
    data: categories,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// POST /admin/categories - Create new category
r.post('/categories', asyncHandler(async (req, res) => {
  const { type, name, description, status = 'active', color = '#0d6efd' } = req.body;

  if (!type || !name || !name.trim()) {
    return res.status(400).json({ error: 'Type and name are required' });
  }

  const slug = toSlug(name);

  // Check uniqueness within type
  const existing = await Category.findOne({ slug, type });
  if (existing) {
    return res.status(400).json({ error: 'Category with this slug already exists for this type' });
  }

  const category = new Category({
    type,
    name: name.trim(),
    slug,
    description: description?.trim(),
    status,
    color
  });

  await category.save();
  res.status(201).json({ data: category });
}));

// PUT /admin/categories/:id - Update category
r.put('/categories/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, name, description, status, color } = req.body;

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  if (name && name.trim()) {
    const newSlug = toSlug(name);

    // Check slug uniqueness if type or name changed
    if (name !== category.name || type !== category.type) {
      const existing = await Category.findOne({
        slug: newSlug,
        type: type || category.type,
        _id: { $ne: id }
      });
      if (existing) {
        return res.status(400).json({ error: 'Category with this slug already exists for this type' });
      }
      category.name = name.trim();
      category.slug = newSlug;
    }
  }

  if (type !== undefined && type !== category.type) {
    // Check uniqueness when changing type
    const existing = await Category.findOne({
      slug: category.slug,
      type,
      _id: { $ne: id }
    });
    if (existing) {
      return res.status(400).json({ error: 'Category with this slug already exists for this type' });
    }
    category.type = type;
  }

  if (description !== undefined) category.description = description?.trim();
  if (status !== undefined) category.status = status;
  if (color !== undefined) category.color = color;

  category.updated_at = new Date();
  await category.save();

  res.json({ data: category });
}));

// DELETE /admin/categories/:id - Delete category
r.delete('/categories/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  res.json({ message: 'Category deleted successfully' });
}));

export default r;
