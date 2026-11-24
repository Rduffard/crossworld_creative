import { Routes, Route, Navigate } from "react-router-dom";
import OperationsEntrance from "../Pages/Operations/OperationsEntrance";

import DashboardShell from "../components/DashboadShell/DashboardShell.jsx";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";

import Login from "../Pages/Login/Login";
import Dashboard from "../Pages/Dashboard/Dashboard";
import Projects, { ProjectDetail } from "../Pages/Projects/Projects";
import Music, { SoloProjects } from "../Pages/Music/Music";
import Games, { TaxiCopGame } from "../Pages/Games/Games";
import Literature, { LiteratureDetail } from "../Pages/Literature/Literature";
import Community from "../Pages/Community/Community";
import CommunitySpace from "../Pages/Community/CommunitySpace";
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
          <Route path="projects/:projectId" element={<ProjectDetail />} />
          <Route path="music" element={<Music />} />
          <Route path="music/solo-projects" element={<SoloProjects />} />
          <Route path="games" element={<Games />} />
          <Route path="games/taxi-cop" element={<TaxiCopGame />} />
          <Route path="literature" element={<Literature />} />
          <Route path="literature/:workId" element={<LiteratureDetail />} />
          <Route path="community" element={<Community />} />
          <Route path="community/spaces/:spaceSlug" element={<CommunitySpace />} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <DashboardShell />
            </ProtectedRoute>
          }
        >
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="/operations" element={<ProtectedRoute><OperationsEntrance /></ProtectedRoute>} />
        <Route path="/games/taxi-cop" element={<Navigate to="/dashboard/games/taxi-cop" replace />} />
        <Route path="/music/solo-projects" element={<Navigate to="/dashboard/music/solo-projects" replace />} />
        <Route path="/literature/:workId" element={<DashboardShell />}>
          <Route index element={<LiteratureDetail />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
