const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const { requireAuth } = require("../middlewares/auth");
const moment = require("moment");

// ========== STUDENTS ==========
router.get("/", requireAuth, async (req, res) => {
  try {
    const { search, status } = req.query;
    const where = {};
    if (search)
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    if (status === "active") where.isActive = true;
    if (status === "inactive") where.isActive = false;

    const students = await prisma.student.findMany({
      where,
      include: {
        enrollments: {
          include: { class: { include: { instrument: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.render("students/index", {
      title: "Murid — AksaraNada",
      students,
      search,
      status,
      moment,
    });
  } catch (error) {
    req.flash("error", "Gagal memuat data murid.");
    res.redirect("/dashboard");
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        enrollments: {
          include: {
            class: { include: { instrument: true } },
            schedule: true,
            invoices: true,
          },
        },
      },
    });
    if (!student) {
      req.flash("error", "Murid tidak ditemukan.");
      return res.redirect("/students");
    }
    res.render("students/detail", { title: student.name, student, moment });
  } catch (error) {
    req.flash("error", "Gagal memuat data murid.");
    res.redirect("/students");
  }
});

router.patch("/:id/toggle", requireAuth, async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
    });
    await prisma.student.update({
      where: { id: req.params.id },
      data: { isActive: !student.isActive },
    });
    req.flash("success", "Status murid diperbarui.");
    res.redirect("/students");
  } catch (error) {
    req.flash("error", "Gagal memperbarui status.");
    res.redirect("/students");
  }
});

module.exports = router;
