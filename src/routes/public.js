const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const { sendEmail, emailTemplates } = require("../utils/email");
const {
  studentRegistrationRules,
  teacherApplicationRules,
  handleValidationErrors,
} = require("../middlewares/validation");
const path = require("path");
const fs = require("fs");

// GET / - Landing page redirect to student registration
router.get("/", (req, res) => res.redirect("/daftar-murid"));

// GET /daftar-murid
router.get("/daftar-murid", async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where: { isActive: true },
      include: {
        instrument: true,
        classLocations: true,
        teacherClasses: {
          include: {
            teacher: {
              include: { schedules: { where: { isAvailable: true } } },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const instruments = await prisma.instrument.findMany({
      orderBy: { name: "asc" },
    });

    res.render("public/student-register", {
      title: "Daftar Murid — AksaraNada",
      classes,
      instruments,
      layout: "public",
    });
  } catch (error) {
    console.error(error);
    res.status(500).render("500", { title: "Error" });
  }
});

// POST /daftar-murid
router.post(
  "/daftar-murid",
  studentRegistrationRules,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        name,
        age,
        email,
        whatsapp,
        classId,
        teacherId,
        scheduleId,
        locationType,
        address,
      } = req.body;

      // Check duplicate email
      const existing = await prisma.student.findUnique({ where: { email } });
      if (existing) {
        // Check if same class
        const enrolled = await prisma.enrollment.findFirst({
          where: { studentId: existing.id, classId },
        });
        if (enrolled) {
          req.flash("error", "Email ini sudah terdaftar di kelas tersebut.");
          return res.redirect("/daftar-murid");
        }
      }

      // Validate class exists
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: { instrument: true, classLocations: true },
      });
      if (!classData) {
        req.flash("error", "Kelas tidak ditemukan.");
        return res.redirect("/daftar-murid");
      }

      // Validate location type is available for this class
      const locationAvailable = classData.classLocations.find(
        (l) => l.type === locationType,
      );
      if (!locationAvailable) {
        req.flash("error", "Tipe lokasi tidak tersedia untuk kelas ini.");
        return res.redirect("/daftar-murid");
      }

      let student = existing;
      if (!student) {
        student = await prisma.student.create({
          data: { name: name.trim(), age: parseInt(age), email, whatsapp },
        });
      }

      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: student.id,
          classId,
          teacherId: teacherId || null,
          scheduleId: scheduleId || null,
          locationType,
          address: address?.trim() || null,
        },
      });

      // Send emails (non-blocking)
      Promise.all([
        sendEmail(
          email,
          emailTemplates.studentWelcome(student, enrollment, classData),
        ),
        sendEmail(
          process.env.ADMIN_EMAIL,
          emailTemplates.studentNotifyAdmin(student, enrollment, classData),
        ),
      ]).catch((err) => console.error("Email error:", err));

      req.flash(
        "success",
        "Pendaftaran berhasil! Silakan cek email Anda untuk informasi lebih lanjut.",
      );
      res.redirect("/daftar-murid?success=1");
    } catch (error) {
      console.error(error);
      req.flash("error", "Terjadi kesalahan. Silakan coba lagi.");
      res.redirect("/daftar-murid");
    }
  },
);

// API: Get class details (for dynamic form)
router.get("/api/classes/:id", async (req, res) => {
  try {
    const classData = await prisma.class.findUnique({
      where: { id: req.params.id },
      include: {
        instrument: true,
        classLocations: true,
        teacherClasses: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                experience: true,
                schedules: { where: { isAvailable: true } },
              },
            },
          },
        },
      },
    });
    if (!classData) return res.status(404).json({ error: "Not found" });
    res.json(classData);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /daftar-guru
router.get("/daftar-guru", async (req, res) => {
  try {
    const instruments = await prisma.instrument.findMany({
      orderBy: { name: "asc" },
    });
    res.render("public/teacher-register", {
      title: "Daftar Guru — AksaraNada",
      instruments,
      layout: "public",
    });
  } catch (error) {
    res.status(500).render("500", { title: "Error" });
  }
});

// POST /daftar-guru
router.post(
  "/daftar-guru",
  teacherApplicationRules,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, email, phone, experience, instruments, motivation } =
        req.body;

      let cvPath = null;
      if (req.files && req.files.cv) {
        const cv = req.files.cv;
        const allowedTypes = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        if (!allowedTypes.includes(cv.mimetype)) {
          req.flash(
            "error",
            "CV hanya boleh berformat PDF atau Word (.doc/.docx).",
          );
          return res.redirect("/daftar-guru");
        }
        const uploadDir = path.join(__dirname, "../uploads/cv");
        if (!fs.existsSync(uploadDir))
          fs.mkdirSync(uploadDir, { recursive: true });
        const fileName = `cv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(cv.name)}`;
        await cv.mv(path.join(uploadDir, fileName));
        cvPath = `/uploads/cv/${fileName}`;
      }

      const instrumentsStr = Array.isArray(instruments)
        ? instruments.join(", ")
        : instruments;

      await prisma.teacherApplication.create({
        data: {
          name: name.trim(),
          email,
          phone,
          experience: parseInt(experience),
          cvPath,
          instruments: instrumentsStr,
          motivation: motivation?.trim() || null,
        },
      });

      // Send emails
      Promise.all([
        sendEmail(
          email,
          emailTemplates.teacherApplicationConfirm({
            name,
            email,
            phone,
            experience,
            instruments: instrumentsStr,
          }),
        ),
        sendEmail(
          process.env.ADMIN_EMAIL,
          emailTemplates.teacherApplicationNotifyAdmin({
            name,
            email,
            phone,
            experience,
            instruments: instrumentsStr,
          }),
        ),
      ]).catch((err) => console.error("Email error:", err));

      req.flash(
        "success",
        "Lamaran berhasil dikirim! Kami akan menghubungi Anda segera.",
      );
      res.redirect("/daftar-guru?success=1");
    } catch (error) {
      console.error(error);
      req.flash("error", "Terjadi kesalahan. Silakan coba lagi.");
      res.redirect("/daftar-guru");
    }
  },
);

module.exports = router;
