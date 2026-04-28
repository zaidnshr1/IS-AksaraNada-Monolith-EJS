const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const { requireAuth, requireAdmin } = require("../middlewares/auth");
const { body } = require("express-validator");
const { handleValidationErrors } = require("../middlewares/validation");

router.get("/", requireAuth, async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      include: {
        instrument: true,
        classLocations: true,
        teacherClasses: { include: { teacher: true } },
        enrollments: { where: { status: "ACTIVE" } },
      },
      orderBy: { name: "asc" },
    });
    const instruments = await prisma.instrument.findMany({
      orderBy: { name: "asc" },
    });
    res.render("classes/index", {
      title: "Kelas — AksaraNada",
      classes,
      instruments,
    });
  } catch (error) {
    req.flash("error", "Gagal memuat kelas.");
    res.redirect("/dashboard");
  }
});

router.post(
  "/",
  requireAdmin,
  [
    body("name").trim().notEmpty().withMessage("Nama kelas wajib diisi"),
    body("instrumentId")
      .trim()
      .notEmpty()
      .withMessage("Instrumen wajib dipilih"),
    body("pricePerMonth").isFloat({ min: 0 }).withMessage("Harga tidak valid"),
    body("duration").isInt({ min: 15 }).withMessage("Durasi minimal 15 menit"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        name,
        instrumentId,
        description,
        pricePerMonth,
        duration,
        maxStudents,
        groupLink,
        locations,
      } = req.body;
      const locs = Array.isArray(locations)
        ? locations
        : locations
          ? [locations]
          : [];

      const newClass = await prisma.class.create({
        data: {
          name: name.trim(),
          instrumentId,
          description: description?.trim() || null,
          pricePerMonth: parseFloat(pricePerMonth),
          duration: parseInt(duration),
          maxStudents: parseInt(maxStudents) || 10,
          groupLink: groupLink?.trim() || null,
          classLocations: {
            create: locs.map((type) => ({ type })),
          },
        },
      });

      req.flash("success", "Kelas berhasil dibuat.");
      res.redirect("/classes");
    } catch (error) {
      req.flash("error", "Gagal membuat kelas.");
      res.redirect("/classes");
    }
  },
);

router.patch("/:id/toggle", requireAdmin, async (req, res) => {
  try {
    const c = await prisma.class.findUnique({ where: { id: req.params.id } });
    await prisma.class.update({
      where: { id: req.params.id },
      data: { isActive: !c.isActive },
    });
    req.flash("success", "Status kelas diperbarui.");
    res.redirect("/classes");
  } catch (error) {
    req.flash("error", "Gagal memperbarui status kelas.");
    res.redirect("/classes");
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.class.delete({ where: { id: req.params.id } });
    req.flash("success", "Kelas berhasil dihapus.");
    res.redirect("/classes");
  } catch (error) {
    req.flash(
      "error",
      "Gagal menghapus kelas (mungkin masih ada murid terdaftar).",
    );
    res.redirect("/classes");
  }
});

// POST /classes/:id/assign-teacher
router.post("/:id/assign-teacher", requireAdmin, async (req, res) => {
  try {
    const { teacherId } = req.body;
    await prisma.teacherClass.upsert({
      where: { teacherId_classId: { teacherId, classId: req.params.id } },
      create: { teacherId, classId: req.params.id },
      update: {},
    });
    req.flash("success", "Guru berhasil ditugaskan.");
    res.redirect("/classes");
  } catch (error) {
    req.flash("error", "Gagal menugaskan guru.");
    res.redirect("/classes");
  }
});

// GET /instruments
router.get("/instruments", requireAdmin, async (req, res) => {
  try {
    const instruments = await prisma.instrument.findMany({
      orderBy: { name: "asc" },
    });
    res.render("classes/instruments", { title: "Instrumen", instruments });
  } catch (error) {
    req.flash("error", "Gagal memuat instrumen.");
    res.redirect("/classes");
  }
});

router.post(
  "/instruments",
  requireAdmin,
  [body("name").trim().notEmpty().withMessage("Nama instrumen wajib diisi")],
  handleValidationErrors,
  async (req, res) => {
    try {
      await prisma.instrument.create({
        data: {
          name: req.body.name.trim(),
          description: req.body.description?.trim() || null,
        },
      });
      req.flash("success", "Instrumen berhasil ditambahkan.");
      res.redirect("/classes/instruments");
    } catch (error) {
      if (error.code === "P2002") req.flash("error", "Instrumen sudah ada.");
      else req.flash("error", "Gagal menambahkan instrumen.");
      res.redirect("/classes/instruments");
    }
  },
);

module.exports = router;
