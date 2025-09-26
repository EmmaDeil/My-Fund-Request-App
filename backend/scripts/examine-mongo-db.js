const mongoose = require("mongoose");
const db = require("./models/mongoDatabase");
require("dotenv").config();

console.log("🔍 Examining MongoDB Fund Request Database\n");

async function examineDatabase() {
  try {
    // Connect to MongoDB
    await db.init();

    console.log("📊 Database Connection: ✅ Connected to MongoDB\n");

    // Get all fund requests
    const requests = await db.getAllFundRequests();
    console.log(`📋 Total Fund Requests: ${requests.length}\n`);

    if (requests.length > 0) {
      console.log("📄 Fund Requests Details:");
      console.log("=".repeat(80));

      requests.forEach((request, index) => {
        console.log(`\n${index + 1}. Request ID: ${request.id}`);
        console.log(
          `   Requester: ${request.requester_name} (${request.requester_email})`
        );
        console.log(
          `   Amount: ${request.currency} ${request.amount.toLocaleString()}`
        );
        console.log(`   Purpose: ${request.purpose}`);
        console.log(`   Status: ${request.status.toUpperCase()}`);
        console.log(`   Approver: ${request.approver_email}`);
        console.log(`   Department: ${request.department || "N/A"}`);
        console.log(`   Category: ${request.category || "N/A"}`);
        console.log(`   Urgent: ${request.urgent ? "YES" : "NO"}`);
        console.log(
          `   Created: ${new Date(request.created_at).toLocaleString()}`
        );
        console.log(
          `   Updated: ${new Date(request.updated_at).toLocaleString()}`
        );

        if (request.approved_at) {
          console.log(
            `   Approved: ${new Date(request.approved_at).toLocaleString()}`
          );
          console.log(`   Approved by: ${request.approved_by || "N/A"}`);
        }

        if (request.approval_notes) {
          console.log(`   Notes: ${request.approval_notes}`);
        }

        if (request.description) {
          console.log(`   Description: ${request.description}`);
        }

        console.log(`   Token: ${request.approval_token || "N/A"}`);
        console.log("-".repeat(80));
      });
    } else {
      console.log("📭 No fund requests found in the database.");
    }

    // Get statistics
    console.log("\n📈 Database Statistics:");
    console.log("=".repeat(40));

    const stats = await db.getStatistics();
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Urgent Requests: ${stats.urgentRequests}`);

    console.log("\nBy Status:");
    Object.entries(stats.byStatus).forEach(([status, data]) => {
      console.log(
        `  ${status.toUpperCase()}: ${
          data.count
        } requests (Total: $${data.totalAmount.toLocaleString()})`
      );
    });

    // Show database indexes and collection info
    console.log("\n🔍 Collection Information:");
    console.log("=".repeat(40));

    const collection = mongoose.connection.db.collection("fundrequests");
    const indexes = await collection.indexes();

    console.log("Indexes:");
    indexes.forEach((index, i) => {
      console.log(
        `  ${i + 1}. ${JSON.stringify(index.key)} ${
          index.name ? `(${index.name})` : ""
        }`
      );
    });

    const dbStats = await mongoose.connection.db.stats();
    console.log(`\nDatabase Stats:`);
    console.log(`  Collections: ${dbStats.collections}`);
    console.log(
      `  Data Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`
    );
    console.log(
      `  Storage Size: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`
    );
    console.log(`  Indexes: ${dbStats.indexes}`);
    console.log(
      `  Index Size: ${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`
    );
  } catch (error) {
    console.error("❌ Error examining database:", error.message);
  } finally {
    await db.close();
    console.log("\n✅ Database examination completed.");
  }
}

examineDatabase();
