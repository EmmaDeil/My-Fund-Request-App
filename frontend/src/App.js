import React from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import HomePage from "./pages/HomePage";
import ApprovalPage from "./pages/ApprovalPage";
import NotFoundPage from "./pages/NotFoundPage";
import "./styles/globals.css";

function App() {
  return (
    <div className="App">
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/approve/:token" element={<ApprovalPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    </div>
  );
}

export default App;
