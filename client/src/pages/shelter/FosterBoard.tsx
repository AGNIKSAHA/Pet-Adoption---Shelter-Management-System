import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Home,
  UserPlus,
} from "lucide-react";

const assignSchema = z.object({
  petId: z.string().min(1, "Pet selection is required"),
  fosterId: z.string().min(1, "Foster parent selection is required"),
  expectedDuration: z.number().min(1, "Duration must be at least 1 day"),
});

type AssignFormData = z.infer<typeof assignSchema>;
import api from "../../lib/api";
import toast from "react-hot-toast";
import { FosterAssignment, Foster, Pet, User } from "../../types";
import { AxiosError } from "axios";

export default function FosterBoard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"assignments" | "parents">(
    "assignments",
  );
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignFormData>({
    resolver: zodResolver(assignSchema),
  });

  useEffect(() => {
    if (!isAssignModalOpen) {
      reset();
    }
  }, [isAssignModalOpen, reset]);

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
    enabled: activeTab === "parents",
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
    mutationFn: (data: AssignFormData) =>
      api.post("/fosters/assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foster-assignments"] });
      toast.success("Pet assigned to foster successfully");
      setIsAssignModalOpen(false);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to assign pet");
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

      {/* Tabs */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignmentsLoading ? (
            <div className="col-span-full flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">No active foster assignments.</p>
            </div>
          ) : (
            assignments.map((assignment: FosterAssignment) => (
              <div
                key={assignment._id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="aspect-[16/9] relative bg-gray-100">
                  <img
                    src={
                      (assignment.petId as Pet).photos?.[0] ||
                      "https://images.unsplash.com/photo-1543466835-00a7907e9de1"
                    }
                    alt={(assignment.petId as Pet).name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
                    ACTIVE
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {(assignment.petId as Pet)?.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      With{" "}
                      {
                        ((assignment.fosterId as Foster)?.userId as User)
                          ?.firstName
                      }{" "}
                      {
                        ((assignment.fosterId as Foster)?.userId as User)
                          ?.lastName
                      }
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4 text-primary-500" />
                      Started{" "}
                      {new Date(assignment.startDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4 text-primary-500" />
                      {assignment.expectedDuration} days expected
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
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
                  Status
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fostersLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : fosters.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No foster parents found.
                  </td>
                </tr>
              ) : (
                fosters.map((foster: Foster) => (
                  <tr key={foster._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {(foster.userId as User)?.firstName}{" "}
                          {(foster.userId as User)?.lastName}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Home className="w-3 h-3" /> {foster.homeType}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">
                        {(foster.userId as User)?.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(foster.userId as User)?.phone}
                      </p>
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
                    </td>
                    <td className="px-6 py-4 text-right">
                      {foster.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: foster._id,
                                status: "approved",
                              })
                            }
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: foster._id,
                                status: "rejected",
                              })
                            }
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                Assign Pet to Foster
              </h2>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <XCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <form
              onSubmit={handleSubmit((data) => assignMutation.mutate(data))}
              className="p-6 space-y-4 text-sm"
            >
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  Select Pet
                </label>
                <select
                  {...register("petId")}
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none ${errors.petId ? "border-red-500" : "border-gray-300"}`}
                >
                  <option value="">Choose a pet...</option>
                  {availablePets?.data?.pets?.map((pet: Pet) => (
                    <option key={pet._id} value={pet._id}>
                      {pet.name} ({pet.breed})
                    </option>
                  ))}
                </select>
                {errors.petId && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.petId.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  Select Foster Parent
                </label>
                <select
                  {...register("fosterId")}
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none ${errors.fosterId ? "border-red-500" : "border-gray-300"}`}
                >
                  <option value="">Choose a foster parent...</option>
                  {fosters
                    .filter(
                      (f: Foster) =>
                        f.status === "approved" &&
                        f.currentAnimals < f.capacity,
                    )
                    .map((f: Foster) => (
                      <option key={f._id} value={f._id}>
                        {(f.userId as User)?.firstName}{" "}
                        {(f.userId as User)?.lastName} ({f.currentAnimals}/
                        {f.capacity})
                      </option>
                    ))}
                </select>
                {errors.fosterId && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.fosterId.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  Expected Duration (Days)
                </label>
                <input
                  type="number"
                  {...register("expectedDuration", { valueAsNumber: true })}
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none ${errors.expectedDuration ? "border-red-500" : "border-gray-300"}`}
                  placeholder="e.g. 14"
                />
                {errors.expectedDuration && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.expectedDuration.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={assignMutation.isPending}
                className="btn btn-primary w-full py-3"
              >
                {assignMutation.isPending
                  ? "Assigning..."
                  : "Confirm Assignment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
