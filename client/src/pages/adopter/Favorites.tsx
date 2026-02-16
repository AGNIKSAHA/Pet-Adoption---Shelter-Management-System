import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import PetCard from "../../components/PetCard";
import { Pet } from "../../types";

export default function Favorites() {
  const { data: favorites, isLoading } = useQuery({
    queryKey: ["my-favorites"],
    queryFn: async () => {
      const response = await api.get("/favorites");
      return response.data.data;
    },
  });

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
        <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
        <p className="text-gray-500">Animals you've saved to your wishlist.</p>
      </div>

      {favorites?.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map((pet: Pet) => (
            <PetCard key={pet._id} pet={pet} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No favorites yet
          </h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            Browse through our available pets and tap the heart icon to save
            your favorites here.
          </p>
          <Link to="/pets" className="btn btn-primary">
            Browse Pets
          </Link>
        </div>
      )}
    </div>
  );
}
