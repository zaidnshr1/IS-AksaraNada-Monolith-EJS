const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const { requireAuth } = require("../middlewares/auth");
const moment = require("moment");

router.get("/", requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      monthlyIncome,
      monthlyExpense,
      recentEnrollments,
      recentTransactions,
      pendingApplications,
    ] = await Promise.all([
      prisma.student.count({ where: { isActive: true } }),
      prisma.teacher.count({ where: { isActive: true, isApproved: true } }),
      prisma.class.count({ where: { isActive: true } }),
      prisma.transaction.aggregate({
        where: {
          type: "INCOME",
          date: { gte: startOfMonth, lte: endOfMonth },
          status: "COMPLETED",
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          type: "EXPENSE",
          date: { gte: startOfMonth, lte: endOfMonth },
          status: "COMPLETED",
        },
        _sum: { amount: true },
      }),
      prisma.enrollment.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { student: true, class: { include: { instrument: true } } },
      }),
      prisma.transaction.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { category: true },
      }),
      prisma.teacherApplication.count({ where: { status: "PENDING" } }),
    ]);

    // Monthly chart data (last 6 months)
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
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
      chartData.push({
        month: moment(d).format("MMM YY"),
        income: inc._sum.amount || 0,
        expense: exp._sum.amount || 0,
      });
    }

    const netBalance =
      (monthlyIncome._sum.amount || 0) - (monthlyExpense._sum.amount || 0);

    res.render("dashboard/index", {
      title: "Dashboard — AksaraNada",
      stats: {
        totalStudents,
        totalTeachers,
        totalClasses,
        monthlyIncome: monthlyIncome._sum.amount || 0,
        monthlyExpense: monthlyExpense._sum.amount || 0,
        netBalance,
        pendingApplications,
      },
      recentEnrollments,
      recentTransactions,
      chartData: JSON.stringify(chartData),
      moment,
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Gagal memuat dashboard.");
    res.render("dashboard/index", {
      title: "Dashboard",
      stats: {},
      recentEnrollments: [],
      recentTransactions: [],
      chartData: "[]",
      moment,
    });
  }
});

module.exports = router;
