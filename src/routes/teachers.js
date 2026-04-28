const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const { requireAuth, requireAdmin } = require("../middlewares/auth");
const { body } = require("express-validator");
const { handleValidationErrors } = require("../middlewares/validation");
const moment = require("moment");

router.get("/", requireAuth, async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        instruments: true,
        teacherClasses: {
          include: { class: { include: { instrument: true } } },
        },
        schedules: true,
      },
      orderBy: { name: "asc" },
    });
    const applications = await prisma.teacherApplication.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    res.render("teachers/index", {
      title: "Guru — AksaraNada",
      teachers,
      applications,
      moment,
    });
  } catch (error) {
    req.flash("error", "Gagal memuat data guru.");
    res.redirect("/dashboard");
  }
});

router.get("/applications", requireAuth, async (req, res) => {
  try {
    const applications = await prisma.teacherApplication.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.render("teachers/applications", {
      title: "Lamaran Guru",
      applications,
      moment,
    });
  } catch (error) {
    req.flash("error", "Gagal memuat lamaran.");
    res.redirect("/teachers");
  }
});

router.post("/applications/:id/approve", requireAdmin, async (req, res) => {
  try {
    const app = await prisma.teacherApplication.findUnique({
      where: { id: req.params.id },
    });
    if (!app) {
      req.flash("error", "Lamaran tidak ditemukan.");
      return res.redirect("/teachers/applications");
    }

    await prisma.teacherApplication.update({
      where: { id: req.params.id },
      data: { status: "APPROVED" },
    });

    await prisma.teacher.create({
      data: {
        name: app.name,
        email: app.email,
        phone: app.phone,
        experience: app.experience,
        cvPath: app.cvPath,
        isApproved: true,
      },
    });

    req.flash("success", "Lamaran disetujui dan guru berhasil ditambahkan.");
    res.redirect("/teachers/applications");
  } catch (error) {
    req.flash("error", "Gagal menyetujui lamaran.");
    res.redirect("/teachers/applications");
  }
});

router.post("/applications/:id/reject", requireAdmin, async (req, res) => {
  try {
    await prisma.teacherApplication.update({
      where: { id: req.params.id },
      data: { status: "REJECTED" },
    });
    req.flash("success", "Lamaran ditolak.");
    res.redirect("/teachers/applications");
  } catch (error) {
    req.flash("error", "Gagal menolak lamaran.");
    res.redirect("/teachers/applications");
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: req.params.id },
      include: {
        instruments: true,
        teacherClasses: {
          include: { class: { include: { instrument: true } } },
        },
        schedules: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
      },
    });
    if (!teacher) {
      req.flash("error", "Guru tidak ditemukan.");
      return res.redirect("/teachers");
    }
    const allClasses = await prisma.class.findMany({
      where: { isActive: true },
      include: { instrument: true },
    });
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    res.render("teachers/detail", {
      title: teacher.name,
      teacher,
      allClasses,
      days,
      moment,
    });
  } catch (error) {
    req.flash("error", "Gagal memuat detail guru.");
    res.redirect("/teachers");
  }
});

router.patch("/:id/toggle", requireAuth, async (req, res) => {
  try {
    const t = await prisma.teacher.findUnique({ where: { id: req.params.id } });
    await prisma.teacher.update({
      where: { id: req.params.id },
      data: { isActive: !t.isActive },
    });
    req.flash("success", "Status guru diperbarui.");
    res.redirect("/teachers");
  } catch (error) {
    req.flash("error", "Gagal memperbarui status.");
    res.redirect("/teachers");
  }
});

module.exports = router;
