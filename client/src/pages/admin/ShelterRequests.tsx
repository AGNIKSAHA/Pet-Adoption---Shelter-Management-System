import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  Mail,
  User as UserIcon,
  Loader2,
} from "lucide-react";
import api from "../../lib/api";
import toast from "react-hot-toast";
import { StaffApplication } from "../../types";
import { AxiosError } from "axios";

export default function ShelterRequests() {
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["shelter-requests"],
    queryFn: async () => {
      const response = await api.get("/admin/shelter-requests");
      return response.data.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (userId: string) =>
      api.patch(`/admin/shelter-requests/${userId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-requests"] });
      toast.success("Shelter request approved!");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to approve request");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (userId: string) =>
      api.patch(`/admin/shelter-requests/${userId}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-requests"] });
      toast.success("Shelter request rejected");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to reject request");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Shelter Staff Requests
        </h1>
        <p className="text-gray-500 mt-1">
          Review and approve shelter staff applications
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
        </div>
      ) : requests?.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
          <Clock className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">
            No pending shelter requests
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests?.map((request: StaffApplication) => (
            <div
              key={request._id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-4">
                  {/* User Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserIcon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        {request.userId.firstName} {request.userId.lastName}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Mail className="w-4 h-4" />
                        {request.userId.email}
                      </div>
                    </div>
                  </div>

                  {/* Shelter Info */}
                  {request.shelterId && (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Requested Shelter
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {request.shelterId.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {request.shelterId.address?.city},{" "}
                          {request.shelterId.address?.state}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Request Date */}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-4 h-4" />
                    Requested on{" "}
                    {new Date(request.requestDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => approveMutation.mutate(request._id)}
                    disabled={approveMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(request._id)}
                    disabled={rejectMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    {rejectMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
