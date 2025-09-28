#!/usr/bin/env node

const { program } = require("commander");
const chalk = require("chalk");
const { table } = require("table");
const fs = require("fs");
const path = require("path");
const db = require("./utils/database");
const FundRequest = require("./models/FundRequest");

// Configure CLI commands
program
  .name("search")
  .description("Advanced search tool for Fund Request database")
  .version("1.0.0");

program
  .option(
    "-s, --status <status>",
    "Filter by status (pending, approved, rejected)"
  )
  .option("-d, --department <dept>", "Filter by department")
  .option("-min, --min-amount <amount>", "Minimum amount", parseFloat)
  .option("-max, --max-amount <amount>", "Maximum amount", parseFloat)
  .option(
    "-c, --currency <currency>",
    "Filter by currency (NGN, USD, EUR, CAD)"
  )
  .option("-u, --urgent", "Show only urgent requests")
  .option("-nu, --not-urgent", "Show only non-urgent requests")
  .option("-r, --requester <email>", "Filter by requester email")
  .option("-a, --approver <email>", "Filter by approver email")
  .option("-t, --text <search>", "Search in purpose, description, and names")
  .option("--start-date <date>", "Start date (YYYY-MM-DD)")
  .option("--end-date <date>", "End date (YYYY-MM-DD)")
  .option("--sort <field>", "Sort by field (date, amount, status)", "date")
  .option("--order <order>", "Sort order (asc, desc)", "desc")
  .option("--limit <number>", "Limit results", parseInt, 50)
  .option("--export <format>", "Export results (json, csv)")
  .option("--output <file>", "Output file name")
  .option("--verbose", "Verbose output")
  .action(async (options) => {
    await searchRequests(options);
  });

// Quick search commands
program
  .command("pending")
  .description("Show all pending requests")
  .option("--urgent", "Show only urgent pending requests")
  .option("--overdue", "Show only overdue requests (>7 days)")
  .action(async (options) => {
    const filters = { status: "pending" };
    if (options.urgent) filters.urgent = true;

    if (options.overdue) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      filters.endDate = sevenDaysAgo.toISOString().split("T")[0];
    }

    await searchRequests(filters);
  });

program
  .command("approved")
  .description("Show all approved requests")
  .option("-days <days>", "Approved in last N days", parseInt)
  .action(async (options) => {
    const filters = { status: "approved" };

    if (options.days) {
      const startDate = new Date(
        Date.now() - options.days * 24 * 60 * 60 * 1000
      );
      filters.startDate = startDate.toISOString().split("T")[0];
    }

    await searchRequests(filters);
  });

program
  .command("high-value")
  .description("Show high-value requests")
  .option(
    "--threshold <amount>",
    "Minimum amount threshold",
    parseFloat,
    1000000
  )
  .option("--currency <currency>", "Currency filter", "NGN")
  .action(async (options) => {
    await searchRequests({
      minAmount: options.threshold,
      currency: options.currency,
    });
  });

program
  .command("department <dept>")
  .description("Show requests from specific department")
  .action(async (dept) => {
    await searchRequests({ department: dept });
  });

