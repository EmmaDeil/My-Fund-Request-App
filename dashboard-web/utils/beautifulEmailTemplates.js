/**
 * Beautiful Email Templates for Fund Request System
 *
 * This file contains professionally designed email templates that match the
 * modern UI design of the fund request application. All templates use:
 * - Inter font family for modern typography
 * - Consistent color schemes and gradients
 * - Responsive design principles
 * - Card-based layouts for better organization
 *
 * Templates included:
 * 1. createBeautifulApprovalRequestTemplate - For notifying approvers of new requests
 * 2. createBeautifulApprovalTemplate - For notifying requesters of approved requests
 * 3. createBeautifulDenialTemplate - For notifying requesters of denied requests
 *
 * @author Fund Request System
 * @version 2.0
 * @created September 28, 2025
 */

/**
 * Creates a beautiful email template for fund request approval notifications
 * Sent to approvers when a new fund request needs their review
 *
 * @param {Object} fundRequest - The fund request object containing all request details
 * @param {Array} approvers - Array of approver objects with email addresses
 * @param {string} urgencyColor - Color code for priority badge (e.g., "#e74c3c" for high priority)
 * @param {string} priorityBadge - Text for priority badge (e.g., "HIGH PRIORITY" or "NORMAL")
 * @param {string} approvalUrl - Complete URL for the approval action
 * @returns {string} Complete HTML email template
 */
