import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Upload, Plus, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../../lib/api";
import toast from "react-hot-toast";
import { useAppSelector } from "../../../store/store";
import { AxiosError } from "axios";

const petSchema = z.object({
  name: z.string().min(1, "Name is required"),
  species: z.enum(["dog", "cat", "bird", "rabbit", "other"]),
  breed: z.string().min(1, "Breed is required"),
  age: z.number().min(0, "Age cannot be negative"),
  gender: z.enum(["male", "female"]),
  size: z.enum(["small", "medium", "large"]),
  color: z.string().min(1, "Color is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  status: z.string().optional(),
  compatibility: z.object({
    goodWithKids: z.boolean().default(false),
    goodWithDogs: z.boolean().default(false),
    goodWithCats: z.boolean().default(false),
  }),
  health: z.object({
    vaccinated: z.boolean(),
    spayedNeutered: z.boolean(),
    microchipped: z.boolean(),
    specialNeeds: z.boolean().default(false),
    specialNeedsDescription: z.string().optional(),
  }),
  photos: z
    .array(z.object({ url: z.string().url("Must be a valid URL") }))
    .default([]),
});

type PetFormData = z.infer<typeof petSchema>;

import { Pet } from "../../../types";

interface PetModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
  shelterId?: string;
}

export default function PetModal({
  isOpen,
  onClose,
  pet,
  shelterId: forceShelterId,
}: PetModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<PetFormData>({
    resolver: zodResolver(petSchema),
    defaultValues: {
      compatibility: {
        goodWithKids: false,
        goodWithDogs: false,
        goodWithCats: false,
      },
      health: {
        vaccinated: false,
        spayedNeutered: false,
        microchipped: false,
        specialNeeds: false,
        specialNeedsDescription: "",
      },
      photos: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "photos",
  });

  useEffect(() => {
    if (pet) {
      reset({
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        age: pet.age,
        gender: pet.gender,
        size: pet.size,
        color: pet.color,
        description: pet.description,
        status: pet.status,
        compatibility: pet.compatibility || {
          goodWithKids: false,
          goodWithDogs: false,
          goodWithCats: false,
        },
        health: pet.health || {
          vaccinated: false,
          spayedNeutered: false,
          microchipped: false,
          specialNeeds: false,
          specialNeedsDescription: "",
        },
        photos: pet.photos?.map((url: string) => ({ url })) || [],
      });
    } else {
      reset({
        name: "",
        species: "dog",
        breed: "",
        age: 0,
        gender: "male",
        size: "medium",
        color: "",
        description: "",
        status: "available",
        compatibility: {
          goodWithKids: false,
          goodWithDogs: false,
          goodWithCats: false,
        },
        health: {
          vaccinated: false,
          spayedNeutered: false,
          microchipped: false,
          specialNeeds: false,
          specialNeedsDescription: "",
        },
        photos: [],
      });
    }
  }, [pet, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: async (data: PetFormData) => {
      const payload = {
        ...data,
        photos: data.photos.map((p: { url: string }) => p.url),
      };

      if (pet) {
        // For updates, handle status separately
        const statusChanged = pet.status !== data.status;
        const { status, ...petDataWithoutStatus } = payload;

        // Update pet info (without status)
        const updateResponse = await api.patch(
          `/pets/${pet._id}`,
          petDataWithoutStatus,
        );

        // If status changed, update it separately
        if (statusChanged && status) {
          await api.patch(`/pets/${pet._id}/status`, { status });
        }

        return updateResponse;
      } else {
        const getEffectiveShelterId = () => {
          if (forceShelterId) return forceShelterId;

          const extractId = (
            val: string | { _id?: string; id?: string } | null | undefined,
          ): string | undefined => {
            if (!val || val === "null") return undefined;
            if (typeof val === "string") return val;
            return val._id || val.id;
          };

          const sid = extractId(user?.shelterId);
          if (sid) return sid;

          const approvedApp = user?.staffApplications?.find(
            (app) => app.status === "approved",
          );
          return extractId(approvedApp?.shelterId);
        };

        const shelterId = getEffectiveShelterId();
        if (!shelterId && user?.role !== "admin") {
          throw new Error(
            "Shelter context missing. Please ensure you are associated with a shelter.",
          );
        }

        return api.post("/pets", { ...payload, shelterId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-pets"] });
      queryClient.invalidateQueries({ queryKey: ["shelter-pet-stats"] });
      toast.success(
        pet ? "Pet updated successfully" : "Pet created successfully",
      );
      onClose();
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message: string }>;
      const message =
        axiosError.response?.data?.message ||
        (error instanceof Error ? error.message : "Something went wrong");
      toast.error(message);
    },
  });

  const onSubmit = (data: PetFormData) => {
    mutation.mutate(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">
            {pet ? "Edit Pet Details" : "Add New Pet"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form
            id="pet-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-sm font-semibold text-primary-600 uppercase tracking-wider">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      Pet Name
                    </label>
                    <input
                      {...register("name")}
                      className={`w-full px-4 py-2 border rounded-xl outline-none transition-all ${errors.name ? "border-red-500 ring-1 ring-red-500" : "border-gray-200 focus:ring-2 focus:ring-primary-500"}`}
                      placeholder="e.g. Buddy"
                    />
                    {errors.name && (
                      <p className="text-xs text-red-500">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      Species
                    </label>
                    <select
                      {...register("species")}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white"
                    >
                      <option value="dog">Dog</option>
                      <option value="cat">Cat</option>
                      <option value="bird">Bird</option>
                      <option value="rabbit">Rabbit</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:col-span-2">
                <h3 className="text-sm font-semibold text-primary-600 uppercase tracking-wider">
                  Physical Traits
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      Breed
                    </label>
                    <input
                      {...register("breed")}
                      className={`w-full px-4 py-2 border rounded-xl outline-none transition-all ${errors.breed ? "border-red-500 ring-1 ring-red-500" : "border-gray-200 focus:ring-2 focus:ring-primary-500"}`}
                      placeholder="e.g. Golden Retriever"
                    />
                    {errors.breed && (
                      <p className="text-xs text-red-500">
                        {errors.breed.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      Age (Months)
                    </label>
                    <input
                      type="number"
                      {...register("age", { valueAsNumber: true })}
                      className={`w-full px-4 py-2 border rounded-xl outline-none transition-all ${errors.age ? "border-red-500 ring-1 ring-red-500" : "border-gray-200 focus:ring-2 focus:ring-primary-500"}`}
                    />
                    {errors.age && (
                      <p className="text-xs text-red-500">
                        {errors.age.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      Gender
                    </label>
                    <select
                      {...register("gender")}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      Size
                    </label>
                    <select
                      {...register("size")}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      Color
                    </label>
                    <input
                      {...register("color")}
                      className={`w-full px-4 py-2 border rounded-xl outline-none transition-all ${errors.color ? "border-red-500 ring-1 ring-red-500" : "border-gray-200 focus:ring-2 focus:ring-primary-500"}`}
                      placeholder="e.g. Golden"
                    />
                    {errors.color && (
                      <p className="text-xs text-red-500">
                        {errors.color.message}
                      </p>
                    )}
                  </div>
                  {pet && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <select
                        {...register("status")}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white"
                      >
                        <option value="intake">Intake</option>
                        <option value="medical_hold">Medical Hold</option>
                        <option value="available">Available</option>
                        <option value="meet">Meet</option>
                        <option value="adopted">Adopted</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  rows={4}
                  className={`w-full px-4 py-2 border rounded-xl outline-none transition-all resize-none ${errors.description ? "border-red-500 ring-1 ring-red-500" : "border-gray-200 focus:ring-2 focus:ring-primary-500"}`}
                  placeholder="Describe personality, history, and needs..."
                />
                {errors.description && (
                  <p className="text-xs text-red-500">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2 space-y-4">
                <h3 className="text-sm font-semibold text-primary-600 uppercase tracking-wider">
                  Health & Medical{" "}
                  {!pet && <span className="text-red-500">*</span>}
                </h3>
                <div className="space-y-4">
                  {!pet ? (
                    // For new pets: Use radio buttons to force explicit selection
                    <>
                      {[
                        { key: "vaccinated", label: "Vaccinated" },
                        { key: "spayedNeutered", label: "Spayed/Neutered" },
                        { key: "microchipped", label: "Microchipped" },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            {label} <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="radio"
                                value="true"
                                {...register(
                                  `health.${key as keyof PetFormData["health"]}`,
                                  {
                                    setValueAs: (v) => v === "true",
                                  },
                                )}
                                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700 group-hover:text-primary-600 transition-colors">
                                Yes
                              </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="radio"
                                value="false"
                                {...register(
                                  `health.${key as keyof PetFormData["health"]}`,
                                  {
                                    setValueAs: (v) => v === "true",
                                  },
                                )}
                                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700 group-hover:text-primary-600 transition-colors">
                                No
                              </span>
                            </label>
                          </div>
                          {errors.health?.[
                            key as keyof typeof errors.health
                          ] && (
                            <p className="text-xs text-red-500">
                              Please select {label.toLowerCase()} status
                            </p>
                          )}
                        </div>
                      ))}

                      {/* Special Needs - Keep as checkbox */}
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          {...register("health.specialNeeds")}
                          className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-primary-600 transition-colors">
                          Special Needs
                        </span>
                      </label>
                    </>
                  ) : (
                    // For editing pets: Keep checkboxes
                    <div className="flex flex-wrap gap-4">
                      {[
                        { key: "vaccinated", label: "Vaccinated" },
                        { key: "spayedNeutered", label: "Spayed/Neutered" },
                        { key: "microchipped", label: "Microchipped" },
                        { key: "specialNeeds", label: "Special Needs" },
                      ].map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            {...register(
                              `health.${key as keyof PetFormData["health"]}`,
                            )}
                            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-primary-600 transition-colors">
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {watch("health.specialNeeds") && (
                  <div className="space-y-1 mt-4">
                    <label className="text-sm font-medium text-gray-700">
                      Special Needs Description
                    </label>
                    <textarea
                      {...register("health.specialNeedsDescription")}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none transition-all resize-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Describe any special needs or medical conditions..."
                    />
                  </div>
                )}
              </div>

              <div className="md:col-span-2 space-y-4">
                <h3 className="text-sm font-semibold text-primary-600 uppercase tracking-wider">
                  Compatibility
                </h3>
                <div className="flex flex-wrap gap-4">
                  {["goodWithKids", "goodWithDogs", "goodWithCats"].map(
                    (key) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          {...register(
                            `compatibility.${key as keyof PetFormData["compatibility"]}`,
                          )}
                          className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-primary-600 transition-colors capitalize">
                          {key.replace("goodWith", "Good with ")}
                        </span>
                      </label>
                    ),
                  )}
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-primary-600 uppercase tracking-wider">
                    Photos
                  </h3>
                  <button
                    type="button"
                    onClick={() => append({ url: "" })}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Photo URL
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="space-y-1">
                      <div className="flex gap-2">
                        <input
                          {...register(`photos.${index}.url`)}
                          className={`flex-1 px-4 py-2 border rounded-xl outline-none transition-all ${errors.photos?.[index]?.url ? "border-red-500" : "border-gray-200 focus:ring-2 focus:ring-primary-500"}`}
                          placeholder="https://example.com/photo.jpg"
                        />
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      {errors.photos?.[index]?.url && (
                        <p className="text-xs text-red-500">
                          {errors.photos[index]?.url?.message}
                        </p>
                      )}
                    </div>
                  ))}
                  {fields.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Upload className="w-8 h-8" />
                        <p className="text-sm">No photos added yet</p>
                        <button
                          type="button"
                          onClick={() => append({ url: "" })}
                          className="text-primary-600 font-medium hover:underline transition-all"
                        >
                          Add first photo URL
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            form="pet-form"
            type="submit"
            disabled={mutation.isPending}
            className="btn btn-primary px-8 py-2 rounded-xl flex items-center gap-2"
          >
            {mutation.isPending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            {pet ? "Update Pet" : "Create Pet"}
          </button>
        </div>
      </div>
    </div>
  );
}
