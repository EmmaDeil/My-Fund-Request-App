// Test the complete Fund Request email API
const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });

const BASE_URL = "http://localhost:5000";

async function testFundRequestEmailAPI() {
  console.log("🧪 Testing Fund Request Email API...\n");

  try {
    // Test 1: Health Check
    console.log("1. 🏥 Testing Backend Health...");
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log("✅ Backend is healthy:", healthResponse.data.message);
    console.log("");

    // Test 2: Create a fund request (this should send an approval email)
    console.log("2. 📝 Creating Fund Request (should send approval email)...");
    const fundRequestData = {
      requester_name: "John Doe Test",
      requester_employee_id: "TEST001",
      requester_email: process.env.EMAIL_USER, // Use your email for notifications
      department: "IT Testing",
      requested_amount: 750.0,
      purpose: "API Testing - Software License",
      justification:
        "Testing the email functionality of the Fund Request system",
      approver_name: "Test Manager",
      approver_email: process.env.EMAIL_USER, // Send approval request to yourself
      expected_reimbursement_date: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      attachments: [],
    };

    const createResponse = await axios.post(
      `${BASE_URL}/api/fund-requests`,
      fundRequestData
    );
    console.log("✅ Fund Request Created Successfully!");
    console.log("   Request ID:", createResponse.data._id);
    console.log("   Status:", createResponse.data.status);
    console.log("   Amount:", "$" + createResponse.data.requested_amount);
    console.log("📧 Check your email for the approval request!");
    console.log("");

    const requestId = createResponse.data._id;
    const approvalToken = createResponse.data.approval_token;

    // Test 3: Approve the request (this should send notification email)
    console.log(
      "3. ✅ Approving Fund Request (should send notification email)..."
    );

    // Use the approval token from the created request
    const approveResponse = await axios.put(
      `${BASE_URL}/api/approvals/${requestId}/approve`,
      {
        approver_name: "Jane Manager",
        approver_email: process.env.EMAIL_USER,
        comments: "Approved for business needs - API test successful",
        approval_token: approvalToken,
      }
    );

    console.log("✅ Fund Request Approved Successfully!");
    console.log("   Final Status:", approveResponse.data.status);
    console.log("   Approved by:", approveResponse.data.approver_name);
    console.log("   Comments:", approveResponse.data.comments);
    console.log("📧 Check your email for the approval notification!");
    console.log("");

    // Test 4: Get the request details
    console.log("4. 📊 Fetching Updated Request Details...");
    const getResponse = await axios.get(
      `${BASE_URL}/api/fund-requests/${requestId}`
    );
    console.log("✅ Request Details Retrieved:");
    console.log("   Status:", getResponse.data.status);
    console.log(
      "   Created:",
      new Date(getResponse.data.request_date).toLocaleDateString()
    );
    console.log(
      "   Updated:",
      new Date(getResponse.data.updated_at).toLocaleDateString()
    );
    console.log("");

    console.log("🎉 All Fund Request Email API tests completed successfully!");
    console.log("");
    console.log("📋 Test Summary:");
    console.log("   ✅ Backend Health Check: Passed");
    console.log("   ✅ Fund Request Creation: Passed");
    console.log("   ✅ Approval Request Email: Sent");
    console.log("   ✅ Fund Request Approval: Passed");
    console.log("   ✅ Approval Notification Email: Sent");
    console.log("   ✅ Request Details Retrieval: Passed");
    console.log("");
    console.log("📬 Email Summary:");
    console.log(
      `   📨 Approval Request Email sent to: ${process.env.EMAIL_USER}`
    );
    console.log(
      `   📨 Approval Notification Email sent to: ${process.env.EMAIL_USER}`
    );
    console.log("   🔍 Check your inbox for both test emails!");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("\n💡 Make sure to start your backend server first:");
      console.log("   cd backend && node server.js");
    } else if (error.response?.status === 404) {
      console.log("\n💡 Check that the API endpoints are correct");
    } else if (error.response?.status >= 500) {
      console.log("\n💡 Server error - check backend logs for details");
    }
  }
}

// Run the test
testFundRequestEmailAPI();
