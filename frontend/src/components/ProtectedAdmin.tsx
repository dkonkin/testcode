import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

export function ProtectedAdmin({ children }: { children: ReactNode }) {
  const { auth, isAdmin } = useAuth();

  if (!auth.token) {
    return <Navigate to="/login" replace state={{ from: "/admin" }} />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
