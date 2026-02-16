import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  MapPin,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Building2,
  Users,
  Search,
  Loader2,
} from "lucide-react";
import api from "../../lib/api";
import toast from "react-hot-toast";
import ShelterModal from "./components/ShelterModal";
import { Shelter } from "../../types";
import { AxiosError } from "axios";

export default function ShelterManagement() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [search, setSearch] = useState("");

  const { data: shelters, isLoading } = useQuery({
    queryKey: ["admin-shelters"],
    queryFn: async () => {
      const response = await api.get("/admin/shelters");
      return response.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Shelter>) => api.post("/admin/shelters", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shelters"] });
      toast.success("Shelter created successfully");
      setIsModalOpen(false);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to create shelter");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Shelter> }) =>
      api.patch(`/admin/shelters/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shelters"] });
      toast.success("Shelter updated successfully");
      setIsModalOpen(false);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to update shelter");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/shelters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shelters"] });
      toast.success("Shelter deleted successfully");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to delete shelter");
    },
  });

  const handleEdit = (shelter: Shelter) => {
    setSelectedShelter(shelter);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedShelter(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (formData: Partial<Shelter>) => {
    if (selectedShelter) {
      updateMutation.mutate({ id: selectedShelter._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredShelters =
    shelters?.filter(
      (s: Shelter) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.address.city.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Shelter Management
          </h1>
          <p className="text-gray-500">
            Add and manage animal shelters across the network.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="btn btn-primary flex items-center gap-2 self-start md:self-auto shadow-lg shadow-primary-100"
        >
          <Plus className="w-5 h-5" />
          Add New Shelter
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search shelters by name or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
        />
      </div>

      {/* Shelters Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
        </div>
      ) : filteredShelters.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
          <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">
            No shelters found. Try a different search or add one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredShelters.map((shelter: Shelter) => (
            <div
              key={shelter._id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="bg-primary-50 p-3 rounded-xl group-hover:scale-110 transition-transform">
                    <Building2 className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(shelter)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-primary-600 transition-all"
                      title="Edit Shelter"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to delete this shelter?",
                          )
                        ) {
                          deleteMutation.mutate(shelter._id);
                        }
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-all"
                      title="Delete Shelter"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {shelter.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {shelter.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-primary-500" />
                    {shelter.address.city}, {shelter.address.state}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-primary-500" />
                    {shelter.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-primary-500" />
                    {shelter.phone}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4 text-primary-500" />
                    <span className="font-semibold text-gray-900">
                      {shelter.currentOccupancy}
                    </span>{" "}
                    / {shelter.capacity} pets
                  </div>
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${shelter.isActive ? "bg-green-500" : "bg-red-500"} ring-4 ring-gray-50`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ShelterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        shelter={selectedShelter}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
