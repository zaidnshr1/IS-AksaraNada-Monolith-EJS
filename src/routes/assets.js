const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const { requireAuth } = require("../middlewares/auth");
const { body } = require("express-validator");
const { handleValidationErrors } = require("../middlewares/validation");
const moment = require("moment");

// ========== ASSETS ==========
router.get("/", requireAuth, async (req, res) => {
  try {
    const assets = await prisma.asset.findMany({
      orderBy: { createdAt: "desc" },
    });
    const totalValue = assets.reduce(
      (s, a) => s + (a.currentValue || a.purchasePrice),
      0,
    );
    res.render("assets/index", {
      title: "Manajemen Aset — AksaraNada",
      assets,
      totalValue,
      moment,
    });
  } catch (error) {
    req.flash("error", "Gagal memuat aset.");
    res.redirect("/dashboard");
  }
});

router.post(
  "/",
  requireAuth,
  [
    body("name").trim().notEmpty().withMessage("Nama aset wajib diisi"),
    body("category").trim().notEmpty().withMessage("Kategori wajib diisi"),
    body("purchaseDate").isISO8601().withMessage("Tanggal tidak valid"),
    body("purchasePrice").isFloat({ min: 0 }).withMessage("Harga tidak valid"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        name,
        category,
        description,
        purchaseDate,
        purchasePrice,
        currentValue,
        condition,
        location,
        notes,
      } = req.body;
      await prisma.asset.create({
        data: {
          name: name.trim(),
          category: category.trim(),
          description: description?.trim() || null,
          purchaseDate: new Date(purchaseDate),
          purchasePrice: parseFloat(purchasePrice),
          currentValue: currentValue ? parseFloat(currentValue) : null,
          condition: condition || "GOOD",
          location: location?.trim() || null,
          notes: notes?.trim() || null,
        },
      });
      req.flash("success", "Aset berhasil ditambahkan.");
      res.redirect("/assets");
    } catch (error) {
      req.flash("error", "Gagal menambahkan aset.");
      res.redirect("/assets");
    }
  },
);

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await prisma.asset.delete({ where: { id: req.params.id } });
    req.flash("success", "Aset berhasil dihapus.");
    res.redirect("/assets");
  } catch (error) {
    req.flash("error", "Gagal menghapus aset.");
    res.redirect("/assets");
  }
});

module.exports = router;