const createBeautifulApprovalRequestTemplate = (
  fundRequest,
  approvers,
  urgencyColor,
  priorityBadge,
  approvalUrl
) => {
  const formattedAmount = formatCurrency(
    fundRequest.amount,
    fundRequest.currency
  );

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fund Request Approval Required</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #0d131aff; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0d131aff; font-family: 'Inter', sans-serif;">
  <div class="container" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 30px; text-align: center; color: white;">
      <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em;">
        Fund Request Approval Required
      </h1>
      <p style="margin: 0; font-size: 16px; opacity: 0.9; font-weight: 400;">
        A new fund request is awaiting your approval
      </p>
    </div>
    
    <!-- Priority Badge -->
    <div style="text-align: center; margin-top: -20px; position: relative; z-index: 10;">
      <span style="display: inline-block; background-color: ${urgencyColor}; color: white; padding: 10px 28px; border-radius: 25px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(0,0,0,0.15);">
        ⚠️ ${priorityBadge}
      </span>
    </div>
    
    <!-- Content -->
    <div style="padding: 35px 30px;">
      
      <!-- Request Details -->
      <div style="background-color: #f8fafc; border-radius: 16px; padding: 28px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        <h2 style="color: #1e293b; margin: 0 0 24px 0; font-size: 20px; font-weight: 600;">Request Details</h2>
        
        <div style="space-y: 16px;">
          <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-weight: 500; font-size: 14px;">Request ID:</span>
            <span style="color: #0f172a; font-weight: 600; font-family: 'SF Mono', monospace; font-size: 14px;">${
              fundRequest.id || "N/A"
            }</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-weight: 500; font-size: 14px;">Requested by:</span>
            <span style="color: #0f172a; font-weight: 500; font-size: 14px;">${
              fundRequest.requester_name
            }</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-weight: 500; font-size: 14px;">Amount:</span>
            <span style="color: #059669; font-weight: 700; font-size: 20px;">${formattedAmount}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-weight: 500; font-size: 14px;">Purpose:</span>
            <span style="color: #0f172a; font-weight: 500; font-size: 14px; text-align: right; max-width: 300px;">${
              fundRequest.purpose
            }</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-weight: 500; font-size: 14px;">Department:</span>
            <span style="color: #7c3aed; font-weight: 500; font-size: 14px;">${
              fundRequest.department || "Not Specified"
            }</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 14px 0;">
            <span style="color: #64748b; font-weight: 500; font-size: 14px;">Submitted:</span>
            <span style="color: #0f172a; font-weight: 500; font-size: 14px;">${new Date(
              fundRequest.created_at || fundRequest.createdAt
            ).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}</span>
          </div>
        </div>
      </div>
      
      <!-- Action Section -->
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 16px; padding: 28px; text-align: center; border: 1px solid #f59e0b;">
        <p style="color: #92400e; margin: 0 0 24px 0; font-size: 16px; font-weight: 600;">
          Please review and approve or deny this fund request:
        </p>
        
        <a href="${approvalUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3); transition: all 0.3s ease;">
          Review Request
        </a>
        
        <p style="color: #92400e; margin: 20px 0 0 0; font-size: 13px; line-height: 1.6;">
          This link will expire in 7 days. If you cannot click the button above, copy and paste this URL into your browser:
        </p>
        <div style="background-color: #ffffff; border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; margin-top: 12px; font-family: 'SF Mono', monospace; font-size: 12px; word-break: break-all; color: #374151;">
          ${approvalUrl}
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; margin: 0 0 8px 0; font-size: 13px;">
        This is an automated notification from the Fund Request System
      </p>
      <p style="color: #94a3b8; margin: 0; font-size: 12px;">
        If you have any questions, please contact your system administrator.
      </p>
    </div>
  </div>
</body>
</html>`;
};

/**
 * Creates a beautiful email template for fund request approval notifications
 * Sent to requesters when their fund request has been approved
 *
 * @param {Object} fundRequest - The fund request object containing all request details
 * @param {string} approver - Name/email of the person who approved the request
 * @param {string} comments - Optional comments from the approver
 * @returns {string} Complete HTML email template with success styling
 */
const createBeautifulApprovalTemplate = (fundRequest, approver, comments) => {
  const formattedAmount = formatCurrency(
    fundRequest.amount,
    fundRequest.currency
  );

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fund Request APPROVED</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #f8fafc; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', sans-serif;">
  <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 30px; text-align: center; color: white;">
      <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
      <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em;">
        Fund Request APPROVED
      </h1>
      <p style="margin: 0; font-size: 16px; opacity: 0.9; font-weight: 400;">
        Your fund request has been approved
      </p>
    </div>
    
    <!-- Status Badge -->
    <div style="text-align: center; margin-top: -20px; position: relative; z-index: 10;">
      <span style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 32px; border-radius: 25px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(22, 163, 74, 0.3);">
        APPROVED
      </span>
    </div>
    
    <!-- Content -->
    <div style="padding: 35px 30px;">
      
      <!-- Request Details -->
      <div style="background-color: #f0fdf4; border-radius: 16px; padding: 28px; margin-bottom: 24px; border: 1px solid #bbf7d0;">
        <h2 style="color: #15803d; margin: 0 0 24px 0; font-size: 20px; font-weight: 600;">Request Details</h2>
        
        <div style="space-y: 16px;">
          <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #bbf7d0;">
            <span style="color: #15803d; font-weight: 500; font-size: 14px;">Request ID:</span>
            <span style="color: #14532d; font-weight: 600; font-family: 'SF Mono', monospace; font-size: 14px;">${
              fundRequest.id || "N/A"
            }</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #bbf7d0;">
            <span style="color: #15803d; font-weight: 500; font-size: 14px;">Amount:</span>
            <span style="color: #059669; font-weight: 700; font-size: 24px;">${formattedAmount}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #bbf7d0;">
            <span style="color: #15803d; font-weight: 500; font-size: 14px;">Purpose:</span>
            <span style="color: #14532d; font-weight: 500; font-size: 14px; text-align: right; max-width: 300px;">${
              fundRequest.purpose
            }</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #bbf7d0;">
            <span style="color: #15803d; font-weight: 500; font-size: 14px;">Status:</span>
            <span style="color: #059669; font-weight: 700; font-size: 16px;">✅ APPROVED</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #bbf7d0;">
            <span style="color: #15803d; font-weight: 500; font-size: 14px;">Approved by:</span>
            <span style="color: #7c3aed; font-weight: 500; font-size: 14px;">${approver}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 14px 0;">
            <span style="color: #15803d; font-weight: 500; font-size: 14px;">Decision Date:</span>
            <span style="color: #14532d; font-weight: 500; font-size: 14px;">${new Date().toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            )}</span>
          </div>
        </div>
      </div>
      
      ${
        comments
          ? `
      <!-- Comments Section -->
      <div style="background-color: #f8fafc; border-radius: 16px; padding: 28px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        <h3 style="color: #475569; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Reviewer Comments</h3>
        <div style="background-color: #ffffff; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
          <p style="color: #475569; margin: 0; line-height: 1.6; font-size: 14px; font-style: italic;">
            "${comments}"
          </p>
        </div>
      </div>
      `
          : ""
      }
      
      <!-- Success Message -->
      <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 16px; padding: 28px; text-align: center; border: 1px solid #16a34a;">
        <div style="font-size: 32px; margin-bottom: 16px;">🎉</div>
        <h3 style="color: #15803d; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
          Congratulations! Your fund request has been approved.
        </h3>
        <p style="color: #15803d; margin: 0; font-size: 14px; line-height: 1.6;">
          You will receive further instructions on the next steps for fund disbursement.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; margin: 0 0 8px 0; font-size: 13px;">
        This is an automated notification from the Fund Request System
      </p>
      <p style="color: #94a3b8; margin: 0; font-size: 12px;">
        If you have any questions, please contact your system administrator.
      </p>
    </div>
  </div>
</body>
</html>`;
};

/**
 * Creates a beautiful email template for fund request denial notifications
 * Sent to requesters when their fund request has been denied
 *
 * @param {Object} fundRequest - The fund request object containing all request details
 * @param {string} approver - Name/email of the person who denied the request
 * @param {string} comments - Optional comments explaining the denial reason
 * @returns {string} Complete HTML email template with denial styling
 */
