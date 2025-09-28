#!/usr/bin/env node

const { program } = require("commander");
const chalk = require("chalk");
const { table } = require("table");
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const db = require("./utils/database");
const FundRequest = require("./models/FundRequest");

// Configure CLI commands
program
  .name("analytics")
  .description("Analytics and reporting tool for Fund Request database")
  .version("1.0.0");

program
  .option("-d, --department <dept>", "Department filter")
  .option("--start-date <date>", "Start date (YYYY-MM-DD)")
  .option("--end-date <date>", "End date (YYYY-MM-DD)")
  .option(
    "-p, --period <period>",
    "Time period (today, week, month, quarter, year)"
  )
  .option("--export-csv", "Export analytics to CSV")
  .option("--export-json", "Export analytics to JSON")
  .option("-o, --output <file>", "Output file name")
  .option("--detailed", "Show detailed analytics")
  .action(async (options) => {
    await generateAnalytics(options);
  });

// Specific analytics commands
program
  .command("overview")
  .description("Generate overview analytics")
  .action(async () => {
    await generateAnalytics({ overview: true });
  });

program
  .command("departments")
  .description("Department-wise analytics")
  .option("--top <number>", "Top N departments", parseInt, 10)
  .action(async (options) => {
    await generateDepartmentAnalytics(options);
  });

program
  .command("trends")
  .description("Time-based trend analysis")
  .option(
    "--period <period>",
    "Period (daily, weekly, monthly, yearly)",
    "monthly"
  )
  .option("--months <number>", "Number of months to analyze", parseInt, 12)
  .action(async (options) => {
    await generateTrendAnalytics(options);
  });

program
  .command("performance")
  .description("Approval performance metrics")
  .action(async () => {
    await generatePerformanceAnalytics();
  });

program
  .command("alerts")
  .description("Show alerts and warnings")
  .action(async () => {
    await generateAlerts();
  });

