import { Building2, CheckCircle2, Clock } from "lucide-react";
import { Shelter } from "../../../../types";

interface ShelterApplicationsListProps {
  shelters: Shelter[] | undefined;
  getApplicationStatus: (shelterId: string) =>
    | {
        _id: string;
        shelterId: string | Shelter;
        status: "pending" | "approved" | "rejected";
        requestDate: string;
      }
    | undefined;
  applyMutation: {
    mutate: (shelterId: string) => void;
    isPending: boolean;
  };
  leaveMutation: {
    mutate: (shelterId: string) => void;
    isPending: boolean;
  };
  isCurrentShelterMember: (shelterId: string) => boolean;
}

export default function ShelterApplicationsList({
  shelters,
  getApplicationStatus,
  applyMutation,
  leaveMutation,
  isCurrentShelterMember,
}: ShelterApplicationsListProps) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary-600" />
          Shelter Applications
        </h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 gap-4">
          {shelters?.map((shelter: Shelter) => {
            const app = getApplicationStatus(shelter._id);
            const appStatus = app?.status;
            const canLeave = isCurrentShelterMember(shelter._id);
            return (
              <div
                key={shelter._id}
                className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{shelter.name}</p>
                    <p className="text-sm text-gray-500">
                      {shelter.address.city}, {shelter.address.state}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {appStatus === "approved" || appStatus === "pending" ? (
                    <span
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        appStatus === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {appStatus === "approved" && (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      {appStatus === "pending" && (
                        <Clock className="w-3 h-3" />
                      )}
                      {appStatus}
                    </span>
                  ) : appStatus === "rejected" ? (
                    <button
                      onClick={() => applyMutation.mutate(shelter._id)}
                      disabled={applyMutation.isPending}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      {applyMutation.isPending ? "Applying..." : "Re-Apply"}
                    </button>
                  ) : canLeave ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-green-100 text-green-700">
                      <CheckCircle2 className="w-3 h-3" />
                      approved
                    </span>
                  ) : (
                    <button
                      onClick={() => applyMutation.mutate(shelter._id)}
                      disabled={applyMutation.isPending}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      {applyMutation.isPending
                        ? "Applying..."
                        : "Apply to Shelter"}
                    </button>
                  )}

                  {canLeave && (
                    <button
                      onClick={() => leaveMutation.mutate(shelter._id)}
                      disabled={leaveMutation.isPending}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      {leaveMutation.isPending ? "Leaving..." : "Leave Shelter"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
