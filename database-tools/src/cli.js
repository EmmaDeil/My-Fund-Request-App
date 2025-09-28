#!/usr/bin/env node

const { program } = require("commander");
const inquirer = require("inquirer");
const chalk = require("chalk");
const { table } = require("table");
const db = require("./utils/database");
const FundRequest = require("./models/FundRequest");

// CLI Header
const showHeader = () => {
  console.clear();
  console.log(chalk.cyan("═══════════════════════════════════════════"));
  console.log(chalk.cyan("    🗄️  FUND REQUEST DATABASE TOOLS    "));
  console.log(chalk.cyan("═══════════════════════════════════════════"));
  console.log(chalk.gray("  Database Management & Analytics CLI"));
  console.log();
};

// Main Menu
const showMainMenu = async () => {
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "🔍 Search & Filter Requests", value: "search" },
        { name: "📊 View Analytics & Reports", value: "analytics" },
        { name: "📋 List All Requests", value: "list" },
        { name: "📈 Export Data", value: "export" },
        { name: "🔧 Database Status", value: "status" },
        { name: "⚙️  Advanced Queries", value: "advanced" },
        { name: "❌ Exit", value: "exit" },
      ],
    },
  ]);

  return answers.action;
};

// Search and Filter Function
const searchRequests = async () => {
  console.log(chalk.yellow("\n🔍 Search & Filter Fund Requests\n"));

  const filters = await inquirer.prompt([
    {
      type: "list",
      name: "status",
      message: "Filter by status:",
      choices: ["All", "pending", "approved", "rejected"],
      default: "All",
    },
    {
      type: "input",
      name: "department",
      message: "Department (leave empty for all):",
    },
    {
      type: "input",
      name: "minAmount",
      message: "Minimum amount:",
      validate: (input) =>
        !input || !isNaN(input) || "Please enter a valid number",
    },
    {
      type: "input",
      name: "maxAmount",
      message: "Maximum amount:",
      validate: (input) =>
        !input || !isNaN(input) || "Please enter a valid number",
    },
    {
      type: "list",
      name: "urgent",
      message: "Filter by urgency:",
      choices: ["All", "Urgent Only", "Non-urgent Only"],
      default: "All",
    },
    {
      type: "input",
      name: "search",
      message: "Search text (purpose, description, name):",
    },
  ]);

  // Convert filters
  const queryFilters = {};
  if (filters.status !== "All") queryFilters.status = filters.status;
  if (filters.department) queryFilters.department = filters.department;
  if (filters.minAmount) queryFilters.minAmount = parseFloat(filters.minAmount);
  if (filters.maxAmount) queryFilters.maxAmount = parseFloat(filters.maxAmount);
  if (filters.urgent === "Urgent Only") queryFilters.urgent = true;
  if (filters.urgent === "Non-urgent Only") queryFilters.urgent = false;
  if (filters.search) queryFilters.search = filters.search;

  try {
    console.log(chalk.blue("\n🔍 Searching..."));
    const requests = await FundRequest.findByFilters(queryFilters)
      .sort({ created_at: -1 })
      .limit(20);

    if (requests.length === 0) {
      console.log(chalk.yellow("📭 No requests found matching your criteria."));
      return;
    }

    // Display results in table format
    const tableData = [
      ["ID", "Requester", "Amount", "Status", "Department", "Date", "Urgent"],
    ];

    requests.forEach((req) => {
      tableData.push([
        req._id.toString().slice(-8),
        req.requester_name,
        req.formattedAmount,
        getStatusEmoji(req.status) + " " + req.status.toUpperCase(),
        req.department || "N/A",
        new Date(req.created_at).toLocaleDateString(),
        req.urgent ? "🚨" : "📝",
      ]);
    });

    console.log(chalk.green(`\n✅ Found ${requests.length} requests:\n`));
    console.log(
      table(tableData, {
        header: {
          alignment: "center",
          content: chalk.cyan("SEARCH RESULTS"),
        },
      })
    );

    // Ask for next action
    const nextAction = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do with these results?",
        choices: [
          "View detailed information for a request",
          "Export these results",
          "Refine search",
          "Back to main menu",
        ],
      },
    ]);

    if (nextAction.action === "View detailed information for a request") {
      await viewRequestDetails(requests);
    } else if (nextAction.action === "Export these results") {
      await exportRequests(requests);
    } else if (nextAction.action === "Refine search") {
      await searchRequests();
    }
  } catch (error) {
    console.error(chalk.red("❌ Search error:"), error.message);
  }
};

