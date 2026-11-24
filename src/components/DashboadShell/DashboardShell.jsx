import { Outlet } from "react-router-dom";
import Navbar from "../Navbar/Navbar";
import "../../studio/studio.css";
import "../../studio/studio-community.css";

function DashboardShell() {
  return (
    <div className="studio-shell">
      <a className="studio-skip" href="#studio-content">Skip to content</a>
      <Navbar />
      <main className="studio-content" id="studio-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="studio-footer"><span>Crossworld Creative</span><span>Reality is just the first draft.</span></footer>
    </div>
  );
}

export default DashboardShell;
