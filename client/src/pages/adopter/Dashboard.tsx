import { useAppSelector } from "../../store/store";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";

// Components
import DashboardHeader from "../../components/adopter/DashboardHeader";
import DashboardStats from "../../components/adopter/DashboardStats";
import FosterAssignments from "../../components/adopter/FosterAssignments";
import RecentApplications from "../../components/adopter/RecentApplications";
import RecommendedPets from "../../components/adopter/RecommendedPets";

export default function Dashboard() {
  const { user } = useAppSelector((state) => state.auth);

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["adopter-dashboard"],
    queryFn: async () => {
      const response = await api.get("/dashboard/adopter");
      return response.data;
    },
  });

  const { data: recommendedPetsData, isLoading: recommendedLoading } = useQuery(
    {
      queryKey: ["recommended-pets"],
      queryFn: async () => {
        const response = await api.get("/pets", {
          params: { limit: 4, status: "available" },
        });
        return response.data;
      },
    },
  );

  const { data: assignmentsData } = useQuery({
    queryKey: ["my-foster-assignments"],
    queryFn: async () => {
      const response = await api.get("/fosters/my-assignments");
      return response.data;
    },
  });

  if (dashboardLoading || recommendedLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = dashboardData?.data?.stats || {};
  const recentApplications = dashboardData?.data?.recentApplications || [];
  const recommendedPets = recommendedPetsData?.data?.pets || [];
  const activeAssignments = assignmentsData?.data || [];

  return (
    <div className="space-y-8">
      <DashboardHeader user={user} />

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
    </div>
  );
}