// Main analytics function
async function generateAnalytics(options = {}) {
  try {
    console.log(chalk.blue("🔌 Connecting to database..."));
    await db.connect();

    console.log(chalk.blue("📊 Generating analytics..."));

    // Build date filters
    const dateFilters = buildDateFilters(options);

    // Generate analytics
    const analytics = await generateOverviewAnalytics(
      dateFilters,
      options.department
    );
    const statusDistribution = await generateStatusAnalytics(
      dateFilters,
      options.department
    );
    const departmentAnalytics = await generateDepartmentAnalytics({
      department: options.department,
      ...dateFilters,
    });
    const currencyAnalytics = await generateCurrencyAnalytics(
      dateFilters,
      options.department
    );

    // Display results
    displayOverview(analytics);
    displayStatusDistribution(statusDistribution);
    displayDepartmentSummary(departmentAnalytics);
    displayCurrencyBreakdown(currencyAnalytics);

    if (options.detailed) {
      await displayDetailedAnalytics(dateFilters, options.department);
    }

    // Export if requested
    const allAnalytics = {
      overview: analytics,
      statusDistribution,
      departments: departmentAnalytics,
      currencies: currencyAnalytics,
      generatedAt: new Date().toISOString(),
      filters: { dateFilters, department: options.department },
    };

    if (options.exportCsv || options.exportJson) {
      await exportAnalytics(allAnalytics, options);
    }
  } catch (error) {
    console.error(chalk.red("❌ Analytics error:"), error.message);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

// Build date filters based on options
function buildDateFilters(options) {
  let startDate, endDate;

  if (options.startDate && options.endDate) {
    startDate = new Date(options.startDate);
    endDate = new Date(options.endDate);
    endDate.setHours(23, 59, 59, 999);
  } else if (options.period) {
    const now = new Date();

    switch (options.period) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "week":
        startDate = moment().startOf("week").toDate();
        endDate = moment().endOf("week").toDate();
        break;
      case "month":
        startDate = moment().startOf("month").toDate();
        endDate = moment().endOf("month").toDate();
        break;
      case "quarter":
        startDate = moment().startOf("quarter").toDate();
        endDate = moment().endOf("quarter").toDate();
        break;
      case "year":
        startDate = moment().startOf("year").toDate();
        endDate = moment().endOf("year").toDate();
        break;
    }
  }

  return startDate && endDate ? { startDate, endDate } : {};
}

// Generate overview analytics
async function generateOverviewAnalytics(dateFilters, department) {
  const matchStage = {};

  if (dateFilters.startDate || dateFilters.endDate) {
    matchStage.created_at = {};
    if (dateFilters.startDate)
      matchStage.created_at.$gte = dateFilters.startDate;
    if (dateFilters.endDate) matchStage.created_at.$lte = dateFilters.endDate;
  }

  if (department) {
    matchStage.department = new RegExp(department, "i");
  }

  const pipeline = [];
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  pipeline.push({
    $group: {
      _id: null,
      totalRequests: { $sum: 1 },
      totalAmount: { $sum: "$amount" },
      avgAmount: { $avg: "$amount" },
      medianAmount: { $push: "$amount" },
      maxAmount: { $max: "$amount" },
      minAmount: { $min: "$amount" },
      pendingCount: {
        $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
      },
      approvedCount: {
        $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
      },
      rejectedCount: {
        $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
      },
      urgentCount: {
        $sum: { $cond: ["$urgent", 1, 0] },
      },
      totalApprovedAmount: {
        $sum: {
          $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0],
        },
      },
      avgApprovalTime: {
        $avg: {
          $cond: [
            {
              $and: [
                { $ne: ["$approved_date", null] },
                { $ne: ["$approved_date", undefined] },
              ],
            },
            { $subtract: ["$approved_date", "$created_at"] },
            null,
          ],
        },
      },
    },
  });

  const result = await FundRequest.aggregate(pipeline);
  const analytics = result[0] || {};

  // Calculate median manually
  if (analytics.medianAmount && analytics.medianAmount.length > 0) {
    const sorted = analytics.medianAmount.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    analytics.medianAmount =
      sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    analytics.medianAmount = 0;
  }

  // Convert approval time from milliseconds to days
  if (analytics.avgApprovalTime) {
    analytics.avgApprovalTimeInDays = Math.round(
      analytics.avgApprovalTime / (1000 * 60 * 60 * 24)
    );
  }

  return analytics;
}

// Generate status analytics
async function generateStatusAnalytics(dateFilters, department) {
  const matchStage = {};

  if (dateFilters.startDate || dateFilters.endDate) {
    matchStage.created_at = {};
    if (dateFilters.startDate)
      matchStage.created_at.$gte = dateFilters.startDate;
    if (dateFilters.endDate) matchStage.created_at.$lte = dateFilters.endDate;
  }

  if (department) {
    matchStage.department = new RegExp(department, "i");
  }

  const pipeline = [];
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  pipeline.push({
    $group: {
      _id: "$status",
      count: { $sum: 1 },
      totalAmount: { $sum: "$amount" },
      avgAmount: { $avg: "$amount" },
      urgentCount: { $sum: { $cond: ["$urgent", 1, 0] } },
    },
  });

  return await FundRequest.aggregate(pipeline);
}

// Generate department analytics
async function generateDepartmentAnalytics(options = {}) {
  const matchStage = {};

  if (options.startDate || options.endDate) {
    matchStage.created_at = {};
    if (options.startDate) matchStage.created_at.$gte = options.startDate;
    if (options.endDate) matchStage.created_at.$lte = options.endDate;
  }

  if (options.department) {
    matchStage.department = new RegExp(options.department, "i");
  }

  const pipeline = [];
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  pipeline.push({
    $group: {
      _id: { $ifNull: ["$department", "Unspecified"] },
      count: { $sum: 1 },
      totalAmount: { $sum: "$amount" },
      avgAmount: { $avg: "$amount" },
      pendingCount: {
        $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
      },
      approvedCount: {
        $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
      },
      rejectedCount: {
        $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
      },
      urgentCount: { $sum: { $cond: ["$urgent", 1, 0] } },
    },
  });

  pipeline.push({ $sort: { totalAmount: -1 } });

  if (options.top) {
    pipeline.push({ $limit: options.top });
  }

  return await FundRequest.aggregate(pipeline);
}

