import { Outlet } from "react-router-dom";
import Navbar from "../Navbar/Navbar";
import "./DashboardShell.css";

function DashboardShell() {
  return (
    <>
      <Navbar />
      <main className="dashboard-shell">
        <div className="dashboard-shell__inner">
          <Outlet />
        </div>
      </main>
    </>
  );
}

export default DashboardShell;
