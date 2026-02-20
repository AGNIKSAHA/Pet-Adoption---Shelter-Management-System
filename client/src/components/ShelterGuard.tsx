import { useNavigate, useLocation } from "react-router-dom";
import { useAppSelector } from "../store/store";
import { Building2, AlertCircle, Clock, XCircle } from "lucide-react";
export default function ShelterGuard({ children, }: {
    children: React.ReactNode;
}) {
    const { user, activeRole, activeShelterId } = useAppSelector((state) => state.auth);
    const navigate = useNavigate();
    const location = useLocation();
    if (location.pathname === "/profile") {
        return <>{children}</>;
    }
    const currentRole = activeRole || user?.role;
    if (currentRole !== "shelter_staff") {
        return <>{children}</>;
    }
    if (activeShelterId) {
        return <>{children}</>;
    }
    const memberships = user?.memberships || [];
    if (memberships.length > 0 && !activeShelterId) {
        if (location.pathname === "/shelter/dashboard") {
            return <>{children}</>;
        }
        return (<div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <Building2 className="w-8 h-8 text-amber-600"/>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Select a Shelter
            </h2>
            <p className="text-gray-600">
              Please select a specific shelter context from the sidebar or top
              navigation to perform operations like managing pets and
              applications.
            </p>
          </div>
        </div>
      </div>);
    }
    const applications = user?.staffApplications || [];
    const hasApproved = applications.some((app) => app.status === "approved");
    const hasPending = applications.some((app) => app.status === "pending");
    const hasRejected = applications.some((app) => app.status === "rejected");
    if (hasApproved) {
        if (location.pathname === "/shelter/dashboard")
            return <>{children}</>;
    }
    if (applications.length === 0) {
        return (<div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <Building2 className="w-8 h-8 text-amber-600"/>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Shelter Selection Required
            </h2>
            <p className="text-gray-600">
              Before you can access shelter management features, you need to
              apply to work for a shelter in your profile.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"/>
            <p className="text-sm text-amber-800 text-left">
              This ensures that you only manage pets and applications for
              shelters you are authorized to work for.
            </p>
          </div>

          <button onClick={() => navigate("/profile")} className="w-full btn btn-primary py-3 text-base font-semibold shadow-lg shadow-primary-200">
            Go to Profile & Apply to Shelters
          </button>
        </div>
      </div>);
    }
    if (hasPending) {
        return (<div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-blue-600 animate-pulse"/>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Approval Pending
            </h2>
            <p className="text-gray-600">
              Your shelter staff applications are currently under review by an
              administrator.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"/>
            <p className="text-sm text-blue-800 text-left">
              You will be able to access shelter management features once at
              least one request is approved.
            </p>
          </div>

          <button onClick={() => navigate("/profile")} className="w-full btn bg-gray-200 text-gray-700 hover:bg-gray-300 py-3 text-base font-semibold">
            View Applications
          </button>
        </div>
      </div>);
    }
    if (hasRejected) {
        return (<div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600"/>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Applications Rejected
            </h2>
            <p className="text-gray-600">
              Your requests to join shelters were not approved. Please contact
              the administrator or apply to a different shelter.
            </p>
          </div>

          <button onClick={() => navigate("/profile")} className="w-full btn btn-primary py-3 text-base font-semibold shadow-lg shadow-primary-200">
            Go to Profile & Try Again
          </button>
        </div>
      </div>);
    }
    return <>{children}</>;
}