// Generate currency analytics
async function generateCurrencyAnalytics(dateFilters, department) {
  const matchStage = {};

  if (dateFilters.startDate || dateFilters.endDate) {
    matchStage.created_at = {};
    if (dateFilters.startDate)
      matchStage.created_at.$gte = dateFilters.startDate;
    if (dateFilters.endDate) matchStage.created_at.$lte = dateFilters.endDate;
  }

  if (department) {
    matchStage.department = new RegExp(department, "i");
  }

  const pipeline = [];
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  pipeline.push({
    $group: {
      _id: "$currency",
      count: { $sum: 1 },
      totalAmount: { $sum: "$amount" },
      avgAmount: { $avg: "$amount" },
      approvedAmount: {
        $sum: {
          $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0],
        },
      },
    },
  });

  pipeline.push({ $sort: { totalAmount: -1 } });

  return await FundRequest.aggregate(pipeline);
}

// Display functions
function displayOverview(analytics) {
  console.log(chalk.green("\n📈 OVERVIEW ANALYTICS"));
  console.log(chalk.cyan("══════════════════════════"));

  const approvalRate =
    analytics.totalRequests > 0
      ? ((analytics.approvedCount / analytics.totalRequests) * 100).toFixed(1)
      : 0;

  const rejectionRate =
    analytics.totalRequests > 0
      ? ((analytics.rejectedCount / analytics.totalRequests) * 100).toFixed(1)
      : 0;

  console.log(
    `📊 Total Requests: ${chalk.yellow(analytics.totalRequests || 0)}`
  );
  console.log(
    `💰 Total Amount: ${chalk.yellow(
      "₦" + (analytics.totalAmount || 0).toLocaleString()
    )}`
  );
  console.log(
    `📊 Average Amount: ${chalk.yellow(
      "₦" + Math.round(analytics.avgAmount || 0).toLocaleString()
    )}`
  );
  console.log(
    `📊 Median Amount: ${chalk.yellow(
      "₦" + Math.round(analytics.medianAmount || 0).toLocaleString()
    )}`
  );
  console.log(
    `📈 Max Amount: ${chalk.yellow(
      "₦" + (analytics.maxAmount || 0).toLocaleString()
    )}`
  );
  console.log(
    `📉 Min Amount: ${chalk.yellow(
      "₦" + (analytics.minAmount || 0).toLocaleString()
    )}`
  );
  console.log(`⏳ Pending: ${chalk.yellow(analytics.pendingCount || 0)}`);
  console.log(
    `✅ Approved: ${chalk.green(
      analytics.approvedCount || 0
    )} (${approvalRate}%)`
  );
  console.log(
    `❌ Rejected: ${chalk.red(
      analytics.rejectedCount || 0
    )} (${rejectionRate}%)`
  );
  console.log(`🚨 Urgent: ${chalk.red(analytics.urgentCount || 0)}`);
  console.log(
    `💵 Approved Amount: ${chalk.green(
      "₦" + (analytics.totalApprovedAmount || 0).toLocaleString()
    )}`
  );

  if (analytics.avgApprovalTimeInDays) {
    console.log(
      `⏱️  Avg Approval Time: ${chalk.yellow(
        analytics.avgApprovalTimeInDays
      )} days`
    );
  }
}

function displayStatusDistribution(statusData) {
  if (statusData.length === 0) return;

  console.log(chalk.green("\n📊 STATUS DISTRIBUTION"));
  console.log(chalk.cyan("════════════════════════"));

  const statusTable = [
    ["Status", "Count", "Total Amount", "Avg Amount", "Urgent"],
  ];

  statusData.forEach((item) => {
    statusTable.push([
      getStatusDisplay(item._id),
      item.count.toString(),
      "₦" + item.totalAmount.toLocaleString(),
      "₦" + Math.round(item.avgAmount).toLocaleString(),
      item.urgentCount.toString(),
    ]);
  });

  console.log(table(statusTable));
}

