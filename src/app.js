require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fileUpload = require("express-fileupload");
const PgSession = require("connect-pg-simple")(session);
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

// Routes
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const studentRoutes = require("./routes/students");
const teacherRoutes = require("./routes/teachers");
const financeRoutes = require("./routes/finance");
const scheduleRoutes = require("./routes/schedules");
const assetRoutes = require("./routes/assets");
const classRoutes = require("./routes/classes");
const publicRoutes = require("./routes/public");

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Security
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
        ],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: "Terlalu banyak permintaan, coba lagi nanti.",
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Terlalu banyak percobaan, coba lagi dalam 15 menit.",
});

app.use("/auth/login", strictLimiter);
app.use("/register", strictLimiter);
app.use(limiter);

// Body Parsing
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
app.use(methodOverride("_method"));

// File Upload
app.use(
  fileUpload({
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
    },
    useTempFiles: true,
    tempFileDir: "/tmp/",
    createParentPath: true,
    abortOnLimit: true,
    safeFileNames: true,
    preserveExtension: true,
  }),
);

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(
  session({
    secret: process.env.SESSION_SECRET || "aksaranada_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, 
      sameSite: "strict",
    },
  }),
);

app.use(flash());

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.info = req.flash("info");
  res.locals.appName = "AksaraNada";
  res.locals.currentPath = req.path;
  next();
});

app.use("/", publicRoutes);
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/students", studentRoutes);
app.use("/teachers", teacherRoutes);
app.use("/finance", financeRoutes);
app.use("/schedules", scheduleRoutes);
app.use("/assets", assetRoutes);
app.use("/classes", classRoutes);

app.get("/ping", (req, res) => {
  res.json({
    status: "ok",
    message: "AksaraNada server is running",
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).render("404", { title: "Halaman Tidak Ditemukan" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .render("500", {
      title: "Terjadi Kesalahan",
      error: process.env.NODE_ENV === "development" ? err : {},
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`http://localhost:${PORT} Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
