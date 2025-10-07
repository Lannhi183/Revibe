export const ok = (res, data, meta) => res.json({ data, meta: meta || null });
export const created = (res, data) => res.status(201).json({ data });