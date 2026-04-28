const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const { requireAuth } = require("../middlewares/auth");
const {
  transactionRules,
  handleValidationErrors,
} = require("../middlewares/validation");
const { body } = require("express-validator");
const moment = require("moment");
const XLSX = require("xlsx");

// GET /finance
router.get("/", requireAuth, async (req, res) => {
  try {
    const { month, year, type, categoryId } = req.query;
    const now = new Date();
    const selectedYear = parseInt(year) || now.getFullYear();
    const selectedMonth = parseInt(month) || now.getMonth() + 1;

    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

    const where = { date: { gte: startDate, lte: endDate } };
    if (type && ["INCOME", "EXPENSE"].includes(type)) where.type = type;
    if (categoryId) where.categoryId = categoryId;

    const [transactions, categories, summary] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true, createdBy: { select: { name: true } } },
        orderBy: { date: "desc" },
      }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.transaction.groupBy({
        by: ["type"],
        where: { date: { gte: startDate, lte: endDate }, status: "COMPLETED" },
        _sum: { amount: true },
      }),
    ]);

    const incomeTotal =
      summary.find((s) => s.type === "INCOME")?._sum.amount || 0;
    const expenseTotal =
      summary.find((s) => s.type === "EXPENSE")?._sum.amount || 0;

    res.render("finance/index", {
      title: "Keuangan — AksaraNada",
      transactions,
      categories,
      incomeTotal,
      expenseTotal,
      netBalance: incomeTotal - expenseTotal,
      selectedMonth,
      selectedYear,
      filters: { type, categoryId },
      moment,
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Gagal memuat data keuangan.");
    res.redirect("/dashboard");
  }
});

// POST /finance/transaction
router.post(
  "/transaction",
  requireAuth,
  transactionRules,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        type,
        amount,
        description,
        categoryId,
        date,
        referenceNo,
        notes,
      } = req.body;

      await prisma.transaction.create({
        data: {
          type,
          amount: parseFloat(amount),
          description: description.trim(),
          categoryId,
          date: new Date(date),
          referenceNo: referenceNo?.trim() || null,
          notes: notes?.trim() || null,
          createdById: req.session.user.id,
          status: "COMPLETED",
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.session.user.id,
          action: "CREATE",
          entity: "Transaction",
          details: `${type} - ${amount} - ${description}`,
          ipAddress: req.ip,
        },
      });

      req.flash("success", "Transaksi berhasil dicatat.");
      res.redirect("/finance");
    } catch (error) {
      console.error(error);
      req.flash("error", "Gagal menyimpan transaksi.");
      res.redirect("/finance");
    }
  },
);

// DELETE /finance/transaction/:id
router.delete("/transaction/:id", requireAuth, async (req, res) => {
  try {
    await prisma.transaction.delete({ where: { id: req.params.id } });
    req.flash("success", "Transaksi berhasil dihapus.");
    res.redirect("/finance");
  } catch (error) {
    req.flash("error", "Gagal menghapus transaksi.");
    res.redirect("/finance");
  }
});

// GET /finance/categories
router.get("/categories", requireAuth, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    res.render("finance/categories", {
      title: "Kategori Keuangan",
      categories,
    });
  } catch (error) {
    req.flash("error", "Gagal memuat kategori.");
    res.redirect("/finance");
  }
});

// POST /finance/categories
router.post(
  "/categories",
  requireAuth,
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Nama kategori wajib diisi")
      .isLength({ max: 100 }),
    body("type").isIn(["INCOME", "EXPENSE"]).withMessage("Tipe tidak valid"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, type, description } = req.body;
      await prisma.category.create({
        data: {
          name: name.trim(),
          type,
          description: description?.trim() || null,
        },
      });
      req.flash("success", "Kategori berhasil ditambahkan.");
      res.redirect("/finance/categories");
    } catch (error) {
      if (error.code === "P2002")
        req.flash("error", "Nama kategori sudah ada.");
      else req.flash("error", "Gagal menyimpan kategori.");
      res.redirect("/finance/categories");
    }
  },
);

// DELETE /finance/categories/:id
router.delete("/categories/:id", requireAuth, async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    req.flash("success", "Kategori berhasil dihapus.");
    res.redirect("/finance/categories");
  } catch (error) {
    req.flash("error", "Gagal menghapus kategori (mungkin masih digunakan).");
    res.redirect("/finance/categories");
  }
});

// GET /finance/report
router.get("/report", requireAuth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const selectedYear = parseInt(year) || now.getFullYear();
    const selectedMonth = parseInt(month) || now.getMonth() + 1;
    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

    const transactions = await prisma.transaction.findMany({
      where: { date: { gte: startDate, lte: endDate }, status: "COMPLETED" },
      include: { category: true, createdBy: { select: { name: true } } },
      orderBy: { date: "asc" },
    });

    const byCategory = await prisma.transaction.groupBy({
      by: ["categoryId", "type"],
      where: { date: { gte: startDate, lte: endDate }, status: "COMPLETED" },
      _sum: { amount: true },
    });

    const categories = await prisma.category.findMany();
    const categoryMap = Object.fromEntries(
      categories.map((c) => [c.id, c.name]),
    );

    const incomeTotal = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + t.amount, 0);
    const expenseTotal = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((s, t) => s + t.amount, 0);

    res.render("finance/report", {
      title: "Laporan Keuangan",
      transactions,
      byCategory,
      categoryMap,
      incomeTotal,
      expenseTotal,
      netBalance: incomeTotal - expenseTotal,
      selectedMonth,
      selectedYear,
      moment,
    });
  } catch (error) {
    req.flash("error", "Gagal membuat laporan.");
    res.redirect("/finance");
  }
});

