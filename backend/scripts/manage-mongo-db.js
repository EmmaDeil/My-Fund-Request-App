const mongoose = require("mongoose");
const db = require("./models/mongoDatabase");
require("dotenv").config();

console.log("🛠️  MongoDB Fund Request Database Management Tool\n");

async function showMenu() {
  console.log("Available Operations:");
  console.log("1. View all fund requests");
  console.log("2. Create test fund request");
  console.log("3. Delete fund request by ID");
  console.log("4. Clear all fund requests");
  console.log("5. Get statistics");
  console.log("6. Update request status");
  console.log("7. Exit");
}

async function viewAllRequests() {
  try {
    const requests = await db.getAllFundRequests();
    console.log(`\n📋 Found ${requests.length} fund requests:\n`);

    if (requests.length > 0) {
      requests.forEach((request, index) => {
        console.log(`${index + 1}. ID: ${request.id}`);
        console.log(
          `   ${request.requester_name} - ${request.currency} ${request.amount}`
        );
        console.log(
          `   Status: ${request.status.toUpperCase()} | ${request.purpose}`
        );
        console.log(
          `   Created: ${new Date(request.created_at).toLocaleString()}\n`
        );
      });
    } else {
      console.log("📭 No fund requests found.");
    }
  } catch (error) {
    console.error("❌ Error viewing requests:", error.message);
  }
}

async function createTestRequest() {
  try {
    const { v4: uuidv4 } = require("uuid");

    const testData = {
      id: uuidv4(),
      requester_name: "John Doe",
      requester_email: "john.doe@company.com",
      amount: 1500.0,
      currency: "USD",
      purpose: "Professional development conference",
      description: "Attending TechConf 2025 for skills development",
      approver_email: "manager@company.com",
      approval_token: uuidv4(),
      department: "Engineering",
      category: "Training",
      urgent: false,
    };

    const created = await db.createFundRequest(testData);
    console.log(`\n✅ Test fund request created with ID: ${created.id}`);
  } catch (error) {
    console.error("❌ Error creating test request:", error.message);
  }
}

async function deleteRequest(requestId) {
  try {
    await db.deleteFundRequest(requestId);
    console.log(`\n✅ Fund request ${requestId} deleted successfully.`);
  } catch (error) {
    console.error("❌ Error deleting request:", error.message);
  }
}

async function clearAllRequests() {
  try {
    const { FundRequest } = require("./models/mongoDatabase");
    const result = await FundRequest.deleteMany({});
    console.log(
      `\n✅ Cleared ${result.deletedCount} fund requests from database.`
    );
  } catch (error) {
    console.error("❌ Error clearing requests:", error.message);
  }
}

async function getStatistics() {
  try {
    const stats = await db.getStatistics();
    console.log("\n📈 Database Statistics:");
    console.log("=".repeat(40));
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
  } catch (error) {
    console.error("❌ Error getting statistics:", error.message);
  }
}

async function updateRequestStatus(
  requestId,
  newStatus,
  approvedBy = null,
  notes = null
) {
  try {
    const updated = await db.updateFundRequestStatus(
      requestId,
      newStatus,
      approvedBy,
      notes
    );
    console.log(
      `\n✅ Request ${requestId} status updated to: ${newStatus.toUpperCase()}`
    );
  } catch (error) {
    console.error("❌ Error updating request status:", error.message);
  }
}

async function runInteractiveMode() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  try {
    await db.init();

    while (true) {
      console.log("\n" + "=".repeat(50));
      await showMenu();
      console.log("=".repeat(50));

      const choice = await question("\nEnter your choice (1-7): ");

      switch (choice.trim()) {
        case "1":
          await viewAllRequests();
          break;

        case "2":
          await createTestRequest();
          break;

        case "3":
          const deleteId = await question("Enter request ID to delete: ");
          await deleteRequest(deleteId.trim());
          break;

        case "4":
          const confirm = await question(
            "Are you sure you want to clear ALL requests? (yes/no): "
          );
          if (confirm.toLowerCase() === "yes") {
            await clearAllRequests();
          } else {
            console.log("❌ Operation cancelled.");
          }
          break;

        case "5":
          await getStatistics();
          break;

        case "6":
          const updateId = await question("Enter request ID to update: ");
          const newStatus = await question(
            "Enter new status (pending/approved/denied): "
          );
          const approvedBy = await question("Approved by (optional): ");
          const notes = await question("Notes (optional): ");

          await updateRequestStatus(
            updateId.trim(),
            newStatus.trim(),
            approvedBy.trim() || null,
            notes.trim() || null
          );
          break;

        case "7":
          console.log("\n👋 Goodbye!");
          rl.close();
          return;

        default:
          console.log("❌ Invalid choice. Please enter 1-7.");
      }

      await question("\nPress Enter to continue...");
    }
  } catch (error) {
    console.error("❌ Error in interactive mode:", error.message);
  } finally {
    rl.close();
    await db.close();
  }
}

// Command line argument handling
const args = process.argv.slice(2);

if (args.length > 0) {
  // Non-interactive mode
  db.init()
    .then(async () => {
      const command = args[0];

      switch (command) {
        case "view":
          await viewAllRequests();
          break;
        case "create":
          await createTestRequest();
          break;
        case "clear":
          await clearAllRequests();
          break;
        case "stats":
          await getStatistics();
          break;
        default:
          console.log(
            "❌ Unknown command. Available: view, create, clear, stats"
          );
      }

      await db.close();
    })
    .catch(console.error);
} else {
  // Interactive mode
  runInteractiveMode();
}
