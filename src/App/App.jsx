import { Routes, Route, Navigate } from "react-router-dom";

import DashboardShell from "../components/DashboadShell/DashboardShell.jsx";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";

import Login from "../Pages/Login/Login";
import Dashboard from "../Pages/Dashboard/Dashboard";
import Projects from "../Pages/Projects/Projects";
import Music from "../Pages/Music/Music";
import Games from "../Pages/Games/Games";
import Literature from "../Pages/Literature/Literature";
import Community from "../Pages/Community/Community";
import Profile from "../Pages/Profile/Profile";
import Settings from "../Pages/Settings/Settings";

import "./App.css";

function App() {
  return (
    <div className="app">
      <Routes>
        {/* Public landing / login */}
        <Route path="/" element={<Login />} />

        {/* Dashboard section (public) */}
        <Route path="/dashboard" element={<DashboardShell />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="music" element={<Music />} />
          <Route path="games" element={<Games />} />
          <Route path="literature" element={<Literature />} />
          <Route path="community" element={<Community />} />
        </Route>

        {/* Account-only pages */}
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