const createBeautifulDenialTemplate = (fundRequest, approver, comments) => {
  const formattedAmount = formatCurrency(
    fundRequest.amount,
    fundRequest.currency
  );

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fund Request DENIED</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #f8fafc; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', sans-serif;">
  <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center; color: white;">
      <div style="font-size: 48px; margin-bottom: 12px;">❌</div>
      <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em;">
        Fund Request DENIED
      </h1>
      <p style="margin: 0; font-size: 16px; opacity: 0.9; font-weight: 400;">
        Your fund request has been denied
      </p>
    </div>
    
    <!-- Status Badge -->
    <div style="text-align: center; margin-top: -20px; position: relative; z-index: 10;">
      <span style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 32px; border-radius: 25px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(220, 38, 38, 0.3);">
        DENIED
      </span>
    </div>
    
    <!-- Content -->
    <div style="padding: 35px 30px;">
      
      <!-- Request Details -->
      <div style="background-color: #fef2f2; border-radius: 16px; padding: 28px; margin-bottom: 24px; border: 1px solid #fecaca;">
        <h2 style="color: #dc2626; margin: 0 0 24px 0; font-size: 20px; font-weight: 600;">Request Details</h2>
        
        <div style="space-y: 16px;">
          <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #fecaca;">
            <span style="color: #dc2626; font-weight: 500; font-size: 14px;">Request ID:</span>
            <span style="color: #991b1b; font-weight: 600; font-family: 'SF Mono', monospace; font-size: 14px;">${
              fundRequest.id || "N/A"
            }</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #fecaca;">
            <span style="color: #dc2626; font-weight: 500; font-size: 14px;">Amount:</span>
            <span style="color: #6b7280; font-weight: 700; font-size: 24px;">${formattedAmount}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #fecaca;">
            <span style="color: #dc2626; font-weight: 500; font-size: 14px;">Purpose:</span>
            <span style="color: #991b1b; font-weight: 500; font-size: 14px; text-align: right; max-width: 300px;">${
              fundRequest.purpose
            }</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #fecaca;">
            <span style="color: #dc2626; font-weight: 500; font-size: 14px;">Status:</span>
            <span style="color: #dc2626; font-weight: 700; font-size: 16px;">❌ DENIED</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #fecaca;">
            <span style="color: #dc2626; font-weight: 500; font-size: 14px;">Reviewed by:</span>
            <span style="color: #7c3aed; font-weight: 500; font-size: 14px;">${approver}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 14px 0;">
            <span style="color: #dc2626; font-weight: 500; font-size: 14px;">Decision Date:</span>
            <span style="color: #991b1b; font-weight: 500; font-size: 14px;">${new Date().toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            )}</span>
          </div>
        </div>
      </div>
      
      ${
        comments
          ? `
      <!-- Comments Section -->
      <div style="background-color: #fef2f2; border-radius: 16px; padding: 28px; margin-bottom: 24px; border: 1px solid #fecaca;">
        <h3 style="color: #dc2626; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Reviewer Notes</h3>
        <div style="background-color: #ffffff; border-radius: 12px; padding: 20px; border: 1px solid #fecaca;">
          <p style="color: #991b1b; margin: 0; line-height: 1.6; font-size: 14px;">
            ${comments}
          </p>
        </div>
      </div>
      `
          : ""
      }
      
      <!-- Information Message -->
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 16px; padding: 28px; text-align: center; border: 1px solid #f59e0b;">
        <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
          Your fund request has been denied.
        </h3>
        <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
          If you have questions about this decision, please contact your approver or system administrator.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; margin: 0 0 8px 0; font-size: 13px;">
        This is an automated notification from the Fund Request System
      </p>
      <p style="color: #94a3b8; margin: 0; font-size: 12px;">
        If you have any questions, please contact your system administrator.
      </p>
    </div>
  </div>
</body>
</html>`;
};

/**
 * Formats a monetary amount with the appropriate currency symbol
 * @param {string|number} amount - The amount to format
 * @param {string} [currency="NGN"] - The currency code (NGN, USD, EUR, CAD)
 * @returns {string} Formatted currency string with symbol and localized number
 * @example
 * formatCurrency(1000, "NGN") // Returns "₦1,000"
 * formatCurrency("2500.50", "USD") // Returns "$2,500.5"
 */
function formatCurrency(amount, currency = "NGN") {
  const currencySymbols = {
    NGN: "₦",
    USD: "$",
    EUR: "€",
    CAD: "C$",
  };

  const symbol = currencySymbols[currency] || currency;
  const numericAmount = parseFloat(amount) || 0;
  return `${symbol}${numericAmount.toLocaleString()}`;
}

/**
 * Module exports for beautiful email templates
 * These templates provide professional, responsive HTML email designs
 * for fund request notifications with modern styling and branding
 */
module.exports = {
  createBeautifulApprovalRequestTemplate,
  createBeautifulApprovalTemplate,
  createBeautifulDenialTemplate,
};
