#!/usr/bin/env node

/**
 * Fund Request System - Comprehensive Diagnostic Tool
 *
 * This tool combines all diagnostic functionality:
 * - Database connection testing (dev/prod)
 * - Request lookup and validation
 * - Email system testing and retry
 * - Environment configuration validation
 * - Cross-database request searching
 *
 * Usage:
 *   node diagnostic.js [command] [options]
 *
 * Commands:
 *   check [request-id]     - Check specific request across all databases
 *   list [env]            - List recent requests (dev/prod)
 *   email [request-id]    - Test email functionality for a request
 *   db                    - Database diagnostics and statistics
 *   env                   - Environment configuration check
 *   help                  - Show this help message
 */

const readline = require("readline");
const mongoose = require("mongoose");

// Environment configuration loader
const loadEnvironmentConfig = (forceEnv = null) => {
  const env = forceEnv || process.env.NODE_ENV || "development";

  // Clear any existing dotenv configuration
  delete require.cache[require.resolve("dotenv")];

  if (env === "production") {
    console.log("🚀 Loading PRODUCTION configuration...");
    const result = require("dotenv").config({ path: "./.env.production" });
    if (result.error) {
      console.error("❌ Error loading .env.production:", result.error);
      require("dotenv").config();
    }
  } else {
    console.log("🌱 Loading DEVELOPMENT configuration...");
    require("dotenv").config();
  }

  return env;
};

// Fund Request Schema
const fundRequestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    requester_name: { type: String, required: true, trim: true },
    requester_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    approver_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      default: "NGN",
      enum: ["NGN", "USD", "EUR", "GBP", "CAD"],
    },
    purpose: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    department: { type: String, trim: true },
    category: { type: String, trim: true },
    urgent: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approval_token: { type: String, required: true, unique: true, index: true },
    approved_by: { type: String, trim: true },
    approved_at: Date,
    comments: { type: String, trim: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Database connection manager
class DatabaseManager {
  constructor() {
    this.connections = new Map();
    this.models = new Map();
  }

  async connectToDatabase(dbName, env = "development") {
    const key = `${env}_${dbName}`;

    if (this.connections.has(key)) {
      return this.connections.get(key);
    }

    const baseUri =
      "mongodb+srv://fundrequest:fundrequest223@requests.wbonoix.mongodb.net";
    const connectionString = `${baseUri}/${dbName}?retryWrites=true&w=majority&appName=Requests`;

    try {
      console.log(`🔗 Connecting to ${dbName} (${env})...`);
      const connection = mongoose.createConnection(connectionString, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });

      const model = connection.model("FundRequest", fundRequestSchema);

      this.connections.set(key, connection);
      this.models.set(key, model);

      console.log(`✅ Connected to ${dbName}`);
      return connection;
    } catch (error) {
      console.error(`❌ Failed to connect to ${dbName}:`, error.message);
      throw error;
    }
  }

  getModel(dbName, env = "development") {
    const key = `${env}_${dbName}`;
    return this.models.get(key);
  }

  async closeAll() {
    for (const connection of this.connections.values()) {
      await connection.close();
    }
    this.connections.clear();
    this.models.clear();
  }
}

// Interactive input helper
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

// Command handlers
class DiagnosticTool {
  constructor() {
    this.dbManager = new DatabaseManager();
  }

  async checkRequest(requestId) {
    console.log("🔍 CROSS-DATABASE REQUEST CHECKER");
    console.log("=================================");
    console.log(`🔍 Searching for: ${requestId}\n`);

    let foundInDev = null;
    let foundInProd = null;

    try {
      // Check development database
      console.log("🌱 DEVELOPMENT DATABASE:");
      console.log("------------------------");
      await this.dbManager.connectToDatabase("fundrequest_dev", "development");
      const devModel = this.dbManager.getModel(
        "fundrequest_dev",
        "development"
      );
      foundInDev = await devModel.findOne({ id: requestId });

      if (foundInDev) {
        console.log("✅ FOUND in development database!");
        this.displayRequestInfo(foundInDev);
      } else {
        console.log("❌ NOT FOUND in development database");
        await this.showRecentRequests(devModel, "development");
      }

      console.log("");

      // Check production database
      console.log("🚀 PRODUCTION DATABASE:");
      console.log("-----------------------");
      await this.dbManager.connectToDatabase("fundrequest_prod", "production");
      const prodModel = this.dbManager.getModel(
        "fundrequest_prod",
        "production"
      );
      foundInProd = await prodModel.findOne({ id: requestId });

      if (foundInProd) {
        console.log("✅ FOUND in production database!");
        this.displayRequestInfo(foundInProd);
      } else {
        console.log("❌ NOT FOUND in production database");
        await this.showRecentRequests(prodModel, "production");
      }

      console.log("\n📊 SUMMARY:");
      console.log("===========");
      if (foundInDev && foundInProd) {
        console.log("✅ Found in BOTH databases");
      } else if (foundInDev) {
        console.log("✅ Found in DEVELOPMENT only");
      } else if (foundInProd) {
        console.log("✅ Found in PRODUCTION only");
      } else {
        console.log("❌ NOT FOUND in either database");
      }

      return foundInDev || foundInProd;
    } catch (error) {
      console.error("❌ Error:", error.message);
      return null;
    }
  }

