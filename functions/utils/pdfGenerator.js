const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

class PDFGeneratorService {
  constructor() {
    this.logoPath = null; // Path to company logo if available
  }

  /**
   * Generate PDF document for fund request decision
   * @param {Object} requestData - Fund request data from database
   * @param {string} decision - 'approved' or 'denied'
   * @param {string} approverName - Name of the person who made the decision
   * @param {string} notes - Additional notes from approver
   * @returns {Buffer} PDF buffer
   */
  async generateApprovalPDF(requestData, decision, approverName, notes) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 50,
          info: {
            Title: `Fund Request ${decision.toUpperCase()} - ${requestData.id}`,
            Author: "Fund Request System",
            Subject: `Fund Request Decision Document`,
            Keywords: "fund request, approval, decision, finance",
          },
        });

        let buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on("error", reject);

        // Header
        this.addHeader(doc, decision);

        // Decision Status Box
        this.addDecisionStatus(doc, decision, requestData);

        // Request Details
        this.addRequestDetails(doc, requestData);

        // Approval Details
        this.addApprovalDetails(
          doc,
          decision,
          approverName,
          notes,
          requestData
        );

        // Footer
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  addHeader(doc, decision) {
    // Company Header
    doc.fontSize(24).fillColor("#2C3E50").text("FUND REQUEST SYSTEM", 50, 50);

    doc
      .fontSize(12)
      .fillColor("#7F8C8D")
      .text("Official Decision Document", 50, 80);

    // Decision Badge
    const badgeColor = decision === "approved" ? "#27AE60" : "#E74C3C";
    const badgeText = decision.toUpperCase();

    doc.rect(400, 50, 120, 30).fillAndStroke(badgeColor, badgeColor);

    doc.fontSize(14).fillColor("white").text(badgeText, 410, 58);

    // Line separator
    doc
      .strokeColor("#BDC3C7")
      .lineWidth(1)
      .moveTo(50, 110)
      .lineTo(550, 110)
      .stroke();

    doc.moveDown(2);
  }

  addDecisionStatus(doc, decision, requestData) {
    const currentY = doc.y + 20;

    // Status Box
    const boxColor = decision === "approved" ? "#D5EDDA" : "#F8D7DA";
    const textColor = decision === "approved" ? "#155724" : "#721C24";

    doc.rect(50, currentY, 500, 60).fillAndStroke(boxColor, "#BDC3C7");

    doc
      .fontSize(16)
      .fillColor(textColor)
      .text(
        `Request ${decision === "approved" ? "APPROVED" : "DENIED"}`,
        70,
        currentY + 15
      );

    doc
      .fontSize(12)
      .fillColor("#6C757D")
      .text(`Request ID: ${requestData.id}`, 70, currentY + 35)
      .text(
        `Decision Date: ${new Date().toLocaleDateString()}`,
        300,
        currentY + 35
      );

    doc.y = currentY + 80;
  }

  addRequestDetails(doc, requestData) {
    doc.fontSize(14).fillColor("#2C3E50").text("REQUEST DETAILS", 50, doc.y);

    doc
      .strokeColor("#BDC3C7")
      .lineWidth(0.5)
      .moveTo(50, doc.y + 5)
      .lineTo(200, doc.y + 5)
      .stroke();

    doc.moveDown(0.5);

    const details = [
      { label: "Requester Name:", value: requestData.requester_name },
      { label: "Email:", value: requestData.requester_email },
      {
        label: "Amount:",
        value: `${requestData.currency} ${parseFloat(
          requestData.amount
        ).toLocaleString()}`,
      },
      { label: "Purpose:", value: requestData.purpose },
      { label: "Department:", value: requestData.department || "N/A" },
      { label: "Category:", value: requestData.category || "N/A" },
      { label: "Urgent:", value: requestData.urgent ? "Yes" : "No" },
      {
        label: "Submitted:",
        value: new Date(requestData.created_at).toLocaleString(),
      },
    ];

    details.forEach((detail) => {
      doc
        .fontSize(10)
        .fillColor("#495057")
        .text(detail.label, 70, doc.y, { width: 120, align: "left" })
        .fillColor("#212529")
        .text(detail.value, 200, doc.y, { width: 320 });
      doc.moveDown(0.3);
    });

    if (requestData.description) {
      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .fillColor("#495057")
        .text("Description:", 70, doc.y)
        .fillColor("#212529")
        .text(requestData.description, 70, doc.y + 15, {
          width: 450,
          align: "justify",
        });
      doc.moveDown(1);
    }
  }

  addApprovalDetails(doc, decision, approverName, notes, requestData) {
    doc.moveDown(1);

    doc.fontSize(14).fillColor("#2C3E50").text("DECISION DETAILS", 50, doc.y);

    doc
      .strokeColor("#BDC3C7")
      .lineWidth(0.5)
      .moveTo(50, doc.y + 5)
      .lineTo(200, doc.y + 5)
      .stroke();

    doc.moveDown(0.5);

    const approvalDetails = [
      { label: "Decision:", value: decision.toUpperCase() },
      {
        label: "Approved/Denied By:",
        value:
          approverName || requestData.approved_by || "System Administrator",
      },
      { label: "Decision Date:", value: new Date().toLocaleString() },
      { label: "Approver Email:", value: requestData.approver_email },
    ];

    approvalDetails.forEach((detail) => {
      doc
        .fontSize(10)
        .fillColor("#495057")
        .text(detail.label, 70, doc.y, { width: 120 })
        .fillColor("#212529")
        .text(detail.value, 200, doc.y, { width: 320 });
      doc.moveDown(0.3);
    });

    if (notes && notes.trim()) {
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .fillColor("#495057")
        .text("Additional Notes:", 70, doc.y)
        .fillColor("#212529")
        .text(notes, 70, doc.y + 15, { width: 450, align: "justify" });
    }

    // Financial Summary for Approved Requests
    if (decision === "approved") {
      doc.moveDown(1);

      const summaryY = doc.y;
      doc.rect(50, summaryY, 500, 50).fillAndStroke("#E8F5E8", "#27AE60");

      doc
        .fontSize(12)
        .fillColor("#155724")
        .text("✓ APPROVED AMOUNT", 70, summaryY + 10);

      doc
        .fontSize(18)
        .fillColor("#27AE60")
        .text(
          `${requestData.currency} ${parseFloat(
            requestData.amount
          ).toLocaleString()}`,
          70,
          summaryY + 25
        );

      doc
        .fontSize(10)
        .fillColor("#6C757D")
        .text(
          "This amount has been approved for disbursement.",
          300,
          summaryY + 30
        );

      doc.y = summaryY + 60;
    }
  }

  addFooter(doc) {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 100;

    // Footer line
    doc
      .strokeColor("#BDC3C7")
      .lineWidth(0.5)
      .moveTo(50, footerY)
      .lineTo(550, footerY)
      .stroke();

    // Footer content
    doc
      .fontSize(8)
      .fillColor("#6C757D")
      .text(
        "This document was automatically generated by the Fund Request System.",
        50,
        footerY + 10
      )
      .text(
        "For questions or concerns, please contact your system administrator.",
        50,
        footerY + 25
      );

    // Document metadata
    doc
      .text(`Generated on: ${new Date().toLocaleString()}`, 50, footerY + 45)
      .text("Page 1 of 1", 450, footerY + 45);

    // Security notice
    doc
      .fontSize(7)
      .fillColor("#DC3545")
      .text(
        "CONFIDENTIAL: This document contains sensitive financial information.",
        50,
        footerY + 65
      );
  }

  /**
   * Save PDF to file system (for debugging or archival)
   * @param {Buffer} pdfBuffer - PDF buffer
   * @param {string} filename - Filename to save as
   */
  async savePDFToFile(pdfBuffer, filename) {
    try {
      const outputDir = path.join(__dirname, "..", "generated-pdfs");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const filePath = path.join(outputDir, filename);
      fs.writeFileSync(filePath, pdfBuffer);
      console.log(`📄 PDF saved to: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error("❌ Error saving PDF:", error.message);
      throw error;
    }
  }

  /**
   * Generate filename for PDF
   * @param {Object} requestData - Fund request data
   * @param {string} decision - 'approved' or 'denied'
   */
  generatePDFFilename(requestData, decision) {
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const sanitizedName = requestData.requester_name.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    );
    return `fund_request_${decision}_${requestData.id.substring(
      0,
      8
    )}_${sanitizedName}_${date}.pdf`;
  }
}

module.exports = new PDFGeneratorService();
