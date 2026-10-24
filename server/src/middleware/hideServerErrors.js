// Some older controllers answer failures with res.status(500).json({ message:
// error.message }), which would show database internals to users. In
// production every 5xx body is replaced with a plain message, and the original
// is written to the server log instead.
export const hideServerErrors = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500) {
      console.error(`[${res.statusCode}] ${req.method} ${req.originalUrl}:`, body?.message ?? body?.error ?? body);
      return json({ success: false, message: 'Something went wrong on our side. Please try again.' });
    }
    return json(body);
  };
  next();
};
