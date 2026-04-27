const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash("error", "Silakan login terlebih dahulu.");
    return res.redirect("/auth/login");
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    req.flash("error", "Silakan login terlebih dahulu.");
    return res.redirect("/auth/login");
  }
  if (req.session.user.role !== "ADMIN") {
    req.flash("error", "Anda tidak memiliki akses ke halaman ini.");
    return res.redirect("/dashboard");
  }
  next();
};

const redirectIfAuth = (req, res, next) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  next();
};

module.exports = { requireAuth, requireAdmin, redirectIfAuth };
