import DashboardCard from "../DashboardCard/DashboardCard";
import "./DashboardCardGrid.css";
import { useAuth } from "../../context/AuthContext.jsx";

export default function DashboardCardGrid() {
  const { loaded, isAuthenticated } = useAuth();

  // Avoid flicker while auth initializes (localStorage check, etc.)
  if (!loaded) return null;

  const cards = [
    {
      title: "Projects",
      description: "Bootcamp work, experiments, and personal dev projects.",
      to: "/dashboard/projects",
      variant: "featured",
      tone: "projects",
    },
    {
      title: "Music",
      description: "Bands, tracks, albums, and audio projects.",
      to: "/dashboard/music",
      variant: "featured",
      tone: "music",
    },
    {
      title: "Games",
      description: "Game dev, QA-related experiments, and interactive ideas.",
      to: "/dashboard/games",
      variant: "featured",
      tone: "games",
    },
    {
      title: "Literature",
      description: "Taxi Cop, D&D lore, Antarctic novel, and more writing.",
      to: "/dashboard/literature",
      variant: "featured",
      tone: "literature",
    },
    {
      title: "Community",
      description: "Future forum / social area for posts and interaction.",
      to: "/dashboard/community",
      tone: "community",
    },
    {
      title: "Profile",
      description: "View and tweak your personal info and presence.",
      to: "/profile",
      requiresAuth: true,
      tone: "profile",
    },
    {
      title: "Settings",
      description: "Themes, account settings, and app preferences.",
      to: "/settings",
      requiresAuth: true,
      tone: "settings",
    },
  ];

  return (
    <section className="dashboard-grid">
      {cards.map((card) => (
        <DashboardCard
          key={card.to}
          title={card.title}
          description={card.description}
          to={card.to}
          variant={card.variant}
          tone={card.tone}
          disabled={Boolean(card.requiresAuth && !isAuthenticated)}
        />
      ))}
    </section>
  );
}
