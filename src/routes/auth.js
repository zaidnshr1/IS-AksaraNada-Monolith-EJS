const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const prisma = require("../config/database");
const { redirectIfAuth, requireAdmin } = require("../middlewares/auth");
const {
  loginRules,
  handleValidationErrors,
} = require("../middlewares/validation");
const { body } = require("express-validator");

// GET /auth/login
router.get("/login", redirectIfAuth, (req, res) => {
  res.render("auth/login", { title: "Login — AksaraNada Internal" });
});

// POST /auth/login
router.post(
  "/login",
  redirectIfAuth,
  loginRules,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !user.isActive) {
        req.flash("error", "Email atau password salah.");
        return res.redirect("/auth/login");
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        req.flash("error", "Email atau password salah.");
        return res.redirect("/auth/login");
      }

      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGIN",
          entity: "User",
          entityId: user.id,
          details: "User logged in",
          ipAddress: req.ip,
        },
      });

      req.flash("success", `Selamat datang, ${user.name}!`);
      res.redirect("/dashboard");
    } catch (error) {
      console.error(error);
      req.flash("error", "Terjadi kesalahan server.");
      res.redirect("/auth/login");
    }
  },
);

// POST /auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/auth/login");
});

// GET /auth/users (Admin only - manage accounts)
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.render("auth/users", { title: "Manajemen Akun", users });
  } catch (error) {
    req.flash("error", "Gagal memuat data pengguna.");
    res.redirect("/dashboard");
  }
});

// POST /auth/users (Admin only - create account)
router.post(
  "/users",
  requireAdmin,
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Nama wajib diisi")
      .isLength({ min: 2, max: 100 }),
    body("email")
      .trim()
      .isEmail()
      .withMessage("Email tidak valid")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password minimal 8 karakter")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage("Password harus ada huruf besar, kecil, dan angka"),
    body("role").isIn(["ADMIN", "STAFF"]).withMessage("Role tidak valid"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, email, password, role, phone } = req.body;

      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        req.flash("error", "Email sudah terdaftar.");
        return res.redirect("/auth/users");
      }

      const hashed = await bcrypt.hash(
        password,
        parseInt(process.env.BCRYPT_ROUNDS) || 12,
      );
      await prisma.user.create({
        data: { name, email, password: hashed, role, phone },
      });

      req.flash("success", `Akun ${name} berhasil dibuat.`);
      res.redirect("/auth/users");
    } catch (error) {
      console.error(error);
      req.flash("error", "Gagal membuat akun.");
      res.redirect("/auth/users");
    }
  },
);

// DELETE /auth/users/:id
router.delete("/users/:id", requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.session.user.id) {
      req.flash("error", "Tidak bisa menghapus akun sendiri.");
      return res.redirect("/auth/users");
    }
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    req.flash("success", "Akun berhasil dinonaktifkan.");
    res.redirect("/auth/users");
  } catch (error) {
    req.flash("error", "Gagal menonaktifkan akun.");
    res.redirect("/auth/users");
  }
});

module.exports = router;
