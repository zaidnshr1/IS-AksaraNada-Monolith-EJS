const { body, validationResult } = require("express-validator");
const xss = require("xss");

const sanitizeInput = (value) => {
  if (typeof value !== "string") return value;
  return xss(value.trim());
};

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg);
    req.flash("error", errorMessages);
    return res.redirect("back");
  }
  next();
};

const studentRegistrationRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Nama wajib diisi")
    .isLength({ min: 2, max: 100 })
    .withMessage("Nama harus 2-100 karakter")
    .matches(/^[a-zA-Z\s.'-]+$/)
    .withMessage("Nama hanya boleh mengandung huruf dan karakter nama")
    .customSanitizer(sanitizeInput),

  body("age")
    .isInt({ min: 3, max: 100 })
    .withMessage("Usia harus antara 3-100 tahun"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email wajib diisi")
    .isEmail()
    .withMessage("Format email tidak valid")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email terlalu panjang"),

  body("whatsapp")
    .trim()
    .notEmpty()
    .withMessage("Nomor WhatsApp wajib diisi")
    .matches(/^(\+62|62|0)[0-9]{8,13}$/)
    .withMessage("Format nomor WhatsApp tidak valid (contoh: 08123456789)")
    .isLength({ min: 10, max: 15 })
    .withMessage("Nomor WhatsApp tidak valid"),

  body("classId")
    .trim()
    .notEmpty()
    .withMessage("Pilih kelas terlebih dahulu")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Kelas tidak valid"),

  body("locationType")
    .isIn(["ONLINE", "OFFLINE_JAKARTA", "OFFLINE_BEKASI", "OFFLINE_STUDIO"])
    .withMessage("Tipe lokasi tidak valid"),

  body("terms")
    .equals("on")
    .withMessage("Anda harus menyetujui syarat dan ketentuan"),
];

const teacherApplicationRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Nama wajib diisi")
    .isLength({ min: 2, max: 100 })
    .withMessage("Nama harus 2-100 karakter")
    .matches(/^[a-zA-Z\s.'-]+$/)
    .withMessage("Nama tidak valid")
    .customSanitizer(sanitizeInput),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email wajib diisi")
    .isEmail()
    .withMessage("Format email tidak valid")
    .normalizeEmail(),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Nomor telepon wajib diisi")
    .matches(/^(\+62|62|0)[0-9]{8,13}$/)
    .withMessage("Format nomor telepon tidak valid"),

  body("experience")
    .isInt({ min: 0, max: 50 })
    .withMessage("Pengalaman harus antara 0-50 tahun"),

  body("instruments").notEmpty().withMessage("Pilih minimal satu instrumen"),

  body("terms")
    .equals("on")
    .withMessage("Anda harus menyetujui syarat dan ketentuan"),
];

const loginRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email wajib diisi")
    .isEmail()
    .withMessage("Format email tidak valid")
    .normalizeEmail(),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password wajib diisi")
    .isLength({ min: 6 })
    .withMessage("Password minimal 6 karakter"),
];

const transactionRules = [
  body("type")
    .isIn(["INCOME", "EXPENSE"])
    .withMessage("Tipe transaksi tidak valid"),

  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Nominal harus lebih dari 0"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Deskripsi wajib diisi")
    .isLength({ max: 500 })
    .withMessage("Deskripsi max 500 karakter")
    .customSanitizer(sanitizeInput),

  body("categoryId").trim().notEmpty().withMessage("Kategori wajib dipilih"),

  body("date").isISO8601().withMessage("Format tanggal tidak valid"),
];

module.exports = {
  handleValidationErrors,
  studentRegistrationRules,
  teacherApplicationRules,
  loginRules,
  transactionRules,
  sanitizeInput,
};