// View Analytics Function
const viewAnalytics = async () => {
  console.log(chalk.yellow("\n📊 Fund Request Analytics\n"));

  try {
    console.log(chalk.blue("📊 Generating analytics..."));

    const analytics = await FundRequest.getAnalytics();

    // Status distribution
    const statusDistribution = await FundRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    // Department analysis
    const departmentAnalysis = await FundRequest.aggregate([
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          avgAmount: { $avg: "$amount" },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 },
    ]);

    // Monthly trends
    const monthlyTrends = await FundRequest.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" },
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]);

    // Display analytics
    console.log(chalk.green("📈 OVERVIEW STATISTICS"));
    console.log(chalk.cyan("═══════════════════════════"));
    console.log(
      `📋 Total Requests: ${chalk.yellow(analytics.totalRequests || 0)}`
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
    console.log(`⏳ Pending: ${chalk.yellow(analytics.pendingCount || 0)}`);
    console.log(`✅ Approved: ${chalk.green(analytics.approvedCount || 0)}`);
    console.log(`❌ Rejected: ${chalk.red(analytics.rejectedCount || 0)}`);
    console.log(`🚨 Urgent: ${chalk.red(analytics.urgentCount || 0)}`);

    if (analytics.approvedCount > 0) {
      const approvalRate = (
        (analytics.approvedCount / analytics.totalRequests) *
        100
      ).toFixed(1);
      console.log(`📈 Approval Rate: ${chalk.green(approvalRate + "%")}`);
    }

    // Status Distribution Table
    if (statusDistribution.length > 0) {
      console.log(chalk.green("\n📊 STATUS DISTRIBUTION"));
      const statusTable = [["Status", "Count", "Total Amount", "Percentage"]];

      statusDistribution.forEach((item) => {
        const percentage = (
          (item.count / analytics.totalRequests) *
          100
        ).toFixed(1);
        statusTable.push([
          getStatusEmoji(item._id) + " " + item._id.toUpperCase(),
          item.count.toString(),
          "₦" + item.totalAmount.toLocaleString(),
          percentage + "%",
        ]);
      });

      console.log(table(statusTable));
    }

    // Department Analysis Table
    if (departmentAnalysis.length > 0) {
      console.log(chalk.green("\n🏢 DEPARTMENT ANALYSIS (Top 10)"));
      const deptTable = [
        ["Department", "Requests", "Total Amount", "Avg Amount"],
      ];

      departmentAnalysis.forEach((item) => {
        deptTable.push([
          item._id || "N/A",
          item.count.toString(),
          "₦" + item.totalAmount.toLocaleString(),
          "₦" + Math.round(item.avgAmount).toLocaleString(),
        ]);
      });

      console.log(table(deptTable));
    }

    // Monthly Trends
    if (monthlyTrends.length > 0) {
      console.log(chalk.green("\n📅 MONTHLY TRENDS (Last 12 Months)"));
      const monthTable = [["Month", "Requests", "Total Amount"]];

      monthlyTrends.forEach((item) => {
        const monthName = new Date(
          item._id.year,
          item._id.month - 1
        ).toLocaleString("en-US", { month: "long", year: "numeric" });
        monthTable.push([
          monthName,
          item.count.toString(),
          "₦" + item.totalAmount.toLocaleString(),
        ]);
      });

      console.log(table(monthTable));
    }
  } catch (error) {
    console.error(chalk.red("❌ Analytics error:"), error.message);
  }
};

// List All Requests Function
const listAllRequests = async () => {
  console.log(chalk.yellow("\n📋 Recent Fund Requests (Last 50)\n"));

  try {
    console.log(chalk.blue("📊 Fetching requests..."));

    const requests = await FundRequest.find()
      .sort({ created_at: -1 })
      .limit(50);

    if (requests.length === 0) {
      console.log(chalk.yellow("📭 No requests found in database."));
      return;
    }

    // Display in table format
    const tableData = [
      ["ID", "Requester", "Amount", "Status", "Department", "Date", "Urgent"],
    ];

    requests.forEach((req) => {
      tableData.push([
        req._id.toString().slice(-8),
        req.requester_name,
        req.formattedAmount,
        getStatusEmoji(req.status) + " " + req.status.toUpperCase(),
        req.department || "N/A",
        new Date(req.created_at).toLocaleDateString(),
        req.urgent ? "🚨" : "📝",
      ]);
    });

    console.log(
      chalk.green(`✅ Showing ${requests.length} most recent requests:\n`)
    );
    console.log(
      table(tableData, {
        header: {
          alignment: "center",
          content: chalk.cyan("RECENT FUND REQUESTS"),
        },
      })
    );
  } catch (error) {
    console.error(chalk.red("❌ Error fetching requests:"), error.message);
  }
};

