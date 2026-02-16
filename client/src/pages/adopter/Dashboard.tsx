import { Link } from "react-router-dom";
import { useAppSelector } from "../../store/store";
import { FileText, Heart, Clock, CheckCircle, XCircle } from "lucide-react";
import PetCard from "../../components/PetCard";

import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import {
  Pet,
  AdoptionApplication,
  Shelter,
  FosterAssignment,
} from "../../types";

export default function Dashboard() {
  const { user } = useAppSelector((state) => state.auth);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["adopter-dashboard"],
    queryFn: async () => {
      const response = await api.get("/dashboard/adopter");
      return response.data;
    },
  });

  const { data: recommendedPetsData } = useQuery({
    queryKey: ["recommended-pets"],
    queryFn: async () => {
      const response = await api.get("/pets", { params: { limit: 2 } }); // Simplified recommendation
      return response.data;
    },
  });

  const stats = dashboardData?.data?.stats || {};
  const recentApplications = dashboardData?.data?.recentApplications || [];
  const recommendedPets = recommendedPetsData?.data?.pets || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-green-600 bg-green-50";
      case "rejected":
        return "text-red-600 bg-red-50";
      default:
        return "text-yellow-600 bg-yellow-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-5 h-5" />;
      case "rejected":
        return <XCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const { data: fosterStatus } = useQuery({
    queryKey: ["my-foster-status"],
    queryFn: async () => {
      const response = await api.get("/fosters/my-status");
      return response.data;
    },
  });

  const { data: assignmentsData } = useQuery({
    queryKey: ["my-foster-assignments"],
    queryFn: async () => {
      const response = await api.get("/fosters/my-assignments");
      return response.data;
    },
    enabled: !!fosterStatus?.data,
  });

  const activeAssignments = assignmentsData?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hello, {user?.firstName}!
          </h1>
          <p className="text-gray-500">
            Here's what's happening with your adoption journey.
          </p>
        </div>
        {fosterStatus?.data ? (
          <div
            className={`px-4 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 ${
              fosterStatus.data.status === "approved"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-yellow-50 text-yellow-700 border-yellow-200"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${fosterStatus.data.status === "approved" ? "bg-green-500" : "bg-yellow-500"}`}
            />
            Foster Parent:{" "}
            <span className="capitalize">{fosterStatus.data.status}</span>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Active Applications
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalApplications || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Pending Review
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.pendingReview || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Adoptions</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.approvedApplications || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Active Foster Assignments */}
          {activeAssignments.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary-600 fill-current" />
                My Foster Pets
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {activeAssignments.map((assignment: FosterAssignment) => {
                  const pet = assignment.petId as Pet;
                  return (
                    <div
                      key={assignment._id}
                      className="bg-white rounded-xl shadow-md overflow-hidden border border-primary-100"
                    >
                      <div className="aspect-[4/3] relative">
                        <img
                          src={
                            pet.photos?.[0] ||
                            "https://images.unsplash.com/photo-1543466835-00a7907e9de1"
                          }
                          alt={pet.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded shadow-sm">
                          ACTIVE FOSTER
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {pet.name}
                          </h3>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {pet.breed}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 space-y-2 mb-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary-500" />
                            <span>
                              Started:{" "}
                              {new Date(
                                assignment.startDate,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary-500" />
                            <span>
                              Duration: {assignment.expectedDuration} days
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100">
                          <Link
                            to={`/pets/${pet._id}`}
                            className="block w-full text-center py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors font-medium text-sm"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">
              Recommended for You
            </h2>
            <Link
              to="/pets"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {recommendedPets.map((pet: Pet) => (
              <PetCard key={pet._id} pet={pet} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">
              Recent Applications
            </h2>
            <Link
              to="/adopter/applications"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
            {recentApplications.map((app: AdoptionApplication) => (
              <div
                key={app._id}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    Application for {(app.petId as Pet)?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(app.shelterId as Shelter)?.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Submitted on {new Date(app.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(app.status)}`}
                >
                  {getStatusIcon(app.status)}
                  {app.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
