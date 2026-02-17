import { useState, useEffect } from "react";
import { useAppSelector } from "../../store/store";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import api from "../../lib/api";

// Components
import DashboardHeader from "../../components/adopter/DashboardHeader";
import DashboardStats from "../../components/adopter/DashboardStats";
import FosterAssignments from "../../components/adopter/FosterAssignments";
import RecentApplications from "../../components/adopter/RecentApplications";
import RecommendedPets from "../../components/adopter/RecommendedPets";
import FosterPreferencesModal from "../../components/adopter/FosterPreferencesModal";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);
  const [prefSpecies, setPrefSpecies] = useState<string[]>([]);
  const [prefCapacity, setPrefCapacity] = useState(1);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["adopter-stats"],
    queryFn: async () => {
      const response = await api.get("/applications/stats");
      return response.data;
    },
  });

  const { data: applicationsData, isLoading: appsLoading } = useQuery({
    queryKey: ["recent-applications"],
    queryFn: async () => {
      const response = await api.get("/applications/my-applications", {
        params: { limit: 5 },
      });
      return response.data;
    },
  });

  const { data: recommendedPetsData } = useQuery({
    queryKey: ["recommended-pets"],
    queryFn: async () => {
      const response = await api.get("/pets", {
        params: { limit: 4, status: "available" },
      });
      return response.data;
    },
  });

  const { data: fosterStatus } = useQuery({
    queryKey: ["foster-status"],
    queryFn: async () => {
      const response = await api.get("/fosters/my-status");
      return response.data;
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/fosters/${id}/active`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foster-status"] });
      toast.success("Availability updated");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to update status");
    },
  });

  const { data: assignmentsData } = useQuery({
    queryKey: ["my-foster-assignments"],
    queryFn: async () => {
      const response = await api.get("/fosters/my-assignments");
      return response.data;
    },
    enabled: fosterStatus?.data?.status === "approved",
  });

  useEffect(() => {
    if (fosterStatus?.data) {
      setPrefSpecies(fosterStatus.data.preferredSpecies || []);
      setPrefCapacity(fosterStatus.data.capacity || 1);
    }
  }, [fosterStatus]);

  const updatePrefsMutation = useMutation({
    mutationFn: (data: { preferredSpecies: string[]; capacity: number }) =>
      api.patch(`/fosters/${fosterStatus?.data?._id}/preferences`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foster-status"] });
      toast.success("Preferences updated successfully");
      setIsPrefModalOpen(false);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(
        error.response?.data?.message || "Failed to update preferences",
      );
    },
  });

  if (statsLoading || appsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = statsData?.data || {};
  const recentApplications = applicationsData?.data || [];
  const recommendedPets = recommendedPetsData?.data?.pets || [];
  const activeAssignments = assignmentsData?.data || [];

  return (
    <div className="space-y-8">
      <DashboardHeader
        user={user}
        fosterStatus={fosterStatus}
        toggleActiveMutation={toggleActiveMutation}
        onEditPreferences={() => setIsPrefModalOpen(true)}
      />

      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <FosterAssignments assignments={activeAssignments} />
          <RecommendedPets pets={recommendedPets} />
        </div>

        <div className="space-y-6">
          <RecentApplications applications={recentApplications} />
        </div>
      </div>

      <FosterPreferencesModal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
        prefSpecies={prefSpecies}
        setPrefSpecies={setPrefSpecies}
        prefCapacity={prefCapacity}
        setPrefCapacity={setPrefCapacity}
        onSubmit={(data) => updatePrefsMutation.mutate(data)}
        isPending={updatePrefsMutation.isPending}
      />
    </div>
  );
}
