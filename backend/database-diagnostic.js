const db = require("./models/mongoDatabase");
require("dotenv").config();

(async () => {
  try {
    console.log("🔍 DATABASE DIAGNOSTIC TOOL");
    console.log("===========================");
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(
      `🗄️ Database URI: ${
        process.env.MONGODB_URI?.replace(/:[^:@]*@/, ":***@") || "NOT SET"
      }`
    );
    console.log("");

    // Test database connection
    console.log("🔗 Testing database connection...");
    await db.init();
    console.log("✅ Database connection successful");

    // Get database statistics
    console.log("");
    console.log("📊 DATABASE STATISTICS:");
    console.log("======================");

    const allRequests = await db.getAllFundRequests();
    console.log(`📋 Total fund requests: ${allRequests.length}`);

    if (allRequests.length > 0) {
      const statuses = allRequests.reduce((acc, req) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        return acc;
      }, {});

      console.log("📊 Status breakdown:");
      Object.entries(statuses).forEach(([status, count]) => {
        console.log(`   ${status.toUpperCase()}: ${count}`);
      });

      console.log("");
      console.log("📅 Recent requests (last 10):");
      const recent = allRequests.slice(0, 10);
      recent.forEach((req, index) => {
        const date = new Date(req.created_at).toLocaleString();
        console.log(`   ${index + 1}. ${req.id}`);
        console.log(`      ${req.purpose} - ${req.amount} ${req.currency}`);
        console.log(`      ${req.status.toUpperCase()} | ${date}`);
        console.log(
          `      From: ${req.requester_email} → To: ${req.approver_email}`
        );
        console.log("");
      });

      // Check for any requests submitted today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayRequests = allRequests.filter((req) => {
        const reqDate = new Date(req.created_at);
        return reqDate >= today;
      });

      console.log(`📅 Requests submitted today: ${todayRequests.length}`);
      if (todayRequests.length > 0) {
        console.log("Today's submissions:");
        todayRequests.forEach((req, index) => {
          console.log(
            `   ${index + 1}. ${req.id} - ${new Date(
              req.created_at
            ).toLocaleString()}`
          );
        });
      }
    } else {
      console.log("❌ No fund requests found in database");
      console.log("💡 This could mean:");
      console.log("   - Database is empty");
      console.log("   - Wrong database configuration");
      console.log("   - Connection to wrong database");
    }

    // Test the specific request ID format
    console.log("");
    console.log("🔍 REQUEST ID FORMAT CHECK:");
    console.log("===========================");
    const searchId = "826aa11a-9036-40a3-88f9-bab8a370d6fd";
    console.log(`🔎 Searching for exact ID: ${searchId}`);

    // Try different search methods
    const exactMatch = await db.getFundRequestById(searchId);
    console.log(`📋 Exact match: ${exactMatch ? "FOUND" : "NOT FOUND"}`);

    // Check for similar IDs (in case of formatting issues)
    const partialId = searchId.substring(0, 8);
    const allIds = allRequests.map((r) => r.id);
    const similarIds = allIds.filter(
      (id) => id.includes(partialId) || partialId.includes(id.substring(0, 8))
    );

    console.log(
      `🔍 IDs containing '${partialId}': ${
        similarIds.length > 0 ? similarIds.join(", ") : "NONE"
      }`
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("❌ Stack:", error.stack);
    process.exit(1);
  }
})();
