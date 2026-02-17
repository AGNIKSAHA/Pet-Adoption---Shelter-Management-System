import { Link } from "react-router-dom";
import { PawPrint, Power, Settings } from "lucide-react";
import { User, Foster } from "../../types";

interface DashboardHeaderProps {
  user: User | null;
  fosterStatus: {
    data?: Foster;
    isLoading?: boolean;
  };
  toggleActiveMutation: {
    mutate: (variables: { id: string; isActive: boolean }) => void;
    isPending: boolean;
  };
  onEditPreferences: () => void;
}

export default function DashboardHeader({
  user,
  fosterStatus,
  toggleActiveMutation,
  onEditPreferences,
}: DashboardHeaderProps) {
  const { data } = fosterStatus;

  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hello, {user?.firstName}!
        </h1>
        <p className="text-gray-500">
          Here's what's happening with your adoption journey.
        </p>
      </div>
      {data ? (
        <div className="flex flex-col items-end gap-2">
          <div
            className={`px-4 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 ${
              data.status === "approved"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-yellow-50 text-yellow-700 border-yellow-200"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${data.status === "approved" ? "bg-green-500" : "bg-yellow-500"}`}
            />
            Foster Parent: <span className="capitalize">{data.status}</span>
          </div>
          {data.status === "approved" && (
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <PawPrint className="w-3 h-3 text-primary-400" />
                <span>
                  Pref. Species:{" "}
                  {data.preferredSpecies?.length > 0
                    ? data.preferredSpecies.join(", ")
                    : "Any"}
                </span>
                <span>|</span>
                <span>Capacity: {data.capacity}</span>
              </div>
              <button
                onClick={() => {
                  toggleActiveMutation.mutate({
                    id: data._id,
                    isActive: !data.isActive,
                  });
                }}
                disabled={toggleActiveMutation.isPending}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  data.isActive
                    ? "bg-primary-600 text-white border-primary-700 hover:bg-primary-700 shadow-sm"
                    : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                {data.isActive
                  ? "Currently Accepting Pets"
                  : "Temporarily Deactivated"}
              </button>
              <button
                onClick={onEditPreferences}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 shadow-sm"
              >
                <Settings className="w-3.5 h-3.5" />
                Edit Preferences
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link
          to="/adopter/foster-apply"
          className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg border border-primary-100 text-sm font-medium hover:bg-primary-100 transition-colors"
        >
          Join Foster Program
        </Link>
      )}
    </div>
  );
}
