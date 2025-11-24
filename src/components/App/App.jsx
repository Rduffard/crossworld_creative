import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import Login from "../../Pages/Login/Login.jsx";
import Dashboard from "../../Pages/Dashboard/Dashboard.jsx";
import Projects from "../../Pages/Projects/Projects.jsx";
import Music from "../../Pages/Music/Music.jsx";
import Games from "../../Pages/Games/Games.jsx";
import Literature from "../../Pages/Literature/Literature.jsx";
import Community from "../../Pages/Community/Community.jsx";
import Profile from "../../Pages/Profile/Profile.jsx";
import Settings from "../../Pages/Settings/Settings.jsx";

import "./App.css";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loaded } = useAuth();

  // optional: avoid flicker while we read localStorage
  if (!loaded) return null; // or a loading spinner

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const { logout } = useAuth();

  return (
    <div className="app">
      <Routes>
        {/* Landing / login page */}
        <Route path="/" element={<Login />} />

        {/* Dashboard & sections */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard onLogout={logout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/music"
          element={
            <ProtectedRoute>
              <Music />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/games"
          element={
            <ProtectedRoute>
              <Games />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/literature"
          element={
            <ProtectedRoute>
              <Literature />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/community"
          element={
            <ProtectedRoute>
              <Community />
            </ProtectedRoute>
          }
        />

        {/* Global pages */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
