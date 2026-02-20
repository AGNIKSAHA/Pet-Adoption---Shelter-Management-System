import {
  CheckCircle2,
  Home,
  PawPrint,
  Power,
  PowerOff,
  Trash2,
  XCircle,
} from "lucide-react";
import { Foster, User } from "../../types";

const FEDERATION_ACTIVE_PLACEMENT_LIMIT = 3;

interface FosterTableProps {
  isLoading: boolean;
  fosters: Foster[];
  onUpdateStatus: (id: string, status: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

export default function FosterTable({
  isLoading,
  fosters,
  onUpdateStatus,
  onToggleActive,
  onDelete,
}: FosterTableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 text-sm font-semibold text-gray-900">
              Name
            </th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-900">
              Contact
            </th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-900">
              Capacity
            </th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-900">
              Federation Active
            </th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-900 flex items-center gap-1">
              <PawPrint className="w-4 h-4 text-primary-600" />
              Preferences
            </th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-900">
              Status
            </th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <tr>
              <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  Loading foster parents...
                </div>
              </td>
            </tr>
          ) : fosters.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                No foster parents found.
              </td>
            </tr>
          ) : (
            fosters.map((foster: Foster) => {
              const user = foster.userId as User;
              const globalCount = Number(user?.activePlacementCount || 0) || 0;
              const federationLimitReached =
                globalCount >= FEDERATION_ACTIVE_PLACEMENT_LIMIT;

              return (
                <tr key={foster._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Home className="w-3 h-3" /> {foster.homeType}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{user?.email}</p>
                    <p className="text-xs text-gray-500">{user?.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {foster.currentAnimals} / {foster.capacity} pets
                    </div>
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-primary-500"
                        style={{
                          width: `${(foster.currentAnimals / foster.capacity) * 100}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        federationLimitReached
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-green-50 text-green-700 border-green-200"
                      }`}
                    >
                      {globalCount}/{FEDERATION_ACTIVE_PLACEMENT_LIMIT}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {foster.preferredSpecies?.length > 0 ? (
                        foster.preferredSpecies.map((s) => (
                          <span
                            key={s}
                            className="px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded text-[10px] font-bold uppercase"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">
                          No preference
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <CheckCircle2
                          className={`w-3 h-3 ${foster.hasYard ? "text-green-500" : "text-gray-300"}`}
                        />
                        {foster.hasYard ? "Has Yard" : "No Yard"}
                      </div>
                      <p className="line-clamp-2 italic leading-tight">
                        Exp: {foster.experience}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${
                        foster.status === "approved"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : foster.status === "pending"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {foster.status}
                    </span>
                    {!foster.isActive && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                        DEACTIVATED
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {foster.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onUpdateStatus(foster._id, "approved")}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => onUpdateStatus(foster._id, "rejected")}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    {foster.status === "approved" && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            onToggleActive(foster._id, !foster.isActive)
                          }
                          className={`p-1.5 rounded transition-colors ${foster.isActive ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"}`}
                          title={foster.isActive ? "Deactivate" : "Activate"}
                        >
                          {foster.isActive ? (
                            <PowerOff className="w-5 h-5" />
                          ) : (
                            <Power className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                "Are you sure you want to delete this foster record? This can only be done if there are no active assignments.",
                              )
                            ) {
                              onDelete(foster._id);
                            }
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
