import React, { useState } from "react";
import { fundRequestAPI } from "../utils/api";

const FundRequestForm = ({ onSubmissionSuccess }) => {
  const [formData, setFormData] = useState({
    requester_name: "",
    requester_email: "",
    amount: "",
    currency: "NGN",
    purpose: "",
    description: "",
    approver_email: "",
    department: "",
    category: "",
    urgent: false,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    // Required field validations
    if (!formData.requester_name.trim()) {
      newErrors.requester_name = "Your name is required";
    } else if (formData.requester_name.trim().length < 2) {
      newErrors.requester_name = "Name must be at least 2 characters";
    }

    if (!formData.requester_email.trim()) {
      newErrors.requester_email = "Your email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.requester_email)) {
      newErrors.requester_email = "Please enter a valid email address";
    }

    if (!formData.amount) {
      newErrors.amount = "Amount is required";
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = "Amount must be a positive number";
      } else if (amount > 1000000) {
        newErrors.amount = "Amount cannot exceed $1,000,000";
      }
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = "Purpose is required";
    } else if (formData.purpose.trim().length < 10) {
      newErrors.purpose = "Purpose must be at least 10 characters";
    }

    if (!formData.approver_email.trim()) {
      newErrors.approver_email = "Approver email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.approver_email)) {
      newErrors.approver_email = "Please enter a valid email address";
    }

    // Check if requester and approver are different
    if (
      formData.requester_email &&
      formData.approver_email &&
      formData.requester_email.toLowerCase() ===
        formData.approver_email.toLowerCase()
    ) {
      newErrors.approver_email =
        "Approver email must be different from your email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    // Clear submit status on form change
    if (submitStatus) {
      setSubmitStatus(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setSubmitStatus({
        type: "error",
        message: "Please correct the errors above before submitting.",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Prepare data for submission
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        requester_email: formData.requester_email.trim().toLowerCase(),
        approver_email: formData.approver_email.trim().toLowerCase(),
        requester_name: formData.requester_name.trim(),
        purpose: formData.purpose.trim(),
        description: formData.description.trim() || undefined,
        department: formData.department.trim() || undefined,
        category: formData.category.trim() || undefined,
      };

      const result = await fundRequestAPI.create(submitData);

      // Create success message based on email status
      let successMessage = "🎉 Request Submitted Successfully!";
      let emailDetails = [];

      if (result.approvalEmailSent && result.confirmationEmailSent) {
        emailDetails.push("✉️ Approval email sent to approver");
        emailDetails.push("✉️ Confirmation email sent to you");
      } else if (result.approvalEmailSent) {
        emailDetails.push("✉️ Approval email sent to approver");
        emailDetails.push(
          "⚠️ Confirmation email failed - please check your email"
        );
      } else if (result.confirmationEmailSent) {
        emailDetails.push(
          "⚠️ Approval email failed - please contact approver manually"
        );
        emailDetails.push("✉️ Confirmation email sent to you");
      } else {
        emailDetails.push(
          "⚠️ Email notifications failed - please contact approver manually"
        );
      }

      setSubmitStatus({
        type: result.warning ? "warning" : "success",
        message: successMessage,
        emailDetails: emailDetails,
        requestId: result.requestId,
        warning: result.warning,
      });

      // Reset form
      setFormData({
        requester_name: "",
        requester_email: "",
        amount: "",
        currency: "NGN",
        purpose: "",
        description: "",
        approver_email: "",
        department: "",
        category: "",
        urgent: false,
      });

      // Call success callback if provided
      if (onSubmissionSuccess) {
        onSubmissionSuccess(result);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setSubmitStatus({
        type: "error",
        message:
          error.message || "Failed to submit fund request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value) => {
    const number = parseFloat(value);
    return isNaN(number)
      ? ""
      : number.toLocaleString("en-US", {
          style: "currency",
          currency: formData.currency,
          minimumFractionDigits: 2,
        });
  };

  return (
    <div className="card fade-in">
      <div className="card-header">
        <h2 className="card-title">Fund Request Form</h2>
        <p className="card-subtitle">
          Please fill out all required information below. An email will be sent
          to the approver once submitted.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-2">
            <div className="form-group">
              <label htmlFor="requester_name" className="form-label required">
                Your Name
              </label>
              <input
                type="text"
                id="requester_name"
                name="requester_name"
                value={formData.requester_name}
                onChange={handleInputChange}
                className={`form-control ${
                  errors.requester_name ? "error" : ""
                }`}
                placeholder="Enter your full name"
                disabled={isSubmitting}
              />
              {errors.requester_name && (
                <div className="form-error">
                  <span>⚠️</span> {errors.requester_name}
                </div>
              )}
            </div>
          </div>

          <div className="col-2">
            <div className="form-group">
              <label htmlFor="requester_email" className="form-label required">
                Your Email
              </label>
              <input
                type="email"
                id="requester_email"
                name="requester_email"
                value={formData.requester_email}
                onChange={handleInputChange}
                className={`form-control ${
                  errors.requester_email ? "error" : ""
                }`}
                placeholder="your.email@company.com"
                disabled={isSubmitting}
              />
              {errors.requester_email && (
                <div className="form-error">
                  <span>⚠️</span> {errors.requester_email}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-2">
            <div className="form-group">
              <label htmlFor="amount" className="form-label required">
                Amount Requested
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                className={`form-control ${errors.amount ? "error" : ""}`}
                placeholder="0.00"
                min="0.01"
                max="1000000"
                step="0.01"
                disabled={isSubmitting}
              />
              {errors.amount && (
                <div className="form-error">
                  <span>⚠️</span> {errors.amount}
                </div>
              )}
              {formData.amount && !errors.amount && (
                <div className="form-help">
                  Amount: {formatCurrency(formData.amount)}
                </div>
              )}
            </div>
          </div>

          <div className="col-2">
            <div className="form-group">
              <label htmlFor="currency" className="form-label">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="form-control"
                disabled={isSubmitting}
              >
                <option value="NGN">NGN (₦)</option>
                {/* <option value="USD">USD ($)</option> */}
                <option value="EUR">EUR (€)</option>
                {/* <option value="GBP">GBP (£)</option> */}
                <option value="CAD">CAD (C$)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="purpose" className="form-label required">
            Purpose of Request
          </label>
          <input
            type="text"
            id="purpose"
            name="purpose"
            value={formData.purpose}
            onChange={handleInputChange}
            className={`form-control ${errors.purpose ? "error" : ""}`}
            placeholder="Brief description of what the funds are for"
            disabled={isSubmitting}
          />
          {errors.purpose && (
            <div className="form-error">
              <span>⚠️</span> {errors.purpose}
            </div>
          )}
          <div className="form-help">
            {formData.purpose.length}/200 characters
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Detailed Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="form-control"
            placeholder="Provide additional details about your request..."
            rows="4"
            disabled={isSubmitting}
          />
          <div className="form-help">
            Provide any additional context or justification for your request
          </div>
        </div>

        <div className="row">
          <div className="col-2">
            <div className="form-group">
              <label htmlFor="department" className="form-label">
                Department (Optional)
              </label>
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="form-control"
                placeholder="e.g., Marketing, IT, Sales"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="col-2">
            <div className="form-group">
              <label htmlFor="category" className="form-label">
                Category (Optional)
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="form-control"
                disabled={isSubmitting}
              >
                <option value="">Select a category</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Travel">Travel</option>
                <option value="Equipment">Equipment</option>
                <option value="Training">Training</option>
                <option value="Software">Software</option>
                <option value="Marketing">Marketing</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="approver_email" className="form-label required">
            Approver Email
          </label>
          <input
            type="email"
            id="approver_email"
            name="approver_email"
            value={formData.approver_email}
            onChange={handleInputChange}
            className={`form-control ${errors.approver_email ? "error" : ""}`}
            placeholder="manager@company.com"
            disabled={isSubmitting}
          />
          {errors.approver_email && (
            <div className="form-error">
              <span>⚠️</span> {errors.approver_email}
            </div>
          )}
          <div className="form-help">
            The person who needs to approve this request will receive an email
            notification
          </div>
        </div>

        <div className="form-group">
          <label className="d-flex align-items-center gap-1">
            <input
              type="checkbox"
              name="urgent"
              checked={formData.urgent}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
            <span className="form-label mt-1">Mark as urgent</span>
          </label>
          <div className="form-help">
            Urgent requests will be highlighted in the approval email
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="form-help">
            <span>*</span> Required fields
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                Submitting...
              </>
            ) : (
              <>
                <span>📨</span>
                Submit Request
              </>
            )}
          </button>
        </div>
      </form>

      {submitStatus && (
        <div
          className={`alert mt-3 ${
            submitStatus.type === "success"
              ? "alert-success"
              : submitStatus.type === "warning"
              ? "alert-warning"
              : "alert-error"
          }`}
        >
          <span>
            {submitStatus.type === "success"
              ? "🎉"
              : submitStatus.type === "warning"
              ? "⚠️"
              : "❌"}
          </span>
          <div>
            <strong>{submitStatus.message}</strong>
            {submitStatus.requestId && (
              <div className="mt-1">
                <small>Request ID: {submitStatus.requestId}</small>
              </div>
            )}
            {submitStatus.emailDetails &&
              submitStatus.emailDetails.length > 0 && (
                <div className="mt-2">
                  <div style={{ fontSize: "0.9em" }}>
                    {submitStatus.emailDetails.map((detail, index) => (
                      <div key={index} style={{ marginBottom: "4px" }}>
                        {detail}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            {submitStatus.warning && (
              <div
                className="mt-2"
                style={{ fontSize: "0.9em", color: "#856404" }}
              >
                <strong>Note:</strong> {submitStatus.warning}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FundRequestForm;
