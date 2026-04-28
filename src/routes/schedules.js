const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const { requireAuth } = require("../middlewares/auth");
const { body } = require("express-validator");
const { handleValidationErrors } = require("../middlewares/validation");

const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

router.get("/", requireAuth, async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      where: { isActive: true, isApproved: true },
      include: {
        schedules: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
        teacherClasses: {
          include: { class: { include: { instrument: true } } },
        },
      },
      orderBy: { name: "asc" },
    });
    res.render("schedules/index", {
      title: "Jadwal Guru — AksaraNada",
      teachers,
      days,
    });
  } catch (error) {
    req.flash("error", "Gagal memuat jadwal.");
    res.redirect("/dashboard");
  }
});

router.post(
  "/teacher/:teacherId",
  requireAuth,
  [
    body("dayOfWeek").isInt({ min: 0, max: 6 }).withMessage("Hari tidak valid"),
    body("startTime")
      .matches(/^\d{2}:\d{2}$/)
      .withMessage("Format waktu mulai tidak valid"),
    body("endTime")
      .matches(/^\d{2}:\d{2}$/)
      .withMessage("Format waktu selesai tidak valid"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { dayOfWeek, startTime, endTime } = req.body;

      if (startTime >= endTime) {
        req.flash("error", "Waktu selesai harus lebih dari waktu mulai.");
        return res.redirect("/schedules");
      }

      await prisma.schedule.create({
        data: {
          teacherId: req.params.teacherId,
          dayOfWeek: parseInt(dayOfWeek),
          startTime,
          endTime,
          isAvailable: true,
        },
      });

      req.flash("success", "Jadwal berhasil ditambahkan.");
      res.redirect("/schedules");
    } catch (error) {
      req.flash("error", "Gagal menambahkan jadwal.");
      res.redirect("/schedules");
    }
  },
);

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await prisma.schedule.delete({ where: { id: req.params.id } });
    req.flash("success", "Jadwal berhasil dihapus.");
    res.redirect("/schedules");
  } catch (error) {
    req.flash("error", "Gagal menghapus jadwal.");
    res.redirect("/schedules");
  }
});

router.patch("/:id/toggle", requireAuth, async (req, res) => {
  try {
    const s = await prisma.schedule.findUnique({
      where: { id: req.params.id },
    });
    await prisma.schedule.update({
      where: { id: req.params.id },
      data: { isAvailable: !s.isAvailable },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
