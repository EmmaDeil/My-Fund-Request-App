# 📧 Email System Documentation

## Overview
Complete documentation for the Fund Request App email system, including architecture, templates, tracking, and troubleshooting.

## 🎨 Email Template System

### Professional Email Templates
Modern, responsive designs with enterprise-grade styling:

#### **Available Templates**
- **`createBeautifulApprovalRequestTemplate()`** - Manager notification for new requests
- **`createBeautifulApprovalTemplate()`** - Success notification for approved requests  
- **`createBeautifulDenialTemplate()`** - Professional denial notifications

#### **Design Features**
- ✅ **Responsive Design**: Works on desktop and mobile devices
- ✅ **Professional Styling**: Inter font family, card layouts, gradients
- ✅ **Brand Consistency**: Consistent color scheme and visual identity
- ✅ **Accessibility**: Proper contrast ratios and semantic markup

### Template Customization
Located in `backend/utils/beautifulEmailTemplates.js`:

```javascript
// Currency formatting support
formatCurrency(amount, currency) // Supports NGN, USD, EUR, CAD

// Template structure
createBeautifulApprovalRequestTemplate(fundRequest, approvers, urgencyColor, priorityBadge, approvalUrl)
```

## 🔍 Email Tracking System

### Request ID Tracking
Every email includes request ID for complete audit trail:

#### **Log Format Examples**
```bash
# When Fund Request is Submitted
📋 [Request ID: 807df857-5b22-409e-ae58-1ea42da6fcef] Preparing approval request notification
📧 [Request ID: 807df857-5b22-409e-ae58-1ea42da6fcef] Sending to approvers: manager@company.com
✅ [Request ID: 807df857-5b22-409e-ae58-1ea42da6fcef] Email sent successfully!

# When Request is Processed
📋 [Request ID: 807df857-5b22-409e-ae58-1ea42da6fcef] Processing approved decision by John Smith
📧 [Request ID: 807df857-5b22-409e-ae58-1ea42da6fcef] Status notification sent to requester
```

#### **Email Types by Request ID**

| Email Type | Recipient | When Sent | Log Identifier |
|------------|-----------|-----------|----------------|
| **Approval Request** | Approver | Request submitted | `Preparing approval request notification` |
| **Confirmation** | Requester | Request submitted | `Preparing confirmation email to requester` |
| **Status Notification** | Requester | Request approved/denied | `Preparing [status] notification to requester` |
| **PDF Attachment** | Requester | With approval/denial | `Preparing [status] PDF notification` |

### Tracking Methods

#### **Method 1: Console Monitoring**
```bash
# Filter logs for specific request ID
grep "807df857-5b22-409e-ae58-1ea42da6fcef" backend_logs.txt

# Watch live logs
tail -f backend_logs.txt | grep "REQUEST_ID"
```

#### **Method 2: Email Verification Tool**
```bash
cd backend
node email-checker.js [REQUEST_ID]
```

**Features:**
- ✅ Interactive status checking
- ✅ Missing email identification  
- ✅ Automatic retry mechanism
- ✅ Complete delivery verification

## 🔧 Email Service Architecture

### EmailService Class
Main service handling SMTP configuration and email delivery:

```javascript
class EmailService {
  // Core Methods
  sendFundRequestNotification(fundRequest, approvers)  // → Approver
  sendStatusNotification(fundRequest, status, approver, comments)  // → Requester  
  sendConfirmationEmail(requestData)  // → Requester
  sendApprovalDecisionPDF(fundRequest, status, approver, pdfBuffer)  // → Requester with PDF
  
  // Utility Methods
  sendEmailWithRetry(mailOptions, maxRetries, requestId)
  verifyConnection()
  formatCurrency(amount, currency)
}
```

### SMTP Configuration
Environment variables required:

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com  
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@company.com
```

## 🧪 Testing & Verification

### Email System Testing Tools

#### **1. Email Logging Test**
```bash
cd backend
node test-email-logging.js
```
Tests all email functions with request ID logging.

#### **2. Email Delivery Checker**
```bash
cd backend
node email-checker.js [REQUEST_ID]
```
Interactive tool to verify and retry email delivery.

### Manual Testing Steps
1. Submit a new fund request
2. Check console for approval and confirmation email logs
3. Approve/deny the request  
4. Verify status notification logs appear
5. Confirm all logs show the same Request ID

## 🚨 Troubleshooting

### Common Email Issues

#### **SMTP Authentication Errors**
- Verify EMAIL_USER and EMAIL_PASS credentials
- Check if 2FA is enabled (use app password)
- Confirm EMAIL_HOST and EMAIL_PORT settings

#### **Email Template Not Rendering**
- Check HTML structure in beautifulEmailTemplates.js
- Verify all template parameters are provided
- Test with simplified template first

#### **Missing Email Deliveries**
1. Use email-checker.js tool to identify missing emails
2. Check SMTP server logs
3. Verify recipient email addresses
4. Use retry mechanism in email-checker tool

#### **Request ID Not Showing in Logs**
- Ensure emailService methods receive correct parameters
- Check sendEmailWithRetry calls include requestId parameter
- Verify logging format in console output

### Email Delivery Verification

#### **Expected Email Flow**
For any fund request, expect this sequence:

1. **Request Submitted**:
   - Approval request → Approver
   - Confirmation → Requester

2. **Request Processed**:
   - Status notification → Requester
   - PDF attachment → Requester (if applicable)

#### **Verification Checklist**
- [ ] Approval email sent to approver with Request ID
- [ ] Confirmation email sent to requester with Request ID  
- [ ] Status notification sent when decision made
- [ ] PDF attachment included with status notification
- [ ] All emails use consistent Request ID for tracking

## 📊 Email System Organization

### File Structure
```
backend/
├── utils/
│   ├── emailService.js                    # Main email service
│   └── beautifulEmailTemplates.js        # Professional templates
├── routes/
│   ├── fundRequests.js                    # Email integration for new requests
│   └── approvals.js                       # Email integration for decisions
├── email-checker.js                      # Email verification tool
└── test-email-logging.js                 # Testing utility
```

### Integration Points
- **Backend Routes**: Import emailService for notifications
- **Dashboard Web**: Uses backend email service via API
- **Frontend**: Triggers emails through API calls

## 🔄 Email Workflow Examples

### New Fund Request Workflow
```
1. User submits request → fundRequests.js
2. Request saved to database
3. sendFundRequestNotification() → Approver gets approval request
4. sendConfirmationEmail() → Requester gets confirmation
5. Both emails logged with Request ID
```

### Approval Decision Workflow  
```
1. Approver makes decision → approvals.js
2. Request status updated in database
3. sendStatusNotification() → Requester gets status update
4. sendApprovalDecisionPDF() → Requester gets PDF (if available)
5. All emails logged with Request ID
```

## 🎯 Best Practices

### Email Template Development
- Use inline CSS for email client compatibility
- Test across major email clients (Gmail, Outlook, Apple Mail)
- Maintain responsive design principles
- Include fallback fonts and colors

### Request ID Implementation
- Always pass request ID to email methods
- Use consistent logging format: `[Request ID: xxx]`
- Include request ID in error messages
- Track complete email delivery lifecycle

### Error Handling
- Implement retry mechanisms for failed emails
- Log detailed error messages with context
- Provide fallback delivery methods
- Monitor email delivery rates

---

**Email System Status**: ✅ Fully Operational  
**Template Version**: 2.0 (Beautiful Templates)  
**Tracking System**: Enhanced with Request ID  
**Last Updated**: September 2025