function displayDepartmentSummary(deptData) {
  if (deptData.length === 0) return;

  console.log(chalk.green("\n🏢 DEPARTMENT ANALYSIS"));
  console.log(chalk.cyan("═══════════════════════"));

  const deptTable = [
    ["Department", "Requests", "Total Amount", "Avg Amount", "Approval Rate"],
  ];

  deptData.forEach((item) => {
    const approvalRate =
      item.count > 0
        ? ((item.approvedCount / item.count) * 100).toFixed(1) + "%"
        : "0%";

    deptTable.push([
      item._id,
      item.count.toString(),
      "₦" + item.totalAmount.toLocaleString(),
      "₦" + Math.round(item.avgAmount).toLocaleString(),
      approvalRate,
    ]);
  });

  console.log(table(deptTable));
}

function displayCurrencyBreakdown(currencyData) {
  if (currencyData.length === 0) return;

  console.log(chalk.green("\n💱 CURRENCY BREAKDOWN"));
  console.log(chalk.cyan("════════════════════════"));

  const currencyTable = [
    ["Currency", "Requests", "Total Amount", "Approved Amount"],
  ];

  currencyData.forEach((item) => {
    const symbol = getCurrencySymbol(item._id);
    currencyTable.push([
      `${symbol} ${item._id}`,
      item.count.toString(),
      symbol + item.totalAmount.toLocaleString(),
      symbol + item.approvedAmount.toLocaleString(),
    ]);
  });

  console.log(table(currencyTable));
}

