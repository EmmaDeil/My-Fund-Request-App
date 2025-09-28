const mongoose = require("mongoose");
require("dotenv").config();

// Define the fund request schema
const fundRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  requester_name: { type: String, required: true },
  requester_email: { type: String, required: true },
  approver_email: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "NGN" },
  purpose: { type: String, required: true },
  description: String,
  department: String,
  category: String,
  urgent: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  approval_token: { type: String, required: true, unique: true },
  approved_by: String,
  approved_at: Date,
  comments: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

async function checkDatabase(dbName, requestId) {
  const connectionString = `mongodb+srv://fundrequest:fundrequest223@requests.wbonoix.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Requests`;

  try {
    console.log(`🔍 Connecting to ${dbName} database...`);
    const connection = mongoose.createConnection(connectionString, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    const FundRequest = connection.model("FundRequest", fundRequestSchema);

    console.log(`📋 Searching for request ID: ${requestId}`);
    const request = await FundRequest.findOne({ id: requestId });

    if (request) {
      console.log(`✅ FOUND in ${dbName.toUpperCase()} database!`);
      console.log(`📋 Request: ${request.purpose}`);
      console.log(`💰 Amount: ${request.amount} ${request.currency}`);
      console.log(`📊 Status: ${request.status.toUpperCase()}`);
      console.log(`👤 Requester: ${request.requester_email}`);
      console.log(`👨‍💼 Approver: ${request.approver_email}`);
      console.log(
        `📅 Created: ${new Date(request.created_at).toLocaleString()}`
      );
      console.log(`🔑 Approval Token: ${request.approval_token}`);

      await connection.close();
      return request;
    } else {
      console.log(`❌ NOT FOUND in ${dbName} database`);

      // Show recent requests for reference
      const recentRequests = await FundRequest.find({})
        .sort({ created_at: -1 })
        .limit(3);
      if (recentRequests.length > 0) {
        console.log(`📋 Recent requests in ${dbName}:`);
        recentRequests.forEach((req, index) => {
          console.log(
            `   ${index + 1}. ${req.id} - ${req.purpose} (${new Date(
              req.created_at
            ).toLocaleDateString()})`
          );
        });
      } else {
        console.log(`   No requests found in ${dbName} database`);
      }
    }

    await connection.close();
    return null;
  } catch (error) {
    console.error(`❌ Error connecting to ${dbName}:`, error.message);
    return null;
  }
}

(async () => {
  const requestId = process.argv[2] || "826aa11a-9036-40a3-88f9-bab8a370d6fd";

  console.log("🔍 CROSS-DATABASE REQUEST CHECKER");
  console.log("=================================");
  console.log(`🔍 Searching for: ${requestId}`);
  console.log("");

  try {
    // Check development database
    console.log("🌱 DEVELOPMENT DATABASE:");
    console.log("------------------------");
    const devResult = await checkDatabase("fundrequest_dev", requestId);

    console.log("");

    // Check production database
    console.log("🚀 PRODUCTION DATABASE:");
    console.log("-----------------------");
    const prodResult = await checkDatabase("fundrequest_prod", requestId);

    console.log("");
    console.log("📊 SUMMARY:");
    console.log("===========");

    if (devResult && prodResult) {
      console.log("✅ Found in BOTH databases (duplicate entry)");
    } else if (devResult) {
      console.log("✅ Found in DEVELOPMENT database only");
      console.log("💡 This request was submitted locally");
    } else if (prodResult) {
      console.log("✅ Found in PRODUCTION database only");
      console.log("💡 This request was submitted via the production app");
    } else {
      console.log("❌ NOT FOUND in either database");
      console.log("💡 Possible reasons:");
      console.log("   - Request ID is incorrect");
      console.log("   - Request failed to save during submission");
      console.log("   - Database connection issue during submission");
      console.log("   - Different database configuration in actual production");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  process.exit(0);
})();
