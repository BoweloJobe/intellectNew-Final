import { Navigate, Outlet, useLocation, useMatches } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { getAllowedRolesFromMatches } from "../../auth/access-control";
import { getProtectedRouteDecision, getRoleProtectedRouteDecision } from "../../auth/route-guards";

function LoadingState() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-20 text-center text-gray-700">
      Checking access...
    </div>
  );
}

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  const routeDecision = getProtectedRouteDecision(status);

  if (routeDecision.type === "loading") {
    return <LoadingState />;
  }

  if (routeDecision.type === "redirect") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function RoleProtectedRoute() {
  const { status, role } = useAuth();
  const location = useLocation();
  const matches = useMatches();
  const allowedRoles = getAllowedRolesFromMatches(matches);
  const routeDecision = getRoleProtectedRouteDecision(
    status,
    role,
    allowedRoles,
    location.pathname,
  );

  if (routeDecision.type === "loading") {
    return <LoadingState />;
  }

  if (routeDecision.type === "redirect" && routeDecision.to === "/login") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (routeDecision.type === "allow") {
    return <Outlet />;
  }

  return <Navigate to={routeDecision.to} replace />;
}
