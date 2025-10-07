export const validate = (schema) => (req, _res, next) => {
  const data = { body: req.body, params: req.params, query: req.query };
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    const e = new Error(msg);
    e.status = 400;
    return next(e);
  }
  req.input = parsed.data;
  next();
};
