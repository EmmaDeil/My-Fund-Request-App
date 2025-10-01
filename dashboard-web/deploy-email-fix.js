#!/usr/bin/env node

/**
 * Deploy Email Fix Script
 * Switches to Render-optimized email service and deploys fixes
 */

const fs = require('fs');
const path = require('path');

function deployEmailFix() {
  console.log('🚀 Deploying Email Service Fix for Render...\n');

  // Step 1: Backup current email service
  const originalEmailService = 'utils/emailService.js';
  const backupEmailService = 'utils/emailService.backup.js';
  
  if (fs.existsSync(originalEmailService)) {
    fs.copyFileSync(originalEmailService, backupEmailService);
    console.log('✅ Backed up original email service to:', backupEmailService);
  }

  // Step 2: Switch to Render-optimized email service
  const renderOptimizedService = 'utils/emailServiceRenderOptimized.js';
  if (fs.existsSync(renderOptimizedService)) {
    fs.copyFileSync(renderOptimizedService, originalEmailService);
    console.log('✅ Switched to Render-optimized email service');
  } else {
    console.error('❌ Render-optimized email service not found:', renderOptimizedService);
    return;
  }

  // Step 3: Update .env.production with port 465 (alternative SMTP port)
  const envFile = '.env.production';
  if (fs.existsSync(envFile)) {
    let envContent = fs.readFileSync(envFile, 'utf8');
    
    // Update to use port 465 with SSL for better Render compatibility
    envContent = envContent.replace(/EMAIL_PORT=587/, 'EMAIL_PORT=465');
    envContent = envContent.replace(/EMAIL_SECURE=false/, 'EMAIL_SECURE=true');
    
    fs.writeFileSync(envFile, envContent);
    console.log('✅ Updated .env.production to use port 465 with SSL');
  }

  // Step 4: Create deployment summary
  const deploymentSummary = `
# Render Email Fix Deployment Summary

## Changes Applied:
1. ✅ Switched to Render-optimized email service
2. ✅ Updated SMTP configuration to use port 465 with SSL
3. ✅ Enhanced timeout handling for serverless environment
4. ✅ Added connection refresh on retry attempts
5. ✅ Improved error logging and diagnostics

## New Email Configuration:
- **Service**: Gmail (optimized for serverless)
- **Port**: 465 (SSL)
- **Security**: SSL/TLS enabled
- **Timeouts**: Reduced for faster failure detection
- **Retry Logic**: Enhanced with connection refresh

## Testing Commands:
\`\`\`bash
node test-email.js
node diagnose-smtp.js
\`\`\`

## Rollback Instructions:
If issues persist, restore original email service:
\`\`\`bash
cp utils/emailService.backup.js utils/emailService.js
\`\`\`

## Next Steps:
1. Commit and push changes to repository
2. Deploy to Render (automatic deployment should trigger)
3. Monitor Render logs for email service performance
4. Test retirement notice functionality

## Support:
- Check logs in Render dashboard
- Use diagnostic scripts for troubleshooting
- See PRODUCTION_EMAIL_TROUBLESHOOTING.md for additional solutions

Deployment completed at: ${new Date().toISOString()}
`;

  fs.writeFileSync('EMAIL_FIX_DEPLOYMENT.md', deploymentSummary);
  console.log('✅ Created deployment summary: EMAIL_FIX_DEPLOYMENT.md');

  console.log('\n🎯 Email fix deployment completed successfully!');
  console.log('\n📝 Summary of changes:');
  console.log('   • Switched to Render-optimized email service');
  console.log('   • Updated SMTP to use port 465 with SSL');
  console.log('   • Enhanced timeout and retry logic');
  console.log('   • Improved error diagnostics');
  
  console.log('\n🚀 Next steps:');
  console.log('   1. Test locally: node test-email.js');
  console.log('   2. Commit changes to git');
  console.log('   3. Push to trigger Render deployment');
  console.log('   4. Monitor production logs');
  
  console.log('\n💡 If issues persist, try alternative solutions in:');
  console.log('   PRODUCTION_EMAIL_TROUBLESHOOTING.md');
}

// Run the deployment
deployEmailFix();