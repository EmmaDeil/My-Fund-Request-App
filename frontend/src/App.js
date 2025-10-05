import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import HomePage from "./pages/HomePage";
import ApprovalPage from "./pages/ApprovalPage";
import NotFoundPage from "./pages/NotFoundPage";
import "./styles/globals.css";

// Component to handle legacy hash-based URLs
function HashRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if URL has hash with approval link
    const hash = window.location.hash;
    if (hash) {
      // Extract token from hash like #/approve/token
      const match = hash.match(/#\/?approve\/([a-f0-9-]+)/i);
      if (match && match[1]) {
        const token = match[1];
        // Redirect to new query param format
        navigate(`/approve?token=${token}`, { replace: true });
      }
    }
  }, [navigate, location]);

  return null;
}

function App() {
  return (
    <div className="App">
      <ErrorBoundary>
        <Router>
          <HashRedirect />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/approve" element={<ApprovalPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    </div>
  );
}

export default App;
