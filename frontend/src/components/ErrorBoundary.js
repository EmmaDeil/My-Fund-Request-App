import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console for debugging
    console.error("Error caught by boundary:", error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-container">
          <div className="container">
            <div className="card text-center">
              <div
                style={{
                  fontSize: "4rem",
                  marginBottom: "20px",
                  color: "#e74c3c",
                }}
              >
                💥
              </div>
              <h2>Oops! Something went wrong</h2>
              <p
                style={{
                  fontSize: "1.1rem",
                  color: "#7f8c8d",
                  marginBottom: "30px",
                }}
              >
                We encountered an unexpected error. Please try refreshing the
                page.
              </p>

              <div
                className="alert alert-error"
                style={{ textAlign: "left", marginBottom: "30px" }}
              >
                <span>🔍</span>
                <div>
                  <strong>Technical Details:</strong>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.9rem",
                      marginTop: "10px",
                      wordBreak: "break-word",
                    }}
                  >
                    {this.state.error && this.state.error.toString()}
                  </div>
                  {process.env.REACT_APP_DEBUG === "true" &&
                    this.state.errorInfo && (
                      <details style={{ marginTop: "10px" }}>
                        <summary
                          style={{ cursor: "pointer", color: "#3498db" }}
                        >
                          Stack Trace (Debug Mode)
                        </summary>
                        <pre
                          style={{
                            fontSize: "0.8rem",
                            marginTop: "10px",
                            padding: "10px",
                            background: "#f8f9fa",
                            borderRadius: "4px",
                            overflow: "auto",
                            maxHeight: "200px",
                          }}
                        >
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                </div>
              </div>

              <div className="d-flex justify-content-center gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="btn btn-primary"
                >
                  🔄 Refresh Page
                </button>
                <button
                  onClick={() => {
                    this.setState({
                      hasError: false,
                      error: null,
                      errorInfo: null,
                    });
                  }}
                  className="btn btn-secondary"
                >
                  🔄 Try Again
                </button>
              </div>

              <div
                className="mt-3"
                style={{ color: "#7f8c8d", fontSize: "0.9rem" }}
              >
                <p>
                  If this problem persists, please contact your system
                  administrator.
                </p>
                <p>Error ID: {Date.now()}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
