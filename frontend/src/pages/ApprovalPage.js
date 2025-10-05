import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { approvalAPI } from "../utils/api";

const ApprovalPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [decision, setDecision] = useState(null);
  const [approverData, setApproverData] = useState({
    approver_name: "",
    notes: "",
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const loadRequestDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Add timeout and better error handling
      const response = await approvalAPI.getByToken(token);
      setRequest(response.request);
    } catch (err) {
      console.error("Error loading request details:", err);

      // Enhanced error handling with automatic redirect detection
      if (err.message.includes("404") || err.message.includes("Not Found")) {
        setError(
          "⚠️ Approval link not found. This might be due to a deployment issue. " +
            "Please contact the system administrator or try refreshing the page."
        );
      } else if (
        err.message.includes("Network error") ||
        err.message.includes("timeout")
      ) {
        setError(
          "🌐 Network connection issue. Please check your internet connection and try again."
        );
      } else if (err.message.includes("Invalid or expired")) {
        setError(
          "🕒 This approval link has expired or is invalid. Please contact the requester for a new approval link."
        );
      } else {
        setError(`❌ Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRequestDetails();
  }, [loadRequestDetails]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setApproverData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleActionClick = (action) => {
    if (!approverData.approver_name.trim()) {
      setError("Please enter your name before proceeding.");
      return;
    }

    setPendingAction(action);
    setShowConfirmation(true);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction || !approverData.approver_name.trim()) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const response = await approvalAPI.processApproval(
        token,
        pendingAction,
        approverData
      );

      setDecision({
        action: pendingAction,
        result: response,
        timestamp: new Date().toISOString(),
      });

      setShowConfirmation(false);
    } catch (err) {
      console.error("Error processing approval:", err);
      setError(err.message);
      setShowConfirmation(false);
    } finally {
      setProcessing(false);
      setPendingAction(null);
    }
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "NGN",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="container">
          <div className="text-center">
            <div
              className="spinner"
              style={{ width: "40px", height: "40px", margin: "50px auto" }}
            ></div>
            <p>Loading approval details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="page-container">
        <div className="container">
          <div className="card text-center">
            <div style={{ fontSize: "4rem", marginBottom: "20px" }}>❌</div>
            <h2>Unable to Load Request</h2>
            <p
              style={{
                fontSize: "1.1rem",
                color: "#7f8c8d",
                marginBottom: "30px",
              }}
            >
              {error}
            </p>
            <div className="alert alert-info">
              <span>💡</span>
              <div>
                <strong>Common reasons for this error:</strong>
                <ul style={{ textAlign: "left", marginTop: "10px" }}>
                  <li>
                    The approval link has expired (links are valid for 7 days)
                  </li>
                  <li>The request has already been processed</li>
                  <li>The link URL is incomplete or corrupted</li>
                </ul>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (decision) {
    const isApproved = decision.action === "approve";
    return (
      <div className="page-container">
        <div className="container">
          <div className="card text-center fade-in">
            <div style={{ fontSize: "4rem", marginBottom: "20px" }}>
              {isApproved ? "✅" : "❌"}
            </div>
            <h2>Request {isApproved ? "Approved" : "Denied"}</h2>
            <p
              style={{
                fontSize: "1.1rem",
                color: "#7f8c8d",
                marginBottom: "30px",
              }}
            >
              The fund request has been successfully{" "}
              {isApproved ? "approved" : "denied"}.
            </p>

            <div className="alert alert-success">
              <span>📧</span>
              <div>
                <strong>Email Notification Sent</strong>
                <p>
                  The requester has been automatically notified of your
                  decision.
                </p>
              </div>
            </div>

            <div
              className="card"
              style={{ textAlign: "left", marginTop: "30px" }}
            >
              <h3>Decision Summary</h3>
              <div className="row">
                <div className="col-2">
                  <strong>Request ID:</strong>
                  <br />
                  <span style={{ color: "#7f8c8d" }}>{request.id}</span>
                </div>
                <div className="col-2">
                  <strong>Decision:</strong>
                  <br />
                  <span
                    className={`status-badge status-${
                      isApproved ? "approved" : "denied"
                    }`}
                  >
                    {isApproved ? "APPROVED" : "DENIED"}
                  </span>
                </div>
              </div>
              <div className="row">
                <div className="col-2">
                  <strong>Decided by:</strong>
                  <br />
                  <span style={{ color: "#7f8c8d" }}>
                    {approverData.approver_name}
                  </span>
                </div>
                <div className="col-2">
                  <strong>Decision time:</strong>
                  <br />
                  <span style={{ color: "#7f8c8d" }}>
                    {formatDate(decision.timestamp)}
                  </span>
                </div>
              </div>
              {approverData.notes && (
                <div style={{ marginTop: "20px" }}>
                  <strong>Notes:</strong>
                  <br />
                  <span style={{ color: "#7f8c8d" }}>{approverData.notes}</span>
                </div>
              )}
            </div>

            <p style={{ color: "#7f8c8d", marginTop: "30px" }}>
              This approval link is now inactive. You may close this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-3">
          <h1>📋 Fund Request Approval</h1>
          <p style={{ fontSize: "1.1rem", color: "#7f8c8d" }}>
            Please review the details below and make your decision
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-error fade-in">
            <span>❌</span>
            <span>{error}</span>
          </div>
        )}

        {/* Request Details */}
        <div className="card fade-in">
          <div className="card-header">
            <h2 className="card-title">Request Details</h2>
            <div className="d-flex align-items-center gap-2">
              <span className="status-badge status-pending">
                PENDING APPROVAL
              </span>
              {request.urgent && (
                <span
                  style={{
                    background: "#fff3cd",
                    color: "#856404",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                  }}
                >
                  ⚠️ URGENT
                </span>
              )}
            </div>
          </div>

          <div className="row">
            <div className="col-2">
              <div className="form-group">
                <strong>Request ID:</strong>
                <br />
                <span style={{ color: "#7f8c8d", fontFamily: "monospace" }}>
                  {request.id}
                </span>
              </div>
            </div>
            <div className="col-2">
              <div className="form-group">
                <strong>Submitted:</strong>
                <br />
                <span style={{ color: "#7f8c8d" }}>
                  {formatDate(request.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-2">
              <div className="form-group">
                <strong>Requested by:</strong>
                <br />
                <span style={{ color: "#2c3e50", fontSize: "1.1rem" }}>
                  {request.requester_name}
                </span>
                <br />
                <span style={{ color: "#7f8c8d" }}>
                  {request.requester_email}
                </span>
              </div>
            </div>
            <div className="col-2">
              <div className="form-group">
                <strong>Amount:</strong>
                <br />
                <span
                  style={{
                    color: "#27ae60",
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                  }}
                >
                  {formatCurrency(request.amount, request.currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <strong>Purpose:</strong>
            <br />
            <span style={{ color: "#2c3e50", fontSize: "1.1rem" }}>
              {request.purpose}
            </span>
          </div>

          {request.description && (
            <div className="form-group">
              <strong>Description:</strong>
              <br />
              <div
                style={{
                  background: "#f8f9fa",
                  padding: "15px",
                  borderRadius: "6px",
                  borderLeft: "4px solid #3498db",
                }}
              >
                {request.description}
              </div>
            </div>
          )}

          <div className="row">
            {request.department && (
              <div className="col-2">
                <div className="form-group">
                  <strong>Department:</strong>
                  <br />
                  <span style={{ color: "#7f8c8d" }}>{request.department}</span>
                </div>
              </div>
            )}
            {request.category && (
              <div className="col-2">
                <div className="form-group">
                  <strong>Category:</strong>
                  <br />
                  <span style={{ color: "#7f8c8d" }}>{request.category}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Approval Form */}
        <div className="card fade-in">
          <div className="card-header">
            <h3 className="card-title">Your Decision</h3>
            <p className="card-subtitle">
              Please provide your information and make a decision on this
              request
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="approver_name" className="form-label required">
              Your Name
            </label>
            <input
              type="text"
              id="approver_name"
              name="approver_name"
              value={approverData.approver_name}
              onChange={handleInputChange}
              className="form-control"
              placeholder="Enter your full name"
              disabled={processing}
            />
            <div className="form-help">
              This will be recorded as the approver for this request
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes" className="form-label">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              value={approverData.notes}
              onChange={handleInputChange}
              className="form-control"
              placeholder="Add any comments or conditions for your decision..."
              rows="3"
              disabled={processing}
            />
            <div className="form-help">
              These notes will be included in the notification to the requester
            </div>
          </div>

          <div className="d-flex justify-content-center gap-2 mt-3">
            <button
              onClick={() => handleActionClick("deny")}
              className="btn btn-danger btn-lg"
              disabled={processing || !approverData.approver_name.trim()}
            >
              <span>❌</span>
              Deny Request
            </button>
            <button
              onClick={() => handleActionClick("approve")}
              className="btn btn-success btn-lg"
              disabled={processing || !approverData.approver_name.trim()}
            >
              <span>✅</span>
              Approve Request
            </button>
          </div>

          {!approverData.approver_name.trim() && (
            <div className="text-center mt-2">
              <small style={{ color: "#e74c3c" }}>
                Please enter your name before making a decision
              </small>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div className="card" style={{ maxWidth: "500px", margin: "20px" }}>
              <h3>Confirm Your Decision</h3>
              <p>
                Are you sure you want to <strong>{pendingAction}</strong> this
                fund request?
              </p>

              <div
                style={{
                  background: "#f8f9fa",
                  padding: "15px",
                  borderRadius: "6px",
                  margin: "20px 0",
                }}
              >
                <strong>Request Summary:</strong>
                <br />
                Amount: {formatCurrency(request.amount, request.currency)}
                <br />
                Purpose: {request.purpose}
                <br />
                Approver: {approverData.approver_name}
              </div>

              <p style={{ color: "#7f8c8d", fontSize: "0.9rem" }}>
                This action cannot be undone. The requester will be
                automatically notified of your decision.
              </p>

              <div className="d-flex justify-content-end gap-1 mt-3">
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    setPendingAction(null);
                  }}
                  className="btn btn-secondary"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  className={`btn ${
                    pendingAction === "approve" ? "btn-success" : "btn-danger"
                  }`}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <span className="spinner"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span>{pendingAction === "approve" ? "✅" : "❌"}</span>
                      Confirm{" "}
                      {pendingAction === "approve" ? "Approval" : "Denial"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className="text-center mt-3"
          style={{ color: "#7f8c8d", fontSize: "0.9rem" }}
        >
          <p>
            This approval link expires 7 days after the request was submitted.
          </p>
          <p>Questions? Contact your system administrator.</p>
        </div>
      </div>
    </div>
  );
};

export default ApprovalPage;
