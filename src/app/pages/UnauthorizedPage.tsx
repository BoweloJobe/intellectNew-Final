import { Link } from "react-router-dom";
import { GlassCard } from "../components/GlassCard";
import { Button } from "../components/ui/button";
import { useAuth } from "../auth/AuthContext";
import { getDefaultPathForRole } from "../auth/route-utils";

export function UnauthorizedPage() {
  const { role } = useAuth();
  const defaultDestination = getDefaultPathForRole(role);

  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      <GlassCard className="text-center">
        <h1 className="text-3xl font-semibold text-gray-900 mb-3">Access Denied</h1>
        <p className="text-gray-700 mb-6">
          Your account is authenticated, but this page is not available for your current role.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link to={defaultDestination}>
            <Button className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white">Go to Dashboard</Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="bg-white/[0.45]">
              Back to Home
            </Button>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