// Main search function
async function searchRequests(options = {}) {
  try {
    console.log(chalk.blue("🔌 Connecting to database..."));
    await db.connect();

    console.log(chalk.blue("🔍 Searching fund requests..."));

    // Build query filters
    const filters = {};

    if (options.status) filters.status = options.status;
    if (options.department) filters.department = options.department;
    if (options.minAmount) filters.minAmount = options.minAmount;
    if (options.maxAmount) filters.maxAmount = options.maxAmount;
    if (options.currency) filters.currency = options.currency;
    if (options.urgent) filters.urgent = true;
    if (options.notUrgent) filters.urgent = false;
    if (options.requester) filters.requesterEmail = options.requester;
    if (options.approver) filters.approverEmail = options.approver;
    if (options.text) filters.search = options.text;
    if (options.startDate) filters.startDate = options.startDate;
    if (options.endDate) filters.endDate = options.endDate;

    // Execute search
    let query = FundRequest.findByFilters(filters);

    // Apply sorting
    const sortField = getSortField(options.sort);
    const sortOrder = options.order === "asc" ? 1 : -1;
    query = query.sort({ [sortField]: sortOrder });

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const requests = await query;

    if (requests.length === 0) {
      console.log(chalk.yellow("📭 No requests found matching your criteria."));
      return;
    }

    // Display results
    if (options.verbose) {
      await displayDetailedResults(requests);
    } else {
      await displayTableResults(requests);
    }

    // Export if requested
    if (options.export) {
      await exportResults(requests, options.export, options.output);
    }

    // Display summary
    displaySummary(requests, filters);
  } catch (error) {
    console.error(chalk.red("❌ Search error:"), error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

// Get sort field mapping
function getSortField(sort) {
  const fieldMap = {
    date: "created_at",
    amount: "amount",
    status: "status",
    name: "requester_name",
    department: "department",
  };
  return fieldMap[sort] || "created_at";
}

// Display results in table format
async function displayTableResults(requests) {
  const tableData = [
    ["ID", "Requester", "Amount", "Status", "Department", "Date", "Urgent"],
  ];

  requests.forEach((req) => {
    tableData.push([
      req._id.toString().slice(-8),
      req.requester_name.length > 20
        ? req.requester_name.slice(0, 17) + "..."
        : req.requester_name,
      req.formattedAmount,
      getStatusDisplay(req.status),
      (req.department || "N/A").length > 15
        ? (req.department || "N/A").slice(0, 12) + "..."
        : req.department || "N/A",
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
}

// Display detailed results
async function displayDetailedResults(requests) {
  console.log(chalk.green(`\n✅ Found ${requests.length} requests:\n`));

  requests.forEach((req, index) => {
    console.log(chalk.cyan(`\n📋 Request #${index + 1}`));
    console.log(chalk.gray("═══════════════════════════════"));
    console.log(`🆔 ID: ${req._id}`);
    console.log(`👤 Requester: ${req.requester_name} (${req.requester_email})`);
    console.log(`💰 Amount: ${req.formattedAmount}`);
    console.log(`📝 Purpose: ${req.purpose}`);
    console.log(`🏢 Department: ${req.department || "N/A"}`);
    console.log(`📊 Status: ${getStatusDisplay(req.status)}`);
    console.log(`🚨 Urgent: ${req.urgent ? "Yes" : "No"}`);
    console.log(`📅 Created: ${new Date(req.created_at).toLocaleString()}`);
    console.log(`⏱️  Age: ${req.ageInDays} days`);
    console.log(`👨‍💼 Approver: ${req.approver_email}`);

    if (req.description) {
      console.log(`📄 Description: ${req.description}`);
    }

    if (req.approved_date) {
      console.log(
        `✅ Approved: ${new Date(req.approved_date).toLocaleString()}`
      );
    }

    if (req.approval_comments) {
      console.log(`💬 Comments: ${req.approval_comments}`);
    }

    if (req.rejection_reason) {
      console.log(`❌ Rejection: ${req.rejection_reason}`);
    }

    if (req.isOverdue()) {
      console.log(chalk.red("⚠️  OVERDUE REQUEST!"));
    }
  });
}

// Export results
async function exportResults(requests, format, outputFile) {
  try {
    const exportDir = path.join(__dirname, "..", "exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = outputFile || `search_results_${timestamp}.${format}`;
    const filePath = path.join(exportDir, fileName);

    if (format === "json") {
      await exportToJSON(requests, filePath);
    } else if (format === "csv") {
      await exportToCSV(requests, filePath);
    }

    console.log(chalk.green(`\n📄 Results exported to: ${filePath}`));
  } catch (error) {
    console.error(chalk.red("❌ Export error:"), error.message);
  }
}

// Export to JSON
async function exportToJSON(requests, filePath) {
  const data = requests.map((req) => ({
    id: req._id.toString(),
    requester_name: req.requester_name,
    requester_email: req.requester_email,
    amount: req.amount,
    currency: req.currency,
    formatted_amount: req.formattedAmount,
    purpose: req.purpose,
    description: req.description,
    department: req.department,
    status: req.status,
    urgent: req.urgent,
    created_at: req.created_at,
    updated_at: req.updated_at,
    approver_email: req.approver_email,
    approved_date: req.approved_date,
    approval_comments: req.approval_comments,
    rejection_reason: req.rejection_reason,
    age_in_days: req.ageInDays,
    is_overdue: req.isOverdue(),
  }));

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Export to CSV
async function exportToCSV(requests, filePath) {
  const headers = [
    "ID",
    "Requester Name",
    "Requester Email",
    "Amount",
    "Currency",
    "Purpose",
    "Description",
    "Department",
    "Status",
    "Urgent",
    "Created Date",
    "Approver Email",
    "Approved Date",
    "Comments",
    "Age (Days)",
  ].join(",");

  const rows = requests.map((req) =>
    [
      req._id.toString(),
      `"${req.requester_name}"`,
      req.requester_email,
      req.amount,
      req.currency,
      `"${req.purpose}"`,
      `"${req.description || ""}"`,
      `"${req.department || ""}"`,
      req.status,
      req.urgent,
      req.created_at.toISOString(),
      req.approver_email,
      req.approved_date ? req.approved_date.toISOString() : "",
      `"${req.approval_comments || ""}"`,
      req.ageInDays,
    ].join(",")
  );

  const csv = [headers, ...rows].join("\n");
  fs.writeFileSync(filePath, csv);
}

// Display summary statistics
function displaySummary(requests, filters) {
  console.log(chalk.green("\n📊 SEARCH SUMMARY"));
  console.log(chalk.cyan("═══════════════════"));

  const totalAmount = requests.reduce((sum, req) => sum + req.amount, 0);
  const avgAmount = requests.length > 0 ? totalAmount / requests.length : 0;

  const statusCounts = requests.reduce((counts, req) => {
    counts[req.status] = (counts[req.status] || 0) + 1;
    return counts;
  }, {});

  const urgentCount = requests.filter((req) => req.urgent).length;
  const overdueCount = requests.filter((req) => req.isOverdue()).length;

  console.log(`📋 Total Results: ${chalk.yellow(requests.length)}`);
  console.log(
    `💰 Total Amount: ${chalk.yellow("₦" + totalAmount.toLocaleString())}`
  );
  console.log(
    `📊 Average Amount: ${chalk.yellow(
      "₦" + Math.round(avgAmount).toLocaleString()
    )}`
  );

  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(
      `${getStatusEmoji(status)} ${status.toUpperCase()}: ${chalk.yellow(
        count
      )}`
    );
  });

  if (urgentCount > 0) {
    console.log(`🚨 Urgent: ${chalk.red(urgentCount)}`);
  }

  if (overdueCount > 0) {
    console.log(`⚠️  Overdue: ${chalk.red(overdueCount)}`);
  }

  // Display active filters
  const activeFilters = Object.entries(filters).filter(
    ([_, value]) => value !== undefined
  );
  if (activeFilters.length > 0) {
    console.log(chalk.green("\n🔍 ACTIVE FILTERS"));
    console.log(chalk.cyan("═══════════════════"));
    activeFilters.forEach(([key, value]) => {
      console.log(`${key}: ${chalk.yellow(value)}`);
    });
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

// Parse and run
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.help();
}
