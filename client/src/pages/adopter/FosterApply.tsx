import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Home,
  Shield,
  ClipboardCheck,
  Info,
  Heart,
  Loader2,
} from "lucide-react";
import api from "../../lib/api";
import toast from "react-hot-toast";
import { Shelter } from "../../types";
import { AxiosError } from "axios";

const fosterSchema = z.object({
  shelterId: z.string().min(1, "Please select a shelter"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  experience: z
    .string()
    .min(20, "Please provide more detail about your experience"),
  homeType: z.enum(["house", "apartment", "condo", "other"]),
  hasYard: z.boolean(),
  preferredSpecies: z.array(z.string()).min(1, "Select at least one species"),
  availability: z.string().min(10, "Please describe your availability"),
});

type FosterFormData = z.infer<typeof fosterSchema>;

export default function FosterApply() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FosterFormData>({
    resolver: zodResolver(fosterSchema),
    defaultValues: {
      capacity: 1,
      homeType: "house",
      hasYard: false,
      preferredSpecies: [],
    },
  });

  const preferredSpecies = watch("preferredSpecies");

  const { data: shelters } = useQuery({
    queryKey: ["shelters-list"],
    queryFn: async () => {
      const response = await api.get("/shelters");
      return response.data;
    },
  });

  const applyMutation = useMutation({
    mutationFn: (data: FosterFormData) => api.post("/fosters/apply", data),
    onSuccess: () => {
      toast.success("Foster application submitted!");
      navigate("/adopter/dashboard");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(
        error.response?.data?.message || "Failed to submit application",
      );
    },
  });

  const handleSpeciesToggle = (species: string) => {
    const current = [...preferredSpecies];
    const index = current.indexOf(species);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(species);
    }
    setValue("preferredSpecies", current, { shouldValidate: true });
  };

  const onSubmit = (data: FosterFormData) => {
    applyMutation.mutate(data);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Become a Foster Hero
        </h1>
        <p className="text-gray-600 mt-2">
          Help save lives by providing a temporary home for animals in need.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-600" />
              Select Your Shelter
            </h3>
            <select
              {...register("shelterId")}
              className={`w-full px-4 py-3 rounded-xl border ${errors.shelterId ? "border-red-500" : "border-gray-200"} focus:ring-2 focus:ring-primary-500`}
            >
              <option value="">Select a shelter to foster for...</option>
              {shelters?.data?.map((shelter: Shelter) => (
                <option key={shelter._id} value={shelter._id}>
                  {shelter.name}
                </option>
              ))}
            </select>
            {errors.shelterId && (
              <p className="text-xs text-red-500">{errors.shelterId.message}</p>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Home className="w-5 h-5 text-primary-600" />
              Your Living Situation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Home Type
                </label>
                <select
                  {...register("homeType")}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200"
                >
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="condo">Condo</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex flex-col justify-center gap-1">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="hasYard"
                    {...register("hasYard")}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label
                    htmlFor="hasYard"
                    className="text-sm font-medium text-gray-700"
                  >
                    I have a fenced yard
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary-600" />
              Foster Preferences
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Capacity (animals at once)
                </label>
                <input
                  type="number"
                  min="1"
                  {...register("capacity", { valueAsNumber: true })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200"
                />
                {errors.capacity && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.capacity.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Species you prefer to foster
                </label>
                <div className="flex flex-wrap gap-2">
                  {["Dogs", "Cats", "Rabbits", "Birds", "Small Animals"].map(
                    (s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSpeciesToggle(s)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          preferredSpecies?.includes(s)
                            ? "bg-primary-600 text-white shadow-sm"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {s}
                      </button>
                    ),
                  )}
                </div>
                {errors.preferredSpecies && (
                  <p className="text-xs text-red-500 mt-2">
                    {errors.preferredSpecies.message}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary-600" />
              Additional Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experience with animals
                </label>
                <textarea
                  {...register("experience")}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.experience ? "border-red-500" : "border-gray-200"} h-24 outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="Tell us about your previous experience with pets..."
                />
                {errors.experience && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.experience.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Availability
                </label>
                <textarea
                  {...register("availability")}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.availability ? "border-red-500" : "border-gray-200"} h-24 outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="When are you available to take in animals? Any specific schedules?"
                />
                {errors.availability && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.availability.message}
                  </p>
                )}
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={applyMutation.isPending}
            className="btn btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
          >
            {applyMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Heart className="w-5 h-5 fill-current" />
                Submit Foster Application
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
