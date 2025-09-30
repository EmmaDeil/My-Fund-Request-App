#!/bin/bash
# 🔍 Approval Link Diagnostic Script
# This script tests all aspects of the approval link system

echo "🔍 APPROVAL LINK DIAGNOSTIC SCRIPT"
echo "=================================="
echo ""

# Test URLs
FRONTEND_URL="https://my-fund-request-app.onrender.com"
BACKEND_URL="https://my-fund-request-app.vercel.app/api"
TEST_TOKEN="6b8ed341-84f7-4000-b675-bfb727ad0766"
APPROVAL_URL="$FRONTEND_URL/approve/$TEST_TOKEN"

echo "📌 TEST CONFIGURATION:"
echo "   Frontend:     $FRONTEND_URL"
echo "   Backend:      $BACKEND_URL"
echo "   Test Token:   $TEST_TOKEN"
echo "   Approval URL: $APPROVAL_URL"
echo ""

# Test 1: Frontend Home Page
echo "🏠 TEST 1: Frontend Home Page"
echo "-----------------------------"
HOME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$HOME_STATUS" == "200" ]; then
    echo "✅ Frontend home page loads correctly (HTTP $HOME_STATUS)"
else
    echo "❌ Frontend home page failed (HTTP $HOME_STATUS)"
fi
echo ""

# Test 2: Backend Health Check
echo "🔧 TEST 2: Backend Health Check"
echo "-------------------------------"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health")
if [ "$HEALTH_STATUS" == "200" ]; then
    echo "✅ Backend API is working (HTTP $HEALTH_STATUS)"
else
    echo "❌ Backend API failed (HTTP $HEALTH_STATUS)"
fi
echo ""

# Test 3: Approval Token Validation
echo "🎯 TEST 3: Approval Token Validation"
echo "------------------------------------"
TOKEN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/approvals/$TEST_TOKEN")
if [ "$TOKEN_STATUS" == "200" ]; then
    echo "✅ Approval token is valid (HTTP $TOKEN_STATUS)"
    # Get token details
    echo "📋 Token Details:"
    curl -s "$BACKEND_URL/approvals/$TEST_TOKEN" | grep -o '"purpose":"[^"]*"' | head -1
else
    echo "❌ Approval token validation failed (HTTP $TOKEN_STATUS)"
fi
echo ""

# Test 4: Frontend Approval Page
echo "🎯 TEST 4: Frontend Approval Page"
echo "---------------------------------"
APPROVAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APPROVAL_URL")
if [ "$APPROVAL_STATUS" == "200" ]; then
    echo "✅ Approval page loads correctly (HTTP $APPROVAL_STATUS)"
    echo "🎉 APPROVAL LINK IS WORKING!"
else
    echo "❌ Approval page failed (HTTP $APPROVAL_STATUS)"
    if [ "$APPROVAL_STATUS" == "404" ]; then
        echo "🔧 This indicates a React Router SPA routing issue"
        echo "   The _redirects file may not be properly deployed"
    fi
fi
echo ""

# Test 5: Check for Double Slash Issue
echo "🔍 TEST 5: URL Double Slash Check"
echo "---------------------------------"
if [[ "$APPROVAL_URL" == *"//approve/"* ]]; then
    echo "❌ Double slash detected in URL: $APPROVAL_URL"
    echo "🔧 This indicates a FRONTEND_URL configuration issue"
else
    echo "✅ URL format is correct (no double slashes)"
fi
echo ""

# Summary
echo "📊 DIAGNOSTIC SUMMARY"
echo "====================="
echo "Frontend Home:    $([ "$HOME_STATUS" == "200" ] && echo "✅ Working" || echo "❌ Failed")"
echo "Backend API:      $([ "$HEALTH_STATUS" == "200" ] && echo "✅ Working" || echo "❌ Failed")"
echo "Token Valid:      $([ "$TOKEN_STATUS" == "200" ] && echo "✅ Valid" || echo "❌ Invalid")"
echo "Approval Page:    $([ "$APPROVAL_STATUS" == "200" ] && echo "✅ Working" || echo "❌ Failed")"
echo ""

if [ "$APPROVAL_STATUS" == "200" ]; then
    echo "🎉 ALL TESTS PASSED!"
    echo "✅ Your approval link system is working correctly"
    echo "🔗 Test URL: $APPROVAL_URL"
else
    echo "⚠️  ISSUES DETECTED:"
    if [ "$APPROVAL_STATUS" == "404" ]; then
        echo "   • Approval page returns 404 (React Router issue)"
        echo "   • Wait 2-3 minutes for Render deployment to complete"
        echo "   • Check if _redirects file is properly deployed"
    fi
    echo ""
    echo "🔧 RECOMMENDED ACTIONS:"
    echo "   1. Wait for Render deployment to complete (2-3 minutes)"
    echo "   2. Re-run this test script"
    echo "   3. If issue persists, check Render deployment logs"
fi
echo ""
echo "⏰ Script completed at: $(date)"