import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useOperationsAccess } from "../../hooks/useOperationsAccess";

const Operations = lazy(() => import("./Operations"));

export default function OperationsEntrance() {
  const access = useOperationsAccess();
  const loading = <p role="status">Checking private Operations access…</p>;
  if (access === null) return <main className="studio-access">{loading}</main>;
  if (!access) {
    return (
      <main className="studio-access">
        <h1>Crossworld Operations</h1>
        <p>Private Operations access unavailable.</p>
        <Link to="/dashboard">Return to the studio</Link>
      </main>
    );
  }
  return <Suspense fallback={<main className="studio-access"><p role="status">Loading Operations…</p></main>}><Operations /></Suspense>;
}
