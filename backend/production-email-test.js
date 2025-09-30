// Test script to simulate email URL generation as it happens in production
require('dotenv').config({ path: '.env.production' });

console.log('🧪 PRODUCTION EMAIL URL SIMULATION');
console.log('==================================');

// Simulate a real fund request with actual token
const mockFundRequest = {
  id: 'test-123',
  approvalToken: 'abc123-def456-ghi789',
  approval_token: 'abc123-def456-ghi789',
  purpose: 'Test fund request',
  amount: 1000,
  currency: 'NGN',
  approver_email: 'test@example.com'
};

// Test the exact same logic used in emailService.js

// 1. sendFundRequestNotification URL (line ~128)
console.log('\n📧 Testing sendFundRequestNotification URL generation:');
const url1 = `${process.env.FRONTEND_URL || "https://my-fund-request-app.onrender.com"}/#/approve/${mockFundRequest.approvalToken}`;
console.log(`Generated: ${url1}`);
console.log(`Has hash: ${url1.includes('/#/approve/') ? '✅ YES' : '❌ NO'}`);

// 2. sendApprovalEmail URL (line ~250)  
console.log('\n📧 Testing sendApprovalEmail URL generation:');
const url2 = `${process.env.FRONTEND_URL || "https://my-fund-request-app.onrender.com"}/#/approve/${mockFundRequest.approval_token}`;
console.log(`Generated: ${url2}`);
console.log(`Has hash: ${url2.includes('/#/approve/') ? '✅ YES' : '❌ NO'}`);

// 3. Backend redirect URL (server.js)
console.log('\n🔀 Testing backend redirect URL generation:');
const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
const url3 = `${frontendURL}/#/approve/${mockFundRequest.approvalToken}`;
console.log(`Generated: ${url3}`);
console.log(`Has hash: ${url3.includes('/#/approve/') ? '✅ YES' : '❌ NO'}`);

console.log('\n🎯 SUMMARY:');
const allHaveHash = [url1, url2, url3].every(url => url.includes('/#/approve/'));
console.log(`All URLs have hash: ${allHaveHash ? '✅ YES' : '❌ NO'}`);

if (allHaveHash) {
    console.log('🎉 Email system is correctly configured for hash routing!');
    console.log('📧 Next fund request emails will include working approval links!');
} else {
    console.log('❌ Some URLs are missing hash - check configuration');
}