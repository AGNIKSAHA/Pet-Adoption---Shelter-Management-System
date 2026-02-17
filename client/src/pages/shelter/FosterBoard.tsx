import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";

import api from "../../lib/api";
import toast from "react-hot-toast";
import { FosterAssignment } from "../../types";
import { AxiosError } from "axios";

// Components
import AssignPetModal from "../../components/foster/AssignPetModal";
import TakeBackModal from "../../components/foster/TakeBackModal";
import AssignmentsGrid from "../../components/foster/AssignmentsGrid";
import FosterTable from "../../components/foster/FosterTable";

export default function FosterBoard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"assignments" | "parents">(
    "assignments",
  );
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAssignmentToReturn, setSelectedAssignmentToReturn] =
    useState<FosterAssignment | null>(null);
  const [returnStatus, setReturnStatus] = useState("available");
  const [returnNotes, setReturnNotes] = useState("");

  const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["foster-assignments"],
    queryFn: async () => {
      const response = await api.get("/fosters/assignments");
      return response.data;
    },
    enabled: activeTab === "assignments",
  });

  const { data: fostersData, isLoading: fostersLoading } = useQuery({
    queryKey: ["fosters"],
    queryFn: async () => {
      const response = await api.get("/fosters");
      return response.data;
    },
    enabled: activeTab === "parents" || isAssignModalOpen,
  });

  const { data: availablePets } = useQuery({
    queryKey: ["available-pets-for-foster"],
    queryFn: async () => {
      const response = await api.get("/pets", {
        params: { status: "available" },
      });
      return response.data;
    },
    enabled: isAssignModalOpen,
  });

  const assignMutation = useMutation({
    mutationFn: (data: {
      petId: string;
      fosterId: string;
      expectedDuration: number;
    }) => api.post("/fosters/assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foster-assignments"] });
      toast.success("Pet assigned to foster successfully");
      setIsAssignModalOpen(false);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to assign pet");
    },
  });

  const completeAssignmentMutation = useMutation({
    mutationFn: ({
      id,
      returnStatus,
      notes,
    }: {
      id: string;
      returnStatus: string;
      notes?: string;
    }) =>
      api.patch(`/fosters/assignments/${id}/complete`, { returnStatus, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foster-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["fosters"] });
      toast.success("Pet taken back from foster successfully");
      setSelectedAssignmentToReturn(null);
      setReturnNotes("");
      setReturnStatus("available");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to take back pet");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/fosters/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fosters"] });
      toast.success("Foster parent status updated");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/fosters/${id}/active`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fosters"] });
      toast.success("Foster parent status updated");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to update status");
    },
  });

  const deleteFosterMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/fosters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fosters"] });
      toast.success("Foster parent deleted successfully");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to delete foster");
    },
  });

  const assignments = assignmentsData?.data || [];
  const fosters = fostersData?.data?.fosters || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Foster Board</h1>
          <p className="text-gray-500">
            Manage foster assignments and parents.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Assign Pet to Foster
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("assignments")}
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
            activeTab === "assignments"
              ? "text-primary-600 border-b-2 border-primary-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Active Assignments
        </button>
        <button
          onClick={() => setActiveTab("parents")}
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
            activeTab === "parents"
              ? "text-primary-600 border-b-2 border-primary-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Foster Parents
        </button>
      </div>

      {activeTab === "assignments" ? (
        <AssignmentsGrid
          isLoading={assignmentsLoading}
          assignments={assignments}
          onTakeBack={setSelectedAssignmentToReturn}
          isTakeBackPending={completeAssignmentMutation.isPending}
        />
      ) : (
        <FosterTable
          isLoading={fostersLoading}
          fosters={fosters}
          onUpdateStatus={(id, status) =>
            updateStatusMutation.mutate({ id, status })
          }
          onToggleActive={(id, isActive) =>
            toggleActiveMutation.mutate({ id, isActive })
          }
          onDelete={(id) => deleteFosterMutation.mutate(id)}
        />
      )}

      <AssignPetModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSubmit={(data) => assignMutation.mutate(data)}
        isPending={assignMutation.isPending}
        fosters={fosters}
        availablePets={availablePets?.data?.pets || []}
      />

      <TakeBackModal
        assignment={selectedAssignmentToReturn}
        onClose={() => setSelectedAssignmentToReturn(null)}
        onSubmit={(data) =>
          completeAssignmentMutation.mutate({
            id: selectedAssignmentToReturn?._id || "",
            ...data,
          })
        }
        isPending={completeAssignmentMutation.isPending}
        returnStatus={returnStatus}
        setReturnStatus={setReturnStatus}
        returnNotes={returnNotes}
        setReturnNotes={setReturnNotes}
      />
    </div>
  );
}
