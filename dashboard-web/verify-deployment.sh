#!/bin/bash

# Dashboard Deployment Verification Script
echo "🔍 Verifying Dashboard Deployment Setup..."
echo ""

# Check Node.js version
NODE_VERSION=$(node --version)
echo "✅ Node.js Version: $NODE_VERSION"

# Check npm version  
NPM_VERSION=$(npm --version)
echo "✅ npm Version: $NPM_VERSION"

# Check if required files exist
echo ""
echo "📋 Checking Required Files:"

if [ -f "package.json" ]; then
    echo "✅ package.json found"
else
    echo "❌ package.json missing"
    exit 1
fi

if [ -f "server.js" ]; then
    echo "✅ server.js found"
else
    echo "❌ server.js missing"
    exit 1
fi

if [ -f ".env.production" ]; then
    echo "✅ .env.production found"
else
    echo "⚠️  .env.production missing (will need to set environment variables in Render)"
fi

if [ -f "render.yaml" ]; then
    echo "✅ render.yaml found"
else
    echo "⚠️  render.yaml missing (optional - can deploy manually)"
fi

if [ -f "utils/emailService.js" ]; then
    echo "✅ utils/emailService.js found"
else
    echo "❌ utils/emailService.js missing"
    exit 1
fi

if [ -f "utils/beautifulEmailTemplates.js" ]; then
    echo "✅ utils/beautifulEmailTemplates.js found"
else
    echo "❌ utils/beautifulEmailTemplates.js missing"
    exit 1
fi

# Check package.json scripts
echo ""
echo "📦 Checking Package Scripts:"
if grep -q '"build"' package.json; then
    echo "✅ build script found"
else
    echo "❌ build script missing"
    exit 1
fi

if grep -q '"start"' package.json; then
    echo "✅ start script found"
else
    echo "❌ start script missing"
    exit 1
fi

# Test build command
echo ""
echo "🔨 Testing Build Command:"
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Test email service import
echo ""
echo "📧 Testing Email Service:"
node -e "
try { 
  const emailService = require('./utils/emailService.js'); 
  console.log('✅ Email service imports successfully'); 
} catch(e) { 
  console.error('❌ Email service import failed:', e.message); 
  process.exit(1); 
}"

echo ""
echo "🎉 Dashboard is ready for Render deployment!"
echo ""
echo "📋 Next Steps:"
echo "1. Commit and push your changes to GitHub"
echo "2. Create a new Web Service on Render"
echo "3. Connect your GitHub repository"
echo "4. Set environment variables in Render dashboard"
echo "5. Deploy!"
echo ""
echo "📖 See RENDER_DEPLOYMENT_GUIDE.md for detailed instructions"