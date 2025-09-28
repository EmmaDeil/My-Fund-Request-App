# Email System Documentation

## Overview
This document provides comprehensive documentation for the Fund Request App email system, including its architecture, templates, and usage patterns.

## File Structure

### Active Files
- **`emailService.js`** - Main email service handling SMTP configuration and email sending
- **`beautifulEmailTemplates.js`** - Professional HTML email templates with modern design

### Backup Files
- **`backend/backups/email-service/`** - Contains historical versions and backups
  - `emailService_old_with_inline_templates_2025-09-28.js` - Legacy version with inline templates

## Email Service Architecture

### EmailService Class
The main `EmailService` class provides:
- SMTP configuration using nodemailer
- Environment-based email settings
- Error handling and logging
- Template integration

### Key Methods
- `sendFundRequestNotification()` - Sends approval request emails to managers
- `sendStatusNotification()` - Sends approval/denial notifications to requesters
- `sendApprovalDecisionPDF()` - Sends emails with PDF attachments

## Email Templates

### Beautiful Templates
Located in `beautifulEmailTemplates.js`, these provide modern, professional designs:

#### 1. Approval Request Template
- **Function**: `createBeautifulApprovalRequestTemplate()`
- **Purpose**: Notifies managers of new fund requests requiring approval
- **Features**: Request details, amount formatting, action buttons

#### 2. Approval Template  
- **Function**: `createBeautifulApprovalTemplate()`
- **Purpose**: Notifies requesters of approved fund requests
- **Features**: Success messaging, request summary, next steps

#### 3. Denial Template
- **Function**: `createBeautifulDenialTemplate()`
- **Purpose**: Notifies requesters of denied fund requests  
- **Features**: Clear denial message, reason display, resubmission guidance

### Design Features
- **Responsive Design**: Works on desktop and mobile devices
- **Professional Styling**: Inter font family, card layouts, gradients
- **Brand Consistency**: Consistent color scheme and visual identity
- **Accessibility**: Proper contrast ratios and semantic markup

## Usage Examples

### Basic Email Sending
```javascript
const emailService = require('./utils/emailService');

// Send approval request
await emailService.sendFundRequestNotification(
  requestData,
  'manager@company.com'
);

// Send approval notification
await emailService.sendStatusNotification(
  requestData, 
  'requester@company.com',
  'approved'
);
```

### Environment Configuration
Required environment variables:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com  
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@company.com
```

## Template Customization

### Modifying Templates
1. Locate the relevant template function in `beautifulEmailTemplates.js`
2. Update HTML structure while maintaining responsive design
3. Test across different email clients
4. Update JSDoc documentation

### Adding New Templates
1. Create new template function following existing patterns
2. Add comprehensive JSDoc documentation
3. Export function in module.exports
4. Integrate with emailService.js methods

## File Organization History

### Migration Process
- **Original State**: Multiple duplicate email service files
- **Cleanup Actions**: 
  - Consolidated to single `emailService.js`
  - Moved legacy files to organized backup structure
  - Added comprehensive documentation
  - Implemented professional template system

### Backup Strategy
- Historical versions preserved in `backend/backups/email-service/`
- Descriptive filenames with dates for easy identification
- Legacy inline templates maintained for reference

## Dependencies

### Production Dependencies
- `nodemailer` - SMTP email sending
- `dotenv` - Environment variable management

### Development Notes
- Templates use inline CSS for email client compatibility
- Currency formatting supports multiple currencies (NGN, USD, EUR, CAD)
- Error handling includes detailed logging for troubleshooting

## Maintenance Guidelines

### Code Quality
- All functions include comprehensive JSDoc documentation
- Consistent naming conventions and code style
- Proper error handling and validation

### Testing Recommendations
- Test templates across major email clients (Gmail, Outlook, Apple Mail)
- Verify responsive behavior on mobile devices
- Validate SMTP configuration in different environments

### Performance Considerations  
- Templates generate static HTML (no external dependencies)
- Minimal inline CSS for fast loading
- Efficient currency formatting with locale support

## Integration Points

### Backend Routes
- Fund request routes import emailService for notifications
- Approval workflow triggers appropriate email templates
- Error handling propagates email sending failures

### Dashboard Integration
- Web dashboard imports email service from backend
- Maintains consistent email functionality across platforms
- Shared template system ensures brand consistency

## Support and Troubleshooting

### Common Issues
1. **SMTP Authentication**: Verify environment variables and app passwords
2. **Template Rendering**: Check HTML structure and inline CSS
3. **Email Delivery**: Validate recipient addresses and server settings

### Debug Mode
Enable detailed logging by setting appropriate environment variables for troubleshooting email delivery issues.

---

**Last Updated**: January 2025  
**Version**: 2.0 (Beautiful Templates Implementation)