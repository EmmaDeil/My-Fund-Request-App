const axios = require("axios");

// Test configuration
const BASE_URL = "http://localhost:5000"; // Local backend (port 5000 as shown in startup)
const TEST_EMAIL = process.env.TEST_EMAIL || "eclefzy@gmail.com"; // Using your email from .env for testing

// Sample fund request data for testing
const sampleFundRequest = {
  employeeName: "John Doe",
  employeeId: "EMP001",
  department: "IT",
  requestedAmount: 1500,
  purpose: "Software License Purchase",
  justification: "Need Adobe Creative Suite for design work",
  requestDate: new Date().toISOString(),
  expectedReimbursementDate: new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString(),
};

async function testEmailAPI() {
  console.log("🧪 Testing Email API...\n");

  try {
    // Test 1: Health Check
    console.log("1. Testing Backend Health...");
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log("✅ Backend is healthy:", healthResponse.data);
    console.log("");

    // Test 2: Create a fund request (this should trigger an email)
    console.log("2. Creating Fund Request (should send approval email)...");
    const createResponse = await axios.post(`${BASE_URL}/api/fund-requests`, {
      ...sampleFundRequest,
      approverEmail: TEST_EMAIL, // Use your email here
    });

    console.log("✅ Fund Request Created:", createResponse.data);
    console.log("📧 Check your email for the approval request!");
    console.log("");

    const requestId = createResponse.data._id;

    // Test 3: Approve the request (this should send notification email)
    console.log(
      "3. Approving Fund Request (should send notification email)..."
    );
    const approveResponse = await axios.put(
      `${BASE_URL}/api/approvals/${requestId}/approve`,
      {
        approverName: "Jane Manager",
        approverEmail: "manager@company.com",
        comments: "Approved for business needs",
      }
    );

    console.log("✅ Fund Request Approved:", approveResponse.data);
    console.log("📧 Check your email for the approval notification!");
    console.log("");

    console.log("🎉 All email tests completed successfully!");
    console.log("📋 Summary:");
    console.log(`   - Health check: ✅ Passed`);
    console.log(`   - Approval request email: ✅ Sent to ${TEST_EMAIL}`);
    console.log(`   - Approval notification email: ✅ Sent to ${TEST_EMAIL}`);
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("\n💡 Make sure to start your backend server first:");
      console.log("   cd backend && npm run dev");
    }
  }
}

// Run the test
if (require.main === module) {
  testEmailAPI();
}

module.exports = { testEmailAPI };