// GET /finance/export-excel
router.get("/export-excel", requireAuth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const selectedYear = parseInt(year) || now.getFullYear();
    const selectedMonth = parseInt(month) || now.getMonth() + 1;
    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

    const transactions = await prisma.transaction.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { category: true, createdBy: { select: { name: true } } },
      orderBy: { date: "asc" },
    });

    const data = transactions.map((t, i) => ({
      No: i + 1,
      Tanggal: moment(t.date).format("DD/MM/YYYY"),
      Tipe: t.type === "INCOME" ? "Pemasukan" : "Pengeluaran",
      Kategori: t.category.name,
      Deskripsi: t.description,
      "No. Referensi": t.referenceNo || "-",
      Nominal: t.amount,
      Status: t.status,
      "Dibuat Oleh": t.createdBy?.name || "-",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 35 },
      { wch: 18 },
      { wch: 15 },
      { wch: 12 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Transaksi");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `Keuangan_AksaraNada_${selectedYear}-${String(selectedMonth).padStart(2, "0")}.xlsx`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.send(buf);
  } catch (error) {
    console.error(error);
    req.flash("error", "Gagal mengekspor data.");
    res.redirect("/finance");
  }
});

// GET /finance/invoice/:id
router.get("/invoice/:id", requireAuth, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        enrollment: {
          include: { student: true, class: { include: { instrument: true } } },
        },
        transaction: true,
      },
    });
    if (!invoice) {
      req.flash("error", "Invoice tidak ditemukan.");
      return res.redirect("/finance");
    }
    res.render("finance/invoice", {
      title: `Invoice ${invoice.invoiceNo}`,
      invoice,
      moment,
    });
  } catch (error) {
    req.flash("error", "Gagal memuat invoice.");
    res.redirect("/finance");
  }
});

// GET /finance/salary
router.get("/salary", requireAuth, async (req, res) => {
  try {
    const { period } = req.query;
    const currentPeriod = period || moment().format("YYYY-MM");

    const [salaries, teachers, staff] = await Promise.all([
      prisma.salary.findMany({
        where: { period: currentPeriod },
        include: { teacher: true, staff: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.teacher.findMany({
        where: { isActive: true, isApproved: true },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
    ]);

    res.render("finance/salary", {
      title: "Penggajian",
      salaries,
      teachers,
      staff,
      currentPeriod,
      moment,
    });
  } catch (error) {
    req.flash("error", "Gagal memuat data penggajian.");
    res.redirect("/finance");
  }
});

// POST /finance/salary
router.post(
  "/salary",
  requireAuth,
  [
    body("type").isIn(["TEACHER", "STAFF"]).withMessage("Tipe tidak valid"),
    body("amount").isFloat({ min: 1 }).withMessage("Nominal tidak valid"),
    body("period")
      .matches(/^\d{4}-\d{2}$/)
      .withMessage("Format periode tidak valid"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { type, teacherId, staffId, amount, period, notes } = req.body;
      await prisma.salary.create({
        data: {
          type,
          teacherId: type === "TEACHER" ? teacherId : null,
          staffId: type === "STAFF" ? staffId : null,
          amount: parseFloat(amount),
          period,
          notes: notes?.trim() || null,
        },
      });
      req.flash("success", "Data gaji berhasil disimpan.");
      res.redirect("/finance/salary?period=" + period);
    } catch (error) {
      req.flash("error", "Gagal menyimpan data gaji.");
      res.redirect("/finance/salary");
    }
  },
);

// PATCH /finance/salary/:id/pay
router.patch("/salary/:id/pay", requireAuth, async (req, res) => {
  try {
    await prisma.salary.update({
      where: { id: req.params.id },
      data: { status: "PAID", paidDate: new Date() },
    });
    req.flash("success", "Status gaji diperbarui.");
    res.redirect("back");
  } catch (error) {
    req.flash("error", "Gagal memperbarui status gaji.");
    res.redirect("back");
  }
});

// GET /finance/health
router.get("/health", requireAuth, async (req, res) => {
  try {
    const months = 6;
    const healthData = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const [inc, exp] = await Promise.all([
        prisma.transaction.aggregate({
          where: {
            type: "INCOME",
            date: { gte: d, lte: end },
            status: "COMPLETED",
          },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: {
            type: "EXPENSE",
            date: { gte: d, lte: end },
            status: "COMPLETED",
          },
          _sum: { amount: true },
        }),
      ]);
      healthData.push({
        month: moment(d).format("MMM YYYY"),
        income: inc._sum.amount || 0,
        expense: exp._sum.amount || 0,
        net: (inc._sum.amount || 0) - (exp._sum.amount || 0),
      });
    }

    const totalAssets = await prisma.asset.aggregate({
      _sum: { currentValue: true },
    });

    res.render("finance/health", {
      title: "Kesehatan Keuangan",
      healthData: JSON.stringify(healthData),
      healthDataRaw: healthData,
      totalAssets: totalAssets._sum.currentValue || 0,
      moment,
    });
  } catch (error) {
    req.flash("error", "Gagal memuat data kesehatan keuangan.");
    res.redirect("/finance");
  }
});

module.exports = router;
