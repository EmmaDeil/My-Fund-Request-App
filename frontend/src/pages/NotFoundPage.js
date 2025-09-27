import React from "react";
import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div className="page-container">
      <div className="container">
        <div className="card text-center">
          <div
            style={{ fontSize: "6rem", marginBottom: "20px", color: "#7f8c8d" }}
          >
            🔍
          </div>
          <h2>Page Not Found</h2>
          <p
            style={{
              fontSize: "1.1rem",
              color: "#7f8c8d",
              marginBottom: "30px",
            }}
          >
            The page you're looking for doesn't exist or may have been moved.
          </p>

          <div className="alert alert-info">
            <span>💡</span>
            <div style={{ textAlign: "left" }}>
              <strong>Looking for something specific?</strong>
              <ul
                style={{
                  textAlign: "left",
                  marginTop: "10px",
                  marginBottom: "0",
                }}
              >
                <li>
                  If you have an approval link, make sure the URL is complete
                </li>
                <li>Check that the link hasn't expired (valid for 7 days)</li>
                <li>Try going back to the home page to submit a new request</li>
              </ul>
            </div>
          </div>

          <div className="d-flex justify-content-center gap-2">
            <Link to="/" className="btn btn-primary">
              🏠 Go to Home Page
            </Link>
            <button
              onClick={() => window.history.back()}
              className="btn btn-secondary"
            >
              ⬅️ Go Back
            </button>
          </div>

          <div
            className="mt-3"
            style={{ color: "#7f8c8d", fontSize: "0.9rem" }}
          >
            <p>Need help? Contact your system administrator.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
