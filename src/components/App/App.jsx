import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../../Pages/Login/Login.jsx";
import Dashboard from "../../Pages/Dashboard/Dashboard.jsx";
import "./App.css";

function ProtectedRoute({ isLoggedIn, children }) {
  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  function handleLogin() {
    // later you’ll replace this with real auth logic
    setIsLoggedIn(true);
  }

  function handleLogout() {
    setIsLoggedIn(false);
  }

  return (
    <div className="app">
      <Routes>
        {/* Landing page = Login, at "/" */}
        <Route
          path="/"
          element={<Login onLogin={handleLogin} isLoggedIn={isLoggedIn} />}
        />

        {/* Dashboard is protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <Dashboard onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* Catch-all: anything unknown → Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
