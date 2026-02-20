import { Link } from "react-router-dom";
import {
  Users,
  Building2,
  PawPrint,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";

export default function Dashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const response = await api.get("/dashboard/admin");
      return response.data;
    },
  });

  const dashboardStats = dashboardData?.data?.stats || {};
  const intakeCohorts = dashboardData?.data?.analytics?.intakeCohorts || [];

  const stats = [
    {
      label: "Total Shelters",
      value: dashboardStats.totalShelters?.toLocaleString() || "0",
      icon: Building2,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total Users",
      value: dashboardStats.totalUsers?.toLocaleString() || "0",
      icon: Users,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Total Pets",
      value: dashboardStats.totalPets?.toLocaleString() || "0",
      icon: PawPrint,
      color: "bg-orange-50 text-orange-600",
    },
    {
      label: "Adoptions YTD",
      value: dashboardStats.adoptionsYTD?.toLocaleString() || "0",
      icon: TrendingUp,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Pending Staff",
      value: dashboardStats.pendingShelterRequests?.toLocaleString() || "0",
      icon: AlertTriangle,
      color: "bg-yellow-50 text-yellow-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">Platform-wide overview and management.</p>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">
            Pending Approvals
          </h2>
          <div className="space-y-4">
            {dashboardStats.pendingShelterRequests > 0 && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 flex items-start gap-4">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-800">
                    Pending Staff Requests
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    There are {dashboardStats.pendingShelterRequests} shelter
                    staff applications waiting for review.
                  </p>
                  <div className="flex gap-3 mt-3">
                    <Link
                      to="/admin/shelter-requests"
                      className="text-xs font-medium bg-white px-3 py-1 rounded border border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                    >
                      Review All
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">User Report</p>
                <p className="text-sm text-gray-500">
                  Reported for spam messaging
                </p>
              </div>
              <button className="text-sm text-primary-600 font-medium">
                Investigate
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">
            System Health
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700 font-medium">Server Status</span>
              <span className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700 font-medium">Database Load</span>
              <span className="text-sm text-gray-500">23%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700 font-medium">Storage Usage</span>
              <span className="text-sm text-gray-500">45% (120GB / 500GB)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Intake Cohort Analysis
          </h2>
          <p className="text-xs text-gray-500">
            Grouped by intake month in each shelter timezone
          </p>
        </div>
        {intakeCohorts.length === 0 ? (
          <p className="text-sm text-gray-500">No cohort data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="py-2 pr-4 font-semibold">Cohort Month</th>
                  <th className="py-2 pr-4 font-semibold">Intake</th>
                  <th className="py-2 pr-4 font-semibold">Adopted</th>
                  <th className="py-2 pr-4 font-semibold">Still In Care</th>
                  <th className="py-2 pr-4 font-semibold">Adoption Rate</th>
                </tr>
              </thead>
              <tbody>
                {intakeCohorts.map(
                  (cohort: {
                    cohortMonth: string;
                    totalIntake: number;
                    adopted: number;
                    inCare: number;
                    adoptionRate: string;
                  }) => (
                    <tr
                      key={cohort.cohortMonth}
                      className="border-b border-gray-50"
                    >
                      <td className="py-2 pr-4 font-medium text-gray-900">
                        {cohort.cohortMonth}
                      </td>
                      <td className="py-2 pr-4">{cohort.totalIntake}</td>
                      <td className="py-2 pr-4">{cohort.adopted}</td>
                      <td className="py-2 pr-4">{cohort.inCare}</td>
                      <td className="py-2 pr-4">{cohort.adoptionRate}%</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
