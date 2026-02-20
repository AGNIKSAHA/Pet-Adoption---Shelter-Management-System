import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  PawPrint,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  FileText,
} from "lucide-react";
import api from "../../lib/api";
import toast from "react-hot-toast";
import PetModal from "./components/PetModal";
import { useAppSelector } from "../../store/store";

import { Pet } from "../../types";
import { AxiosError } from "axios";
import {
  getOfflinePetQueueCount,
  onOfflinePetQueueUpdated,
  syncOfflinePetQueue,
} from "../../lib/offlinePetQueue";

export default function PetManagement() {
  const queryClient = useQueryClient();
  const { user, activeShelterId } = useAppSelector((state) => state.auth);
  const MONGO_OBJECT_ID_REGEX = /^[a-f0-9]{24}$/i;

  const extractId = (
    val: string | { _id?: string; id?: string } | null | undefined,
  ): string | undefined => {
    if (!val || val === "null") return undefined;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (MONGO_OBJECT_ID_REGEX.test(trimmed)) return trimmed;
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          return extractId(parsed as { _id?: string; id?: string });
        } catch {
          return undefined;
        }
      }
      return undefined;
    }
    const maybeId = (val as any)._id || (val as any).id;
    if (maybeId) return extractId(maybeId as any);

    if (typeof (val as any).toString === "function") {
      const asString = (val as any).toString();
      if (typeof asString === "string" && MONGO_OBJECT_ID_REGEX.test(asString)) {
        return asString;
      }
    }

    return undefined;
  };

  const allApproved =
    user?.memberships?.map((m) => {
      const shelterName =
        m.shelterId && typeof m.shelterId === "object"
          ? (m.shelterId as any).name
          : "Primary Shelter";
      return {
        id: extractId(m.shelterId),
        name: shelterName,
      };
    }) || [];

  (user?.staffApplications || [])
    .filter((app) => app.status === "approved")
    .forEach((app) => {
      const sid = extractId(app.shelterId as any);
      if (!sid) return;
      const shelterName =
        typeof app.shelterId === "object"
          ? (app.shelterId as any).name || "Approved Shelter"
          : "Approved Shelter";
      if (!allApproved.find((s) => s.id === sid)) {
        allApproved.push({ id: sid, name: shelterName });
      }
    });

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
  const allShelters = allApproved.filter(
    (s, index, self) => s.id && self.findIndex((t) => t.id === s.id) === index,
  );
  const normalizedActiveShelterId = extractId(activeShelterId as any);
  const effectiveShelterId =
    normalizedActiveShelterId || (allShelters[0]?.id as string | undefined);

  const currentShelterName =
    allShelters.find((s) => s.id === effectiveShelterId)?.name ||
    "Shelter";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [offlinePendingCount, setOfflinePendingCount] = useState(
    getOfflinePetQueueCount(),
  );
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const syncInProgressRef = useRef(false);

  useEffect(() => {
    setPage(1);
  }, [effectiveShelterId]);

  useEffect(() => {
    const updateCount = () => setOfflinePendingCount(getOfflinePetQueueCount());

    const syncNow = async () => {
      if (!navigator.onLine || syncInProgressRef.current) return;
      syncInProgressRef.current = true;
      setIsSyncingOffline(true);
      try {
        const result = await syncOfflinePetQueue(api);
        if (result.synced > 0) {
          toast.success(
            `Synced ${result.synced} offline pet change${result.synced > 1 ? "s" : ""}.`,
          );
          queryClient.invalidateQueries({ queryKey: ["shelter-pets"] });
          queryClient.invalidateQueries({ queryKey: ["shelter-pet-stats"] });
        }
      } finally {
        syncInProgressRef.current = false;
        updateCount();
        setIsSyncingOffline(false);
      }
    };

    const unsubscribeQueue = onOfflinePetQueueUpdated(updateCount);
    window.addEventListener("online", syncNow);

    updateCount();
    if (navigator.onLine) {
      syncNow();
    }

    return () => {
      unsubscribeQueue();
      window.removeEventListener("online", syncNow);
    };
  }, [queryClient]);

  const { data: statsData } = useQuery({
    queryKey: ["shelter-pet-stats", effectiveShelterId],
    queryFn: async () => {
      const response = await api.get("/pets/stats", {
        params: { shelterId: effectiveShelterId },
      });
      return response.data;
    },
    enabled: !!effectiveShelterId || user?.role === "admin",
  });


  const { data, isLoading } = useQuery({
    queryKey: [
      "shelter-pets",
      page,
      search,
      statusFilter,
      effectiveShelterId,
    ],
    queryFn: async () => {
      const response = await api.get("/pets", {
        params: {
          page,
          limit: 10,
          name: search || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          shelterId: effectiveShelterId,
        },
      });
      return response.data;
    },
    enabled: !!effectiveShelterId || user?.role === "admin",
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/pets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-pets"] });
      queryClient.invalidateQueries({ queryKey: ["shelter-pet-stats"] });
      toast.success("Pet removed successfully");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to delete pet");
    },
  });

  const handleEdit = (pet: Pet) => {
    setSelectedPet(pet);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    // Allow if they have an active ID OR if they are an admin
    if (!effectiveShelterId && user?.role !== "admin") {
      toast.error("Please select a shelter first.");
      return;
    }
    setSelectedPet(null);
    setIsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 border-green-200";
      case "adopted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "intake":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "medical_hold":
        return "bg-red-100 text-red-800 border-red-200";
      case "fostered":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const pets = data?.data?.pets || [];
  const totalPages = data?.data?.pagination?.totalPages || 1;
  const stats = statsData?.data || { total: 0 };

  // Show message if no shelter is selected
  if (!effectiveShelterId && user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <PawPrint className="w-16 h-16 text-gray-300" />
        <h2 className="text-2xl font-bold text-gray-900">
          No Shelter Selected
        </h2>
        <p className="text-gray-500 text-center max-w-md">
          Please select a shelter from the dropdown above to manage pets, or
          apply to a shelter if you haven't been approved yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-900">Pet Management</h1>
          {effectiveShelterId ? (
            <p className="text-sm font-semibold text-primary-600">
              Managing: {currentShelterName}
            </p>
          ) : (
            <p className="text-gray-500">
              Manage your shelter's animals and their adoption status.
            </p>
          )}
        </div>
        <button
          onClick={handleAdd}
          className="btn btn-primary flex items-center gap-2 w-full md:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Add New Pet
        </button>
      </div>

      {/* Stats Cards - Optional but looks premium */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary-50 rounded-lg">
            <PawPrint className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Pets</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.total || 0}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Available</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.available || 0}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-yellow-50 rounded-lg">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Intake</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.intake || 0}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Adopted</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.adopted || 0}
            </p>
          </div>
        </div>
      </div>


      {(offlinePendingCount > 0 || isSyncingOffline) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <p className="text-sm font-medium text-amber-800">
            {isSyncingOffline
              ? "Syncing offline pet changes..."
              : `${offlinePendingCount} offline pet change${offlinePendingCount > 1 ? "s" : ""} pending sync.`}
          </p>
          <p className="text-xs text-amber-700">
            Changes are stored locally and will auto-merge when internet is available.
          </p>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by pet name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white text-gray-700"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="adopted">Adopted</option>
            <option value="intake">Intake</option>
            <option value="medical_hold">Medical Hold</option>
            <option value="fostered">Fostered</option>
            <option value="meet">Meet</option>
          </select>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Pet Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Pet
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type & Breed
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Age/Gender
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Added On
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4" colSpan={6}>
                      <div className="h-10 bg-gray-50 rounded-lg w-full"></div>
                    </td>
                  </tr>
                ))
              ) : pets.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <PawPrint className="w-12 h-12 text-gray-300" />
                      <p className="text-lg font-medium">No pets found</p>
                      <p className="text-sm">
                        {statusFilter !== "all"
                          ? `No pets with status "${statusFilter}". Try changing the filter.`
                          : search
                            ? `No pets matching "${search}". Try a different search.`
                            : "No pets have been added to this shelter yet. Click 'Add New Pet' to get started."}
                      </p>
                      {(statusFilter !== "all" || search) && (
                        <button
                          onClick={() => {
                            setStatusFilter("all");
                            setSearch("");
                          }}
                          className="mt-2 text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pets.map((pet: Pet) => (
                  <tr
                    key={pet._id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                          {pet.photos?.[0] ? (
                            <img
                              src={pet.photos[0]}
                              alt={pet.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <PawPrint className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {pet.name}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            {pet._id.substring(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 capitalize">
                        {pet.species}
                      </p>
                      <p className="text-xs text-gray-500">{pet.breed}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{pet.age} months</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {pet.gender}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(pet.status)} capitalize`}
                      >
                        {pet.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">
                        {new Date(pet.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(pet)}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                          title="Edit Pet"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                "Are you sure you want to remove this pet?",
                              )
                            ) {
                              deleteMutation.mutate(pet._id);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Pet"
                        >
                          <Trash2 className="w-4 h-4" />
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
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing page{" "}
              <span className="font-medium text-gray-900">{page}</span> of{" "}
              <span className="font-medium text-gray-900">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-2 border border-gray-200 rounded-lg hover:bg-white transition-all disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 border border-gray-200 rounded-lg hover:bg-white transition-all disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pet Modal */}
      <PetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pet={selectedPet}
        shelterId={effectiveShelterId || undefined}
      />
    </div>
  );
}
