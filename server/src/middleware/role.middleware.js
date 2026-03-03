export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return next();
};

export const isBarber = requireRole("barber");
export const isCustomer = requireRole("customer");
export const isAdmin = requireRole("admin");
