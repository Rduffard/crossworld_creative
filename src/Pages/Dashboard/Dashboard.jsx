import DashboardSectionCard from "./DashboardSelectionCard";
import "./Dashboard.css";
import Navbar from "../../components/Navbar/Navbar";

export function Dashboard() {
  return (
    <main className="dashboard-page">
      <Navbar />

      <section className="dashboard-grid">
        <DashboardSectionCard
          title="Projects"
          description="Bootcamp work, experiments, and personal dev projects."
          to="/dashboard/projects"
        />
        <DashboardSectionCard
          title="Music"
          description="Bands, tracks, albums, and audio projects."
          to="/dashboard/music"
        />
        <DashboardSectionCard
          title="Games"
          description="Game dev, QA-related experiments, and interactive ideas."
          to="/dashboard/games"
        />
        <DashboardSectionCard
          title="Literature"
          description="Taxi Cop, D&D lore, Antarctic novel, and more writing."
          to="/dashboard/literature"
        />
        <DashboardSectionCard
          title="Community"
          description="Future forum / social area for posts and interaction."
          to="/dashboard/community"
        />
        <DashboardSectionCard
          title="Profile"
          description="View and tweak your personal info and presence."
          to="/profile"
        />
        <DashboardSectionCard
          title="Settings"
          description="Themes, account settings, and app preferences."
          to="/settings"
        />
      </section>
    </main>
  );
}

export default Dashboard;
