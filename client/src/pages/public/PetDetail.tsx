import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  MapPin,
  Heart,
  Share2,
  CheckCircle,
  Info,
  Loader2,
  MessageCircle,
  PawPrint,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import { Pet, Shelter } from "../../types";

export default function PetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pet", id],
    queryFn: async () => {
      const response = await api.get(`/pets/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const pet: Pet | undefined = data?.data?.pet;
  const [activeImage, setActiveImage] = useState<string>("");

  // Set active image when pet data loads
  if (pet && !activeImage && pet.photos?.[0]) {
    setActiveImage(pet.photos[0]);
  }

  if (!id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Pet not found</h1>
          <p className="text-gray-500 mt-2">
            The pet you're looking for doesn't exist.
          </p>
          <Link
            to="/pets"
            className="text-primary-600 hover:text-primary-700 mt-4 inline-block"
          >
            Browse all pets
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
      </div>
    );
  }

  if (isError || !pet) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Error loading pet
          </h1>
          <p className="text-gray-500 mt-2">
            We couldn't load the pet details. Please try again.
          </p>
          <button
            onClick={() => navigate("/pets")}
            className="btn btn-primary mt-4"
          >
            Browse all pets
          </button>
        </div>
      </div>
    );
  }

  const shelter =
    typeof pet.shelterId === "object" ? (pet.shelterId as Shelter) : null;
  const displayImage =
    activeImage ||
    pet.photos?.[0] ||
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link to="/pets" className="hover:text-primary-600">
          Pets
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{pet.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Images */}
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden">
            <img
              src={displayImage}
              alt={pet.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {pet.photos?.map((photo: string, index: number) => (
              <button
                key={index}
                onClick={() => setActiveImage(photo)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${activeImage === photo ? "border-primary-600 ring-2 ring-primary-100" : "border-transparent hover:border-gray-200"}`}
              >
                <img
                  src={photo}
                  alt={`${pet.name} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mt-8">
            <h2 className="text-2xl font-bold mb-4">About {pet.name}</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              {pet.description}
            </p>

            <h3 className="text-lg font-semibold mb-3">Health & Medical</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Vaccinations up to date</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Spayed / Neutered</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Microchipped</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Info className="w-5 h-5 text-blue-500" />
                <span>No special needs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Info & Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {pet.name}
                </h1>
                <div className="flex items-center text-gray-500">
                  <MapPin className="w-4 h-4 mr-1" />
                  {shelter?.address?.city || "Location not available"}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-full bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                  <Heart className="w-6 h-6" />
                </button>
                <button className="p-2 rounded-full bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors">
                  <Share2 className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  Breed
                </p>
                <p className="font-medium text-gray-900">{pet.breed}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  Age
                </p>
                <p className="font-medium text-gray-900">
                  {pet.age} {pet.age === 1 ? "month" : "months"}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  Gender
                </p>
                <p className="font-medium text-gray-900 capitalize">
                  {pet.gender}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  Size
                </p>
                <p className="font-medium text-gray-900 capitalize">
                  {pet.size}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                to={`/adopter/apply/${pet._id}`}
                className="btn btn-primary w-full py-3 text-lg flex items-center justify-center gap-2"
              >
                <PawPrint className="w-5 h-5" />
                Apply to Adopt
              </Link>
              <Link
                to={`/messages?userId=${pet.contactPerson?._id || shelter?._id || pet.shelterId}`}
                className="btn btn-outline w-full py-3 text-lg flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Ask a Question
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="font-semibold mb-4">Shelter Information</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-xl">
                  {shelter?.name?.substring(0, 2).toUpperCase() || "SA"}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {shelter?.name || "Shelter information unavailable"}
                  </p>
                  <p className="text-sm text-gray-500">Verified Partner</p>
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-2">
                <p>Email: {shelter?.email || "N/A"}</p>
                <p>Phone: {shelter?.phone || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