// Database Status Function
const checkDatabaseStatus = async () => {
  console.log(chalk.yellow("\n🔧 Database Status Check\n"));

  try {
    console.log(
      chalk.blue("🔍 Checking database connection and statistics...")
    );

    const isConnected = db.isConnected();
    console.log(
      `🔌 Connection Status: ${
        isConnected ? chalk.green("Connected") : chalk.red("Disconnected")
      }`
    );

    if (isConnected) {
      console.log(
        `📊 Database Name: ${chalk.cyan(
          db.getConnection().connection.db.databaseName
        )}`
      );
      console.log(`🌐 Host: ${chalk.cyan(db.getConnection().connection.host)}`);

      // Get collection stats
      const stats = await db.getCollectionStats();

      console.log(chalk.green("\n📊 COLLECTION STATISTICS"));
      console.log(chalk.cyan("═════════════════════════"));

      Object.entries(stats).forEach(([collection, stat]) => {
        console.log(`📁 ${collection}:`);
        console.log(
          `   Documents: ${chalk.yellow(stat.documentCount.toLocaleString())}`
        );
        console.log(
          `   Size: ${chalk.yellow((stat.size / 1024).toFixed(2))} KB`
        );
        console.log(
          `   Avg Size: ${chalk.yellow(Math.round(stat.avgObjSize))} bytes`
        );
        console.log(`   Indexes: ${chalk.yellow(stat.indexes)}`);
        console.log();
      });

      // Quick analytics
      const totalRequests = await FundRequest.countDocuments();
      const pendingRequests = await FundRequest.countDocuments({
        status: "pending",
      });
      const overdueRequests = await FundRequest.countDocuments({
        status: "pending",
        created_at: { $lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      });

      console.log(chalk.green("📈 QUICK STATS"));
      console.log(chalk.cyan("═══════════════"));
      console.log(`📋 Total Fund Requests: ${chalk.yellow(totalRequests)}`);
      console.log(`⏳ Pending Requests: ${chalk.yellow(pendingRequests)}`);
      console.log(
        `⚠️  Overdue Requests (>7 days): ${chalk.red(overdueRequests)}`
      );
    }
  } catch (error) {
    console.error(chalk.red("❌ Status check error:"), error.message);
  }
};

// Helper function to get status emoji
const getStatusEmoji = (status) => {
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
};

// View detailed request information
const viewRequestDetails = async (requests) => {
  const choices = requests.map((req) => ({
    name: `${req.requester_name} - ${req.formattedAmount} - ${req.status}`,
    value: req._id,
  }));

  const selection = await inquirer.prompt([
    {
      type: "list",
      name: "requestId",
      message: "Select a request to view details:",
      choices: choices,
    },
  ]);

  const request = requests.find(
    (req) => req._id.toString() === selection.requestId.toString()
  );

  console.log(chalk.green("\n📋 REQUEST DETAILS"));
  console.log(chalk.cyan("═══════════════════"));
  console.log(`🆔 ID: ${request._id}`);
  console.log(`👤 Requester: ${request.requester_name}`);
  console.log(`📧 Email: ${request.requester_email}`);
  console.log(`💰 Amount: ${request.formattedAmount}`);
  console.log(`📝 Purpose: ${request.purpose}`);
  console.log(`📄 Description: ${request.description || "N/A"}`);
  console.log(`🏢 Department: ${request.department || "N/A"}`);
  console.log(
    `📊 Status: ${getStatusEmoji(
      request.status
    )} ${request.status.toUpperCase()}`
  );
  console.log(`🚨 Urgent: ${request.urgent ? "Yes" : "No"}`);
  console.log(`📅 Created: ${new Date(request.created_at).toLocaleString()}`);
  console.log(`👨‍💼 Approver: ${request.approver_email}`);

  if (request.approved_date) {
    console.log(
      `✅ Approved: ${new Date(request.approved_date).toLocaleString()}`
    );
  }

  if (request.approval_comments) {
    console.log(`💬 Comments: ${request.approval_comments}`);
  }

  if (request.rejection_reason) {
    console.log(`❌ Rejection Reason: ${request.rejection_reason}`);
  }

  console.log(`⏱️  Age: ${request.ageInDays} days`);

  if (request.isOverdue()) {
    console.log(chalk.red("⚠️  This request is OVERDUE!"));
  }
};

// Export function placeholder
const exportRequests = async (requests) => {
  console.log(chalk.yellow("\n📈 Export functionality coming soon!"));
  console.log("This will export the requests to CSV, Excel, or JSON format.");
};

// Main CLI Function
const main = async () => {
  try {
    // Connect to database
    await db.connect();

    while (true) {
      showHeader();

      const action = await showMainMenu();

      switch (action) {
        case "search":
          await searchRequests();
          break;
        case "analytics":
          await viewAnalytics();
          break;
        case "list":
          await listAllRequests();
          break;
        case "export":
          await exportRequests();
          break;
        case "status":
          await checkDatabaseStatus();
          break;
        case "advanced":
          console.log(chalk.yellow("\n⚙️ Advanced queries coming soon!"));
          break;
        case "exit":
          console.log(chalk.green("\n👋 Goodbye!"));
          process.exit(0);
      }

      // Wait for user to continue
      await inquirer.prompt([
        {
          type: "input",
          name: "continue",
          message: chalk.gray("Press Enter to continue..."),
        },
      ]);
    }
  } catch (error) {
    console.error(chalk.red("❌ Application error:"), error.message);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
};

// Handle process termination
process.on("SIGINT", async () => {
  console.log(chalk.yellow("\n\n🛑 Shutting down..."));
  await db.disconnect();
  process.exit(0);
});

// Start the CLI if run directly
if (require.main === module) {
  main();
}

module.exports = { main };
