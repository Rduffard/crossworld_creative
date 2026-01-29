import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loaded } = useAuth();
  const location = useLocation();

  // Avoid flicker while auth state loads (localStorage check, token verify, etc.)
  if (!loaded) return null; // swap for <Spinner /> later if you want

  if (!isAuthenticated) {
    // Optional: preserve where they tried to go
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
