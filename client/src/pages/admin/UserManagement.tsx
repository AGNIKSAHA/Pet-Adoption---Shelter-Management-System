import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  UserCheck,
  UserX,
  Shield,
  SearchX,
  ChevronLeft,
  ChevronRight,
  Ban,
  RotateCcw,
} from "lucide-react";
import api from "../../lib/api";
import toast from "react-hot-toast";
import { User } from "../../types";
import { AxiosError } from "axios";

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, search, roleFilter],
    queryFn: async () => {
      const response = await api.get("/admin/users", {
        params: {
          page,
          search: search || undefined,
          role: roleFilter || undefined,
          limit: 10,
        },
      });
      return response.data;
    },
  });

  interface UpdateStatusData {
    id: string;
    role?: string;
    isEmailVerified?: boolean;
    isActive?: boolean;
  }

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, role, isEmailVerified, isActive }: UpdateStatusData) =>
      api.patch(`/admin/users/${id}/status`, {
        role,
        isEmailVerified,
        isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User updated successfully");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to update user");
    },
  });

  // Delete mutation removed as per requirements

  const users = data?.data?.users || [];
  const pagination = data?.data?.pagination || { page: 1, pages: 1 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">
            Manage all users and their permissions.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white font-medium"
        >
          <option value="">All Managed Roles</option>
          <option value="adopter">Adopters</option>
          <option value="shelter_staff">Shelter Staff</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full" />
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-24" />
                          <div className="h-3 bg-gray-200 rounded w-32" />
                        </div>
                      </div>
                    </td>
                    <td colSpan={4} />
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <SearchX className="w-12 h-12" />
                      <p>No users found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user: User) => (
                  <tr
                    key={user._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold">
                          {user.firstName[0]}
                          {user.lastName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                          user.role === "shelter_staff"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {user.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {user.isEmailVerified ? (
                          <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold uppercase tracking-wider">
                            <UserCheck className="w-3 h-3" /> Email Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-yellow-600 font-bold uppercase tracking-wider">
                            <UserX className="w-3 h-3" /> Email Pending
                          </span>
                        )}
                        {!user.isActive && (
                          <span className="flex items-center gap-1 text-[10px] text-red-600 font-bold uppercase tracking-wider">
                            <Ban className="w-3 h-3" /> Account Suspended
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            const newRole =
                              user.role === "adopter"
                                ? "shelter_staff"
                                : "adopter";
                            if (
                              window.confirm(
                                `Are you sure you want to change this user's role to ${newRole.replace("_", " ")}?`,
                              )
                            ) {
                              updateStatusMutation.mutate({
                                id: user._id,
                                role: newRole,
                              });
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                          title="Switch Role"
                        >
                          <Shield className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            const action = user.isActive
                              ? "suspend"
                              : "reactivate";
                            if (
                              window.confirm(
                                `Are you sure you want to ${action} this user?`,
                              )
                            ) {
                              updateStatusMutation.mutate({
                                id: user._id,
                                isActive: !user.isActive,
                              });
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-all ${
                            user.isActive
                              ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                              : "text-red-500 hover:text-green-600 hover:bg-green-50"
                          }`}
                          title={
                            user.isActive ? "Suspend User" : "Reactivate User"
                          }
                        >
                          {user.isActive ? (
                            <Ban className="w-5 h-5" />
                          ) : (
                            <RotateCcw className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <p className="text-sm text-gray-500">
              Showing page{" "}
              <span className="font-semibold">{pagination.page}</span> of{" "}
              <span className="font-semibold">{pagination.pages}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 transition-all shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.pages, p + 1))
                }
                disabled={page === pagination.pages}
                className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 transition-all shadow-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
