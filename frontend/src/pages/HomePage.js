import React from "react";
import FundRequestForm from "../components/FundRequestForm";

const HomePage = () => {
  const handleSubmissionSuccess = (result) => {
    // Scroll to bottom to show the notification in the form
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="page-container">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-3">
          <h1>
            <img src="/logo.png" alt="Logo" style={{ height: "40px" }} /> Fund
            Request System
          </h1>
          <p
            style={{
              fontSize: "1.1rem",
              color: "#7f8c8d",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            Submit your fund requests quickly and easily. An approval email will
            be sent to your designated approver for review and processing.
          </p>
        </div>

        {/* How it Works */}
        <div className="card mb-3">
          <h3 style={{ textAlign: "center" }}>📋 How It Works</h3>
          <div className="row">
            <div className="col-2">
              <div style={{ textAlign: "center", padding: "20px" }}>
                <div style={{ fontSize: "3rem", marginBottom: "10px" }}>1️⃣</div>
                <h4>Fill the Form</h4>
                <p>
                  Complete all required information including amount, purpose,
                  and approver email.
                </p>
              </div>
            </div>
            <div className="col-2">
              <div style={{ textAlign: "center", padding: "20px" }}>
                <div style={{ fontSize: "3rem", marginBottom: "10px" }}>2️⃣</div>
                <h4>Email Sent</h4>
                <p>
                  Your approver receives an email with a secure link to review
                  your request.
                </p>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-2">
              <div style={{ textAlign: "center", padding: "20px" }}>
                <div style={{ fontSize: "3rem", marginBottom: "10px" }}>3️⃣</div>
                <h4>Review & Approve</h4>
                <p>
                  Approver reviews details and makes a decision through the
                  secure approval link.
                </p>
              </div>
            </div>
            <div className="col-2">
              <div style={{ textAlign: "center", padding: "20px" }}>
                <div style={{ fontSize: "3rem", marginBottom: "10px" }}>4️⃣</div>
                <h4>Get Results</h4>
                <p>
                  You receive notification of the decision and can generate PDF
                  documentation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fund Request Form */}
        <FundRequestForm onSubmissionSuccess={handleSubmissionSuccess} />

        {/* Help Section */}
        <div className="card">
          <h3>❓ Need Help?</h3>
          <div className="row">
            <div className="col-2">
              <h4>Required Information</h4>
              <ul style={{ lineHeight: "1.8" }}>
                <li>Your full name and email</li>
                <li>Amount requested (up to $1,000,000)</li>
                <li>Clear purpose for the funds</li>
                <li>Valid approver email address</li>
              </ul>
            </div>
            <div className="col-2">
              <h4>Tips for Success</h4>
              <ul style={{ lineHeight: "1.8" }}>
                <li>Be specific about the purpose</li>
                <li>Provide detailed descriptions when possible</li>
                <li>Use the correct approver email</li>
                <li>Mark urgent requests appropriately</li>
              </ul>
            </div>
          </div>

          <div className="alert alert-info mt-2">
            <span>💡</span>
            <div>
              <strong>Pro Tip:</strong> Make sure your approver expects the
              email. Approval links expire after 7 days for security purposes.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="text-center mt-3"
          style={{ color: "#7f8c8d", fontSize: "0.9rem" }}
        >
          <p>
            © {new Date().getFullYear()} Fund Request System. All requests are
            processed securely.
          </p>
          <p>
            Questions? Contact your system administrator or
            <a
              href="mailto:support@company.com"
              style={{ color: "#3498db", marginLeft: "5px" }}
            >
              eclefzy@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