// Trend analytics
async function generateTrendAnalytics(options) {
  try {
    await db.connect();

    console.log(chalk.blue("📈 Generating trend analytics..."));

    const months = options.months || 12;
    const period = options.period || "monthly";

    let groupBy;
    let dateFormat;

    switch (period) {
      case "daily":
        groupBy = {
          year: { $year: "$created_at" },
          month: { $month: "$created_at" },
          day: { $dayOfMonth: "$created_at" },
        };
        dateFormat = (item) =>
          `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(
            item._id.day
          ).padStart(2, "0")}`;
        break;
      case "weekly":
        groupBy = {
          year: { $year: "$created_at" },
          week: { $week: "$created_at" },
        };
        dateFormat = (item) =>
          `${item._id.year}-W${String(item._id.week).padStart(2, "0")}`;
        break;
      case "yearly":
        groupBy = {
          year: { $year: "$created_at" },
        };
        dateFormat = (item) => item._id.year.toString();
        break;
      default: // monthly
        groupBy = {
          year: { $year: "$created_at" },
          month: { $month: "$created_at" },
        };
        dateFormat = (item) =>
          moment(new Date(item._id.year, item._id.month - 1)).format(
            "MMM YYYY"
          );
        break;
    }

    const trends = await FundRequest.aggregate([
      {
        $match: {
          created_at: {
            $gte: moment().subtract(months, "months").startOf("month").toDate(),
          },
        },
      },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          approvedCount: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          urgentCount: { $sum: { $cond: ["$urgent", 1, 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1, "_id.day": 1 } },
    ]);

    console.log(chalk.green(`\n📅 ${period.toUpperCase()} TRENDS`));
    console.log(chalk.cyan("═".repeat(50)));

    const trendTable = [
      [
        "Period",
        "Requests",
        "Amount",
        "Approved",
        "Rejected",
        "Pending",
        "Urgent",
      ],
    ];

    trends.forEach((item) => {
      trendTable.push([
        dateFormat(item),
        item.count.toString(),
        "₦" + item.totalAmount.toLocaleString(),
        item.approvedCount.toString(),
        item.rejectedCount.toString(),
        item.pendingCount.toString(),
        item.urgentCount.toString(),
      ]);
    });

    console.log(table(trendTable));
  } catch (error) {
    console.error(chalk.red("❌ Trend analytics error:"), error.message);
  } finally {
    await db.disconnect();
  }
}

// Performance analytics
async function generatePerformanceAnalytics() {
  try {
    await db.connect();

    console.log(chalk.blue("⚡ Generating performance analytics..."));

    // Approval time analysis
    const approvalTimes = await FundRequest.aggregate([
      {
        $match: {
          status: "approved",
          approved_date: { $exists: true, $ne: null },
        },
      },
      {
        $project: {
          approvalTimeInDays: {
            $divide: [
              { $subtract: ["$approved_date", "$created_at"] },
              1000 * 60 * 60 * 24,
            ],
          },
          amount: 1,
          department: 1,
        },
      },
      {
        $group: {
          _id: null,
          avgApprovalTime: { $avg: "$approvalTimeInDays" },
          maxApprovalTime: { $max: "$approvalTimeInDays" },
          minApprovalTime: { $min: "$approvalTimeInDays" },
          totalApproved: { $sum: 1 },
        },
      },
    ]);

    // Department performance
    const deptPerformance = await FundRequest.aggregate([
      {
        $match: {
          status: "approved",
          approved_date: { $exists: true, $ne: null },
        },
      },
      {
        $project: {
          department: { $ifNull: ["$department", "Unspecified"] },
          approvalTimeInDays: {
            $divide: [
              { $subtract: ["$approved_date", "$created_at"] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      {
        $group: {
          _id: "$department",
          avgApprovalTime: { $avg: "$approvalTimeInDays" },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgApprovalTime: 1 } },
    ]);

    // Display results
    if (approvalTimes.length > 0) {
      const perf = approvalTimes[0];
      console.log(chalk.green("\n⚡ APPROVAL PERFORMANCE"));
      console.log(chalk.cyan("══════════════════════════"));
      console.log(`📊 Total Approved: ${chalk.yellow(perf.totalApproved)}`);
      console.log(
        `⏱️  Average Time: ${chalk.yellow(
          Math.round(perf.avgApprovalTime)
        )} days`
      );
      console.log(
        `🚀 Fastest: ${chalk.green(Math.round(perf.minApprovalTime))} days`
      );
      console.log(
        `🐌 Slowest: ${chalk.red(Math.round(perf.maxApprovalTime))} days`
      );
    }

    if (deptPerformance.length > 0) {
      console.log(chalk.green("\n🏢 DEPARTMENT PERFORMANCE (Approval Speed)"));
      console.log(chalk.cyan("═══════════════════════════════════════════"));

      const perfTable = [["Department", "Avg Days", "Requests"]];

      deptPerformance.forEach((item) => {
        perfTable.push([
          item._id,
          Math.round(item.avgApprovalTime).toString(),
          item.count.toString(),
        ]);
      });

      console.log(table(perfTable));
    }
  } catch (error) {
    console.error(chalk.red("❌ Performance analytics error:"), error.message);
  } finally {
    await db.disconnect();
  }
}

// Generate alerts
async function generateAlerts() {
  try {
    await db.connect();

    console.log(chalk.blue("🚨 Generating alerts and warnings..."));

    // Overdue requests
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const overdueRequests = await FundRequest.find({
      status: "pending",
      created_at: { $lte: sevenDaysAgo },
    }).sort({ created_at: 1 });

    // High-value pending requests
    const highValueRequests = await FundRequest.find({
      status: "pending",
      amount: { $gte: 1000000 }, // 1 million threshold
    }).sort({ amount: -1 });

    // Unusual patterns
    const todayStart = moment().startOf("day").toDate();
    const todayCount = await FundRequest.countDocuments({
      created_at: { $gte: todayStart },
    });

    const avgDailyCount = await FundRequest.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" },
            day: { $dayOfMonth: "$created_at" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          avgCount: { $avg: "$count" },
        },
      },
    ]);

    const dailyAverage =
      avgDailyCount.length > 0 ? avgDailyCount[0].avgCount : 0;

    // Display alerts
    console.log(chalk.red("\n🚨 ALERTS & WARNINGS"));
    console.log(chalk.cyan("═══════════════════════"));

    if (overdueRequests.length > 0) {
      console.log(
        chalk.red(`⚠️  ${overdueRequests.length} OVERDUE REQUESTS (>7 days)`)
      );

      const overdueTable = [
        ["Requester", "Amount", "Age (Days)", "Department"],
      ];
      overdueRequests.slice(0, 10).forEach((req) => {
        const ageInDays = Math.floor(
          (Date.now() - req.created_at) / (1000 * 60 * 60 * 24)
        );
        overdueTable.push([
          req.requester_name,
          req.formattedAmount,
          ageInDays.toString(),
          req.department || "N/A",
        ]);
      });

      console.log(table(overdueTable));
    }

    if (highValueRequests.length > 0) {
      console.log(
        chalk.yellow(
          `\n💰 ${highValueRequests.length} HIGH-VALUE PENDING REQUESTS (≥₦1M)`
        )
      );

      const highValueTable = [
        ["Requester", "Amount", "Age (Days)", "Department"],
      ];
      highValueRequests.slice(0, 5).forEach((req) => {
        const ageInDays = Math.floor(
          (Date.now() - req.created_at) / (1000 * 60 * 60 * 24)
        );
        highValueTable.push([
          req.requester_name,
          req.formattedAmount,
          ageInDays.toString(),
          req.department || "N/A",
        ]);
      });

      console.log(table(highValueTable));
    }

    if (dailyAverage > 0 && todayCount > dailyAverage * 2) {
      console.log(
        chalk.yellow(
          `\n📈 UNUSUAL ACTIVITY: ${todayCount} requests today vs ${Math.round(
            dailyAverage
          )} daily average`
        )
      );
    }

    if (overdueRequests.length === 0 && highValueRequests.length === 0) {
      console.log(chalk.green("✅ No critical alerts at this time"));
    }
  } catch (error) {
    console.error(chalk.red("❌ Alerts error:"), error.message);
  } finally {
    await db.disconnect();
  }
}

// Export analytics
async function exportAnalytics(analytics, options) {
  try {
    const exportDir = path.join(__dirname, "..", "exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = moment().format("YYYY-MM-DD_HH-mm-ss");

    if (options.exportJson) {
      const fileName = options.output || `analytics_${timestamp}.json`;
      const filePath = path.join(exportDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(analytics, null, 2));
      console.log(chalk.green(`\n📄 Analytics exported to JSON: ${filePath}`));
    }

    if (options.exportCsv) {
      // Export overview as CSV
      const fileName = options.output || `analytics_overview_${timestamp}.csv`;
      const filePath = path.join(exportDir, fileName);

      const csvData = [
        "Metric,Value",
        `Total Requests,${analytics.overview.totalRequests || 0}`,
        `Total Amount,${analytics.overview.totalAmount || 0}`,
        `Average Amount,${Math.round(analytics.overview.avgAmount || 0)}`,
        `Pending,${analytics.overview.pendingCount || 0}`,
        `Approved,${analytics.overview.approvedCount || 0}`,
        `Rejected,${analytics.overview.rejectedCount || 0}`,
        `Urgent,${analytics.overview.urgentCount || 0}`,
      ].join("\n");

      fs.writeFileSync(filePath, csvData);
      console.log(chalk.green(`\n📄 Analytics exported to CSV: ${filePath}`));
    }
  } catch (error) {
    console.error(chalk.red("❌ Export error:"), error.message);
  }
}

// Helper functions
function getStatusDisplay(status) {
  const emoji = getStatusEmoji(status);
  return `${emoji} ${status.toUpperCase()}`;
}

function getStatusEmoji(status) {
  switch (status) {
    case "pending":
      return "⏳";
    case "approved":
      return "✅";
    case "rejected":
      return "❌";
    default:
      return "📝";
  }
}

function getCurrencySymbol(currency) {
  const symbols = {
    NGN: "₦",
    USD: "$",
    EUR: "€",
    CAD: "C$",
  };
  return symbols[currency] || currency;
}

// Parse and run
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.help();
}