  async listRequests(env = "both") {
    console.log("📋 FUND REQUESTS LISTING");
    console.log("========================\n");

    try {
      if (env === "both" || env === "development" || env === "dev") {
        console.log("🌱 DEVELOPMENT DATABASE:");
        console.log("------------------------");
        await this.dbManager.connectToDatabase(
          "fundrequest_dev",
          "development"
        );
        const devModel = this.dbManager.getModel(
          "fundrequest_dev",
          "development"
        );
        await this.showDetailedRequests(devModel, "development");
        console.log("");
      }

      if (env === "both" || env === "production" || env === "prod") {
        console.log("🚀 PRODUCTION DATABASE:");
        console.log("-----------------------");
        await this.dbManager.connectToDatabase(
          "fundrequest_prod",
          "production"
        );
        const prodModel = this.dbManager.getModel(
          "fundrequest_prod",
          "production"
        );
        await this.showDetailedRequests(prodModel, "production");
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
    }
  }

  async testEmail(requestId) {
    console.log("📧 EMAIL SYSTEM TESTING");
    console.log("=======================\n");

    try {
      // Find the request first
      const request = await this.findRequestAnyDatabase(requestId);

      if (!request) {
        console.log(`❌ Request ${requestId} not found in any database`);
        return;
      }

      console.log("📋 Request found! Details:");
      this.displayRequestInfo(request);

      // Determine expected emails based on status
      let expectedEmails = [];
      if (request.status === "pending") {
        expectedEmails.push({
          type: "approval",
          recipient: request.approver_email,
          name: "Approval Request",
        });
        expectedEmails.push({
          type: "confirmation",
          recipient: request.requester_email,
          name: "Confirmation",
        });
      } else if (
        request.status === "approved" ||
        request.status === "rejected"
      ) {
        expectedEmails.push({
          type: "status",
          recipient: request.requester_email,
          name: "Status Notification",
        });
      }

      console.log(`\n📧 Expected Emails (${expectedEmails.length}):`);
      expectedEmails.forEach((email, i) => {
        console.log(`   ${i + 1}. ${email.name} → ${email.recipient}`);
      });

      // Ask user about email delivery status
      console.log(`\n🔍 EMAIL DELIVERY CHECK:`);
      console.log("======================");

      let emailStatus = {};
      let missingEmails = [];

      for (const email of expectedEmails) {
        const sent = await askQuestion(
          `📧 Was "${email.name}" sent to ${email.recipient}? (y/n): `
        );
        emailStatus[email.type] = sent === "y" || sent === "yes";

        if (!emailStatus[email.type]) {
          missingEmails.push(email);
        }

        console.log(
          `   ${email.name}: ${
            emailStatus[email.type] ? "✅ CONFIRMED" : "❌ MISSING"
          }`
        );
      }

      // Summary
      const totalEmails = expectedEmails.length;
      const sentEmails = Object.values(emailStatus).filter(Boolean).length;

      console.log(`\n📊 SUMMARY:`);
      console.log(`=========`);
      console.log(`✅ Delivered: ${sentEmails}/${totalEmails} emails`);
      console.log(`❌ Missing: ${missingEmails.length}/${totalEmails} emails`);

      if (missingEmails.length > 0) {
        console.log(`\n⚠️  MISSING EMAILS:`);
        missingEmails.forEach((email, i) => {
          console.log(`   ${i + 1}. ${email.name} → ${email.recipient}`);
        });

        const retry = await askQuestion(
          `\n🔄 Would you like to retry sending missing emails? (y/n): `
        );

        if (retry === "y" || retry === "yes") {
          console.log("🚀 Email retry functionality would go here");
          console.log(
            "💡 For now, check your SMTP configuration and try submitting a new request"
          );
        }
      } else {
        console.log(`\n🎉 ALL EMAILS CONFIRMED DELIVERED!`);
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
    }
  }

  async databaseDiagnostics() {
    console.log("🗄️  DATABASE DIAGNOSTICS");
    console.log("========================\n");

    try {
      const env = loadEnvironmentConfig();
      console.log(`🌍 Current Environment: ${env}`);
      console.log(
        `🗄️ Database URI: ${
          process.env.MONGODB_URI?.replace(/:[^:@]*@/, ":***@") || "NOT SET"
        }\n`
      );

      // Test both databases
      const databases = [
        { name: "fundrequest_dev", label: "Development" },
        { name: "fundrequest_prod", label: "Production" },
      ];

      for (const db of databases) {
        console.log(`📊 ${db.label.toUpperCase()} DATABASE (${db.name}):`);
        console.log("=".repeat(db.label.length + 20));

        try {
          await this.dbManager.connectToDatabase(db.name, env);
          const model = this.dbManager.getModel(db.name, env);

          const allRequests = await model.find({}).sort({ created_at: -1 });
          console.log(`📋 Total requests: ${allRequests.length}`);

          if (allRequests.length > 0) {
            // Status breakdown
            const statuses = allRequests.reduce((acc, req) => {
              acc[req.status] = (acc[req.status] || 0) + 1;
              return acc;
            }, {});

            console.log("📊 Status breakdown:");
            Object.entries(statuses).forEach(([status, count]) => {
              console.log(`   ${status.toUpperCase()}: ${count}`);
            });

            // Today's requests
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayRequests = allRequests.filter(
              (req) => new Date(req.created_at) >= today
            );
            console.log(`📅 Submitted today: ${todayRequests.length}`);

            // Recent requests
            console.log(`📋 Recent requests (last 3):`);
            allRequests.slice(0, 3).forEach((req, index) => {
              console.log(
                `   ${index + 1}. ${req.id.substring(0, 8)}... - ${
                  req.purpose
                } (${req.status})`
              );
            });
          } else {
            console.log("❌ No requests found");
          }
        } catch (error) {
          console.log(`❌ Connection failed: ${error.message}`);
        }

        console.log("");
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
    }
  }

  async environmentCheck() {
    console.log("🌍 ENVIRONMENT CONFIGURATION CHECK");
    console.log("==================================\n");

    const configs = [
      { name: "Development", path: "./.env", env: "development" },
      { name: "Production", path: "./.env.production", env: "production" },
    ];

    for (const config of configs) {
      console.log(
        `${
          config.env === "production" ? "🚀" : "🌱"
        } ${config.name.toUpperCase()}:`
      );
      console.log("-".repeat(config.name.length + 2));

      try {
        const env = loadEnvironmentConfig(config.env);

        console.log(`✅ Environment loaded: ${env}`);
        console.log(
          `🗄️ MongoDB URI: ${process.env.MONGODB_URI ? "SET" : "NOT SET"}`
        );
        console.log(`📧 Email Host: ${process.env.EMAIL_HOST || "NOT SET"}`);
        console.log(`📧 Email User: ${process.env.EMAIL_USER || "NOT SET"}`);
        console.log(
          `🌐 Frontend URL: ${process.env.FRONTEND_URL || "NOT SET"}`
        );
        console.log(
          `🔑 JWT Secret: ${process.env.JWT_SECRET ? "SET" : "NOT SET"}`
        );

        // Test database connection
        if (process.env.MONGODB_URI) {
          const dbName =
            config.env === "production"
              ? "fundrequest_prod"
              : "fundrequest_dev";
          try {
            await this.dbManager.connectToDatabase(dbName, config.env);
            console.log(`✅ Database connection: SUCCESS`);
          } catch (error) {
            console.log(`❌ Database connection: FAILED - ${error.message}`);
          }
        }
      } catch (error) {
        console.log(`❌ Configuration error: ${error.message}`);
      }

      console.log("");
    }
  }

  // Helper methods
  displayRequestInfo(request) {
    console.log(`📋 Request: ${request.purpose}`);
    console.log(`💰 Amount: ${request.amount} ${request.currency}`);
    console.log(`📊 Status: ${request.status.toUpperCase()}`);
    console.log(`👤 Requester: ${request.requester_email}`);
    console.log(`👨‍💼 Approver: ${request.approver_email}`);
    console.log(`📅 Created: ${new Date(request.created_at).toLocaleString()}`);
    console.log(`🔑 Approval Token: ${request.approval_token}`);
  }

  async showRecentRequests(model, env, limit = 3) {
    const recent = await model.find({}).sort({ created_at: -1 }).limit(limit);
    if (recent.length > 0) {
      console.log(`📋 Recent requests in ${env}:`);
      recent.forEach((req, index) => {
        console.log(
          `   ${index + 1}. ${req.id} - ${req.purpose} (${new Date(
            req.created_at
          ).toLocaleDateString()})`
        );
      });
    } else {
      console.log(`   No requests found in ${env} database`);
    }
  }

  async showDetailedRequests(model, env, limit = 10) {
    const requests = await model.find({}).sort({ created_at: -1 }).limit(limit);

    if (requests.length === 0) {
      console.log("❌ No requests found");
      return;
    }

    console.log(`📋 Found ${requests.length} request(s):\n`);

    requests.forEach((req, index) => {
      console.log(`${index + 1}. Request ID: ${req.id}`);
      console.log(`   Purpose: ${req.purpose}`);
      console.log(`   Amount: ${req.amount} ${req.currency}`);
      console.log(`   Status: ${req.status.toUpperCase()}`);
      console.log(`   Created: ${new Date(req.created_at).toLocaleString()}`);
      console.log(
        `   From: ${req.requester_email} → To: ${req.approver_email}`
      );
      console.log("");
    });
  }

  async findRequestAnyDatabase(requestId) {
    // Try development database first
    try {
      await this.dbManager.connectToDatabase("fundrequest_dev", "development");
      const devModel = this.dbManager.getModel(
        "fundrequest_dev",
        "development"
      );
      const devRequest = await devModel.findOne({ id: requestId });
      if (devRequest) return devRequest;
    } catch (error) {
      console.log("⚠️ Could not check development database");
    }

    // Try production database
    try {
      await this.dbManager.connectToDatabase("fundrequest_prod", "production");
      const prodModel = this.dbManager.getModel(
        "fundrequest_prod",
        "production"
      );
      const prodRequest = await prodModel.findOne({ id: requestId });
      if (prodRequest) return prodRequest;
    } catch (error) {
      console.log("⚠️ Could not check production database");
    }

    return null;
  }

  showHelp() {
    console.log(`
📊 Fund Request System - Diagnostic Tool
========================================

Usage: node diagnostic.js [command] [options]

Commands:
  check <request-id>    Check specific request across databases
  list [env]           List requests (env: dev, prod, both)
  email <request-id>   Test email functionality for request
  db                   Database diagnostics and statistics
  env                  Environment configuration check
  help                 Show this help message

Examples:
  node diagnostic.js check 952522d2-ae3a-4915-8b1f-fca3267f6546
  node diagnostic.js list prod
  node diagnostic.js email 952522d2-ae3a-4915-8b1f-fca3267f6546
  node diagnostic.js db
  node diagnostic.js env

Environment:
  Set NODE_ENV=production to use production configuration
  Default: development environment
    `);
  }

  async cleanup() {
    await this.dbManager.closeAll();
    rl.close();
  }
}

// Main execution
async function main() {
  const tool = new DiagnosticTool();
  const [, , command, ...args] = process.argv;

  try {
    switch (command) {
      case "check":
        if (!args[0]) {
          console.log("❌ Please provide a request ID");
          console.log("Usage: node diagnostic.js check <request-id>");
          break;
        }
        await tool.checkRequest(args[0]);
        break;

      case "list":
        await tool.listRequests(args[0] || "both");
        break;

      case "email":
        if (!args[0]) {
          console.log("❌ Please provide a request ID");
          console.log("Usage: node diagnostic.js email <request-id>");
          break;
        }
        await tool.testEmail(args[0]);
        break;

      case "db":
        await tool.databaseDiagnostics();
        break;

      case "env":
        await tool.environmentCheck();
        break;

      case "help":
      case undefined:
        tool.showHelp();
        break;

      default:
        console.log(`❌ Unknown command: ${command}`);
        tool.showHelp();
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await tool.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = DiagnosticTool;
