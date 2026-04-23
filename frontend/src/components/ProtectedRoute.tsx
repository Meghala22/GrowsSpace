import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LoadingBlock } from "./LoadingBlock";

export function ProtectedRoute({ requireAdmin = false }: { requireAdmin?: boolean }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return <LoadingBlock label="Checking your session..." />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireAdmin && !auth.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
