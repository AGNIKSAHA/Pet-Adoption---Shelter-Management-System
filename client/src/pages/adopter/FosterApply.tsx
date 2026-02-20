import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
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
  X,
} from "lucide-react";
import api from "../../lib/api";
import toast from "react-hot-toast";
import { Foster, Shelter } from "../../types";
import { AxiosError } from "axios";

const MAX_FOSTER_SHELTERS = 3;

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
  const queryClient = useQueryClient();
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [capacityDrafts, setCapacityDrafts] = useState<Record<string, number>>(
    {},
  );
  const [speciesDrafts, setSpeciesDrafts] = useState<Record<string, string[]>>(
    {},
  );
  const speciesOptions = ["Dogs", "Cats", "Rabbits", "Birds", "Small Animals"];

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

  const { data: myFosterSheltersData } = useQuery({
    queryKey: ["my-foster-shelters"],
    queryFn: async () => {
      const response = await api.get("/fosters/my-shelters");
      return response.data;
    },
  });

  const linkedShelterRecords = myFosterSheltersData?.data?.records || [];
  const linkedShelterCount = Number(
    myFosterSheltersData?.data?.shelterCount || 0,
  );
  const maxShelters = Number(
    myFosterSheltersData?.data?.maxShelters || MAX_FOSTER_SHELTERS,
  );
  const shelterLimitReached = linkedShelterCount >= maxShelters;
  const alreadyLinkedShelterIds = new Set(
    linkedShelterRecords.map((record: { shelterId: Shelter | string }) =>
      typeof record.shelterId === "string"
        ? record.shelterId
        : record.shelterId?._id,
    ),
  );
  const availableShelters = (shelters?.data || []).filter(
    (shelter: Shelter) => !alreadyLinkedShelterIds.has(shelter._id),
  );
  const approvedFosters = linkedShelterRecords.filter(
    (record: Foster) => record.status === "approved",
  );

  const updateCapacityMutation = useMutation({
    mutationFn: ({
      id,
      capacity,
      preferredSpecies,
    }: {
      id: string;
      capacity: number;
      preferredSpecies?: string[];
    }) =>
      api.patch(`/fosters/${id}/preferences`, { capacity, preferredSpecies }),
    onSuccess: () => {
      toast.success("Capacity updated successfully");
      queryClient.invalidateQueries({ queryKey: ["my-foster-shelters"] });
      queryClient.invalidateQueries({ queryKey: ["foster-status"] });
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to update capacity");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/fosters/${id}/active`, { isActive }),
    onSuccess: () => {
      toast.success("Availability updated");
      queryClient.invalidateQueries({ queryKey: ["my-foster-shelters"] });
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to update status");
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

  const handleCardSpeciesToggle = (fosterId: string, species: string) => {
    const current = speciesDrafts[fosterId] || [];
    const exists = current.includes(species);
    const next = exists
      ? current.filter((s) => s !== species)
      : [...current, species];

    setSpeciesDrafts((prev) => ({
      ...prev,
      [fosterId]: next,
    }));
  };

  const onSubmit = (data: FosterFormData) => {
    if (shelterLimitReached) {
      toast.error(
        `You can be foster parent for maximum ${maxShelters} shelters`,
      );
      return;
    }
    applyMutation.mutate(data);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-10 bg-gradient-to-br from-primary-600 to-indigo-700 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-sm font-medium mb-4">
            <Heart className="w-4 h-4 fill-white text-white" />
            Make a Difference
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight leading-tight">
            Become a Foster Hero
          </h1>
          <p className="text-primary-100 text-lg max-w-xl leading-relaxed">
            Help save lives by providing a temporary, loving home for animals in
            need. Join our network and build a haven for pets waiting for their
            forever families.
          </p>
        </div>
        <Heart className="absolute -right-12 -top-12 w-64 h-64 text-white opacity-10 rotate-12" />
        <Home className="absolute right-32 -bottom-10 w-48 h-48 text-white opacity-5" />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary-500" />
              Approved Foster Profiles
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage your shelter-wise foster profiles and availability here.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowApplyForm(true)}
            disabled={shelterLimitReached}
            className="btn btn-primary px-6 py-2.5 shadow-md shadow-primary-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0 whitespace-nowrap font-medium"
          >
            Apply in Another Shelter
          </button>
        </div>

        {approvedFosters.length === 0 ? (
          <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Home className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              No profiles yet
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              You haven't been approved as a foster parent for any shelter yet.
              Click the button above to apply.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvedFosters.map((record: Foster) => {
              const shelter =
                typeof record.shelterId === "string" ? null : record.shelterId;
              const draftCapacity =
                capacityDrafts[record._id] === undefined
                  ? record.capacity
                  : capacityDrafts[record._id];
              const draftSpecies =
                speciesDrafts[record._id] === undefined
                  ? record.preferredSpecies || []
                  : speciesDrafts[record._id];
              return (
                <div
                  key={record._id}
                  className="rounded-2xl border border-gray-200 p-5 bg-gradient-to-br from-white to-gray-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        {shelter?.name || "Shelter"}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Approved On:{" "}
                        {record.approvedAt
                          ? new Date(record.approvedAt).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                        Approved
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: record._id,
                            isActive: !record.isActive,
                          })
                        }
                        disabled={toggleActiveMutation.isPending}
                        className={`px-2 py-1 rounded text-xs font-semibold border ${
                          record.isActive
                            ? "bg-primary-600 text-white border-primary-700"
                            : "bg-gray-100 text-gray-700 border-gray-200"
                        } disabled:opacity-60`}
                      >
                        {record.isActive
                          ? "Currently Accepting Pets"
                          : "Temporarily Deactivated"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p>Home Type: {record.homeType}</p>
                      <p>Current Animals: {record.currentAnimals}</p>
                      <p>Availability: {record.availability}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span>Capacity:</span>
                        <input
                          type="number"
                          min={Math.max(1, Number(record.currentAnimals || 0))}
                          value={draftCapacity}
                          onChange={(e) =>
                            setCapacityDrafts((prev) => ({
                              ...prev,
                              [record._id]: Number(e.target.value),
                            }))
                          }
                          className="w-24 px-2 py-1 rounded border border-gray-300 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Preferred Species
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {speciesOptions.map((species) => (
                        <button
                          key={`${record._id}-${species}`}
                          type="button"
                          onClick={() =>
                            handleCardSpeciesToggle(record._id, species)
                          }
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                            draftSpecies.includes(species)
                              ? "bg-primary-600 text-white border-primary-700"
                              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                          }`}
                        >
                          {species}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={
                        updateCapacityMutation.isPending ||
                        !Number.isFinite(draftCapacity) ||
                        draftCapacity < Math.max(1, record.currentAnimals) ||
                        draftSpecies.length === 0
                      }
                      onClick={() =>
                        updateCapacityMutation.mutate({
                          id: record._id,
                          capacity: draftCapacity,
                          preferredSpecies: draftSpecies,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-semibold disabled:opacity-60"
                    >
                      Save Capacity & Species
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showApplyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm overflow-y-auto apply-foster-modal">
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-auto relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Foster Application
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Tell us about your home and preferences.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowApplyForm(false)}
                className="p-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[calc(100vh-140px)] overflow-y-auto p-6 sm:p-8 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
                <section className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary-600" />
                    Select Your Shelter
                  </h3>
                  <p className="text-sm text-gray-600">
                    Shelter links used: {linkedShelterCount}/{maxShelters}
                  </p>
                  {shelterLimitReached && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      You already reached the maximum shelter limit for foster
                      parent accounts.
                    </p>
                  )}
                  <select
                    {...register("shelterId")}
                    disabled={shelterLimitReached}
                    className={`w-full px-4 py-3 rounded-xl border ${errors.shelterId ? "border-red-500" : "border-gray-200"} focus:ring-2 focus:ring-primary-500`}
                  >
                    <option value="">Select a shelter to foster for...</option>
                    {availableShelters.map((shelter: Shelter) => (
                      <option key={shelter._id} value={shelter._id}>
                        {shelter.name}
                      </option>
                    ))}
                  </select>
                  {errors.shelterId && (
                    <p className="text-xs text-red-500">
                      {errors.shelterId.message}
                    </p>
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
                        {speciesOptions.map((s) => (
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
                        ))}
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

                <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowApplyForm(false)}
                    className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={applyMutation.isPending || shelterLimitReached}
                    className="btn btn-primary px-8 py-3 text-base flex items-center justify-center gap-2 shadow-md shadow-primary-500/20 hover:shadow-lg disabled:opacity-60"
                  >
                    {applyMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Heart className="w-5 h-5 fill-current" />
                        Submit Application
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
