import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAppSelector } from "../../store/store";
import {
  Users,
  PawPrint,
  FileText,
  TrendingUp,
  Plus,
  ArrowRight,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";

interface Activity {
  id: string;
  action: string;
  target: string;
  time: string;
}

export default function Dashboard() {
  const { user } = useAppSelector((state) => state.auth);

  const extractId = (
    val: string | { _id?: string; id?: string } | null | undefined,
  ): string | undefined => {
    if (!val || val === "null") return undefined;
    if (typeof val === "string") return val;
    return val._id || val.id;
  };

  const getEffectiveShelterId = () => {
    const sid = extractId(user?.shelterId);
    if (sid) return sid;

    const approvedApp = user?.staffApplications?.find(
      (app) => app.status === "approved",
    );

    return extractId(approvedApp?.shelterId);
  };

  const effectiveShelterId = getEffectiveShelterId();
  const [activeShelterId, setActiveShelterId] = useState<string | undefined>(
    effectiveShelterId,
  );

  // Sync activeShelterId if effectiveShelterId changes and activeShelterId is not set
  useEffect(() => {
    if (!activeShelterId && effectiveShelterId) {
      setActiveShelterId(effectiveShelterId);
    }
  }, [effectiveShelterId, activeShelterId]);

  const allApproved =
    user?.staffApplications
      ?.filter((app) => app.status === "approved")
      ?.map((app) => {
        const shelterName =
          typeof app.shelterId === "object"
            ? app.shelterId.name
            : "Primary Shelter";
        return {
          id: extractId(app.shelterId),
          name: shelterName,
        };
      }) || [];

  const userSid = extractId(user?.shelterId);
  if (userSid && !allApproved.find((s) => s.id === userSid)) {
    const userShelterName =
      typeof user?.shelterId === "object"
        ? user.shelterId.name
        : "Default Shelter";
    allApproved.unshift({
      id: userSid,
      name: userShelterName,
    });
  }

  // Deduplicate and filter out undefined IDs
  const approvedShelters = allApproved.filter(
    (s, index, self) => s.id && self.findIndex((t) => t.id === s.id) === index,
  );

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["shelter-dashboard", activeShelterId],
    queryFn: async () => {
      const response = await api.get("/dashboard/shelter", {
        params: { shelterId: activeShelterId },
      });
      return response.data;
    },
    enabled: !!activeShelterId || user?.role === "admin",
  });

  const dashboardStats = dashboardData?.data?.stats || {};
  const recentActivity = dashboardData?.data?.recentActivity || [];

  const stats = [
    {
      label: "Pets in Care",
      value: dashboardStats.petsInCare || 0,
      icon: PawPrint,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Pending Applications",
      value: dashboardStats.pendingApplications || 0,
      icon: FileText,
      color: "bg-yellow-50 text-yellow-600",
    },
    {
      label: "Active Fosters",
      value: dashboardStats.activeFosters || 0,
      icon: Users,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Adoptions this Month",
      value: dashboardStats.adoptionsThisMonth || 0,
      icon: TrendingUp,
      color: "bg-green-50 text-green-600",
    },
  ];

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          {approvedShelters.length > 1 ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-gray-500">
                Viewing Stats For:
              </span>
              <select
                value={activeShelterId}
                onChange={(e) => setActiveShelterId(e.target.value)}
                className="text-sm font-semibold text-primary-600 bg-primary-50 border-none rounded-lg focus:ring-0 cursor-pointer py-1"
              >
                {approvedShelters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : approvedShelters.length === 1 ? (
            <p className="text-gray-500 mt-1">
              Overview of <strong>{approvedShelters[0].name}</strong>{" "}
              operations.
            </p>
          ) : (
            <p className="text-gray-500 mt-1">
              Overview of your shelter operations.
            </p>
          )}
        </div>
        <Link
          to="/shelter/pets"
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add New Pet
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All
            </button>
          </div>
          <div className="space-y-6">
            {recentActivity.map((activity: Activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary-500 flex-shrink-0" />
                <div>
                  <p className="text-gray-900 font-medium capitalize">
                    {activity.action}
                  </p>
                  <p className="text-sm text-gray-500">
                    {activity.target} • {formatTime(activity.time)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/shelter/applications"
              className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200 text-left group"
            >
              <div className="flex justify-between items-center mb-2">
                <FileText className="w-6 h-6 text-primary-600" />
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
              </div>
              <p className="font-semibold text-gray-900">Review Applications</p>
              <p className="text-xs text-gray-500 mt-1">12 pending review</p>
            </Link>

            <Link
              to="/shelter/pets"
              className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200 text-left group"
            >
              <div className="flex justify-between items-center mb-2">
                <PawPrint className="w-6 h-6 text-primary-600" />
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
              </div>
              <p className="font-semibold text-gray-900">Manage Pets</p>
              <p className="text-xs text-gray-500 mt-1">Update status & info</p>
            </Link>

            <Link
              to="/shelter/fosters"
              className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200 text-left group"
            >
              <div className="flex justify-between items-center mb-2">
                <Users className="w-6 h-6 text-primary-600" />
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
              </div>
              <p className="font-semibold text-gray-900">Foster Board</p>
              <p className="text-xs text-gray-500 mt-1">
                Assign pets to fosters
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
