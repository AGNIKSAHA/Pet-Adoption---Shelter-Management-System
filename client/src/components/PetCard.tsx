import { Link } from "react-router-dom";
import { Heart, MapPin } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { useAppSelector } from "../store/store";
import toast from "react-hot-toast";

import { Pet } from "../types";
import { AxiosError } from "axios";

import { formatAge } from "../lib/format";

interface PetCardProps {
  pet: Pet;
}

export default function PetCard({ pet }: PetCardProps) {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const petId = pet._id;

  const { data: favoriteData } = useQuery({
    queryKey: ["is-favorite", petId],
    queryFn: async () => {
      const response = await api.get(`/favorites/check/${petId}`);
      return response.data;
    },
    enabled: isAuthenticated && user?.role === "adopter" && !!petId,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/favorites/toggle", { petId });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["is-favorite", petId] });
      queryClient.invalidateQueries({ queryKey: ["my-favorites"] });
      toast.success(data.message);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Something went wrong");
    },
  });

  const isFavorite = favoriteData?.isFavorite;
  const displayImage =
    pet.photos?.[0] ||
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1";

  const displayLocation =
    typeof pet.shelterId === "object" && pet.shelterId?.address?.city
      ? pet.shelterId.address.city
      : "Location not available";

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden group">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={displayImage}
          alt={pet.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isAuthenticated && user?.role === "adopter" && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavoriteMutation.mutate();
            }}
            disabled={toggleFavoriteMutation.isPending}
            className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-400 hover:text-red-500 hover:bg-white transition-colors"
          >
            <Heart
              className={`w-5 h-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
            />
          </button>
        )}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700 capitalize">
          {pet.gender} • {formatAge(pet.age)}
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Link
            to={`/pets/${petId}`}
            className="group-hover:text-primary-600 transition-colors"
          >
            <h3 className="text-lg font-bold text-gray-900">{pet.name}</h3>
          </Link>
          <span
            className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
              pet.status === "available"
                ? "bg-green-100 text-green-700"
                : pet.status === "meet"
                  ? "bg-yellow-100 text-yellow-700"
                  : pet.status === "adopted"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700"
            }`}
          >
            {pet.status.replace("_", " ")}
          </span>
        </div>

        <p className="text-gray-500 text-sm mb-3">
          {pet.breed} • {pet.size}
        </p>

        <div className="flex items-center text-gray-500 text-sm mb-4">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="truncate">{displayLocation}</span>
        </div>

        <Link
          to={`/pets/${petId}`}
          className="block w-full text-center py-2 px-4 bg-gray-50 hover:bg-primary-50 text-gray-900 hover:text-primary-700 font-medium rounded-lg transition-colors text-sm border border-gray-200 hover:border-primary-200"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
