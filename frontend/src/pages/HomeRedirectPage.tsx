import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LoadingBlock } from "../components/LoadingBlock";

export function HomeRedirectPage() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <LoadingBlock label="Preparing GrowSpace..." />;
  }

  return (
    <Navigate
      to={auth.isAuthenticated ? (auth.isAdmin ? "/admin" : "/dashboard") : "/services"}
      replace
    />
  );
}
