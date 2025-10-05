#!/bin/bash
# Verification script to check what Vercel is actually serving

echo "=== Local Code Verification ==="
echo ""
echo "1. Checking emailService.js approval URLs:"
grep -n "approvalUrl.*=" backend/utils/emailService.js | head -5
echo ""
echo "2. Checking server.js redirect URLs:"
grep -n "redirectUrl.*=" backend/server.js
echo ""
echo "3. Checking .env.production FRONTEND_URL:"
grep "FRONTEND_URL" backend/.env.production
echo ""
echo "=== What Should Be on Vercel ==="
echo "Environment Variables that MUST be set in Vercel Dashboard:"
echo "  FRONTEND_URL=https://my-fund-request-app.onrender.com"
echo "  (NO trailing slash!)"
echo ""
echo "Expected approval URL format:"
echo "  https://my-fund-request-app.onrender.com/approve?token=XXXXX"
echo ""
echo "Current wrong format you're getting:"
echo "  https://my-fund-request-app.onrender.com//approve/XXXXX"
echo ""
echo "=== Action Items ==="
echo "1. Go to: https://vercel.com/dashboard"
echo "2. Select your backend project"
echo "3. Go to: Settings > Environment Variables"
echo "4. Set FRONTEND_URL = https://my-fund-request-app.onrender.com"
echo "5. Make sure there's NO trailing slash"
echo "6. Click 'Redeploy' on latest deployment"
echo "7. Wait 2-3 minutes for deployment"
echo "8. Test with NEW fund request"
