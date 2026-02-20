import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Upload, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../../lib/api";
import toast from "react-hot-toast";
import { useAppSelector } from "../../../store/store";
import { AxiosError } from "axios";
import { queueOfflinePetOperation } from "../../../lib/offlinePetQueue";

const coercedBoolean = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value) => value === true || value === "true");

const isAbsoluteUrl = (value: string) => z.string().url().safeParse(value).success;
const isUploadPath = (value: string) => /^\/uploads\/.+/i.test(value);
const isDataImageUrl = (value: string) => /^data:image\/[a-zA-Z0-9+.-]+;base64,/i.test(value);
const isValidImageLink = (value: string) =>
  isAbsoluteUrl(value) || isUploadPath(value) || isDataImageUrl(value);

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
    vaccinated: coercedBoolean,
    spayedNeutered: coercedBoolean,
    microchipped: coercedBoolean,
    specialNeeds: z.boolean().default(false),
    specialNeedsDescription: z.string().optional(),
  }),
  photos: z
    .array(
      z.object({
        url: z.string().refine(isValidImageLink, {
          message: "Must be a valid URL or uploaded image path",
        }),
      }),
    )
    .default([]),
  vaccinationReportPdf: z
    .string()
    .optional()
    .refine((value) => !value || isAbsoluteUrl(value) || isUploadPath(value), {
      message: "Must be a valid URL or uploaded file path",
    })
    .refine((value) => !value || /\.pdf($|\?)/i.test(value), {
      message: "Vaccination report must be a PDF link",
    }),
  vetEmailForRelease: z
    .string()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Please provide a valid vet email",
    }),
  vetReleaseNote: z.string().optional(),
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
  const [vaccinationReportFileName, setVaccinationReportFileName] =
    useState<string>("");
  const [uploadingReport, setUploadingReport] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [medicalViewMode, setMedicalViewMode] = useState<"effective" | "audit">(
    "effective",
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
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
      vaccinationReportPdf: "",
      vetEmailForRelease: "",
      vetReleaseNote: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "photos",
  });

  const { data: medicalTimelineData } = useQuery({
    queryKey: ["medical-timeline", pet?._id],
    queryFn: async () => {
      const response = await api.get(`/medical/pets/${pet?._id}/timeline`);
      return response.data;
    },
    enabled: !!pet?._id,
  });

  useEffect(() => {
    if (pet) {
      setVaccinationReportFileName("");
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
        vaccinationReportPdf: "",
        vetEmailForRelease: "",
        vetReleaseNote: "",
      });
    } else {
      setVaccinationReportFileName("");
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
        vaccinationReportPdf: "",
        vetEmailForRelease: "",
        vetReleaseNote: "",
      });
    }
  }, [pet, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: async (data: PetFormData) => {
      const {
        vaccinationReportPdf,
        vetEmailForRelease,
        vetReleaseNote,
        ...formData
      } = data;
      const payload = {
        ...formData,
        photos: formData.photos.map((p: { url: string }) => p.url),
      };
      const canQueueOffline = user?.role === "shelter_staff";
      const queuedResponse = { data: { offlineQueued: true } };

      const createVaccinationRecord = async (petId: string) => {
        if (!vaccinationReportPdf || !data.health.vaccinated) return;

        await api.post(`/medical/pets/${petId}/records`, {
          recordType: "vaccination",
          title: "Vaccination Record",
          description: "Vaccination record submitted from pet form",
          date: new Date().toISOString(),
          documents: [vaccinationReportPdf],
        });
      };

      const appendVaccinationCorrection = async (petId: string) => {
        if (!vaccinationReportPdf || !data.health.vaccinated) return;

        const timelineResponse = await api.get(`/medical/pets/${petId}/timeline`);
        const auditTrail = timelineResponse.data?.data?.auditTrail || [];
        const latestVaccination = [...auditTrail]
          .reverse()
          .find((record: any) => record.recordType === "vaccination");

        if (!latestVaccination?._id) {
          await createVaccinationRecord(petId);
          return;
        }

        await api.post(
          `/medical/pets/${petId}/records/${latestVaccination._id}/corrections`,
          {
            title: "Vaccination Record Correction",
            description:
              "Correction record submitted from pet form with updated report",
            date: new Date().toISOString(),
            documents: [vaccinationReportPdf],
          },
        );
      };

      if (pet) {
        // For updates, handle status separately
        const statusChanged = pet.status !== data.status;
        const { status, ...petDataWithoutStatus } = payload;
        const needsVetSignoff =
          pet.status === "medical_hold" && status === "available";

        if (needsVetSignoff && !vetEmailForRelease) {
          throw new Error(
            "Vet email is required to release pet from medical hold.",
          );
        }

        if (needsVetSignoff && !navigator.onLine) {
          throw new Error(
            "Internet is required to send vet sign-off email request.",
          );
        }

        if (canQueueOffline && !navigator.onLine) {
          queueOfflinePetOperation({
            type: "update",
            petId: pet._id,
            payload: {
              petDataWithoutStatus,
              statusChanged,
              status,
            },
          });
          return queuedResponse;
        }

        try {
          // Update pet info (without status)
          const updateResponse = await api.patch(
            `/pets/${pet._id}`,
            petDataWithoutStatus,
          );

          // If status changed, update it separately
          if (statusChanged && status) {
            if (needsVetSignoff) {
              await api.post(`/pets/${pet._id}/request-vet-signoff`, {
                vetEmail: vetEmailForRelease,
                requestNote: vetReleaseNote,
              });
            } else {
              await api.patch(`/pets/${pet._id}/status`, { status });
            }
          }

          if (vaccinationReportPdf && data.health.vaccinated) {
            await appendVaccinationCorrection(pet._id);
          }

          return updateResponse;
        } catch (error) {
          const axiosError = error as AxiosError;
          if (canQueueOffline && (!axiosError.response || axiosError.code === "ERR_NETWORK")) {
            queueOfflinePetOperation({
              type: "update",
              petId: pet._id,
              payload: {
                petDataWithoutStatus,
                statusChanged,
                status,
              },
            });
            return queuedResponse;
          }
          throw error;
        }
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

        if (canQueueOffline && !navigator.onLine) {
          queueOfflinePetOperation({
            type: "create",
            shelterId,
            payload,
          });
          return queuedResponse;
        }

        try {
          const createResponse = await api.post("/pets", { ...payload, shelterId });
          const createdPetId = createResponse.data?.data?.pet?._id;
          if (createdPetId) {
            await createVaccinationRecord(createdPetId);
          }
          return createResponse;
        } catch (error) {
          const axiosError = error as AxiosError;
          if (canQueueOffline && (!axiosError.response || axiosError.code === "ERR_NETWORK")) {
            queueOfflinePetOperation({
              type: "create",
              shelterId,
              payload,
            });
            return queuedResponse;
          }
          throw error;
        }
      }
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["shelter-pets"] });
      queryClient.invalidateQueries({ queryKey: ["shelter-pet-stats"] });
      if (pet?._id) {
        queryClient.invalidateQueries({ queryKey: ["medical-timeline", pet._id] });
      }
      if (result?.data?.offlineQueued) {
        toast.success(
          pet
            ? "Offline: pet update saved locally and will sync automatically."
            : "Offline: pet creation saved locally and will sync automatically.",
        );
      } else {
        if (pet && pet.status === "medical_hold" && watch("status") === "available") {
          toast.success(
            "Pet details updated and vet sign-off request sent. Status will auto-change after vet approval.",
          );
        } else {
          toast.success(
            pet ? "Pet updated successfully" : "Pet created successfully",
          );
        }
      }
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
    const previousVaccinated = pet?.health?.vaccinated ?? false;
    const vaccinationChanged =
      !pet ? data.health.vaccinated : previousVaccinated !== data.health.vaccinated;

    if (vaccinationChanged && !data.vaccinationReportPdf) {
      toast.error("Please add vaccination report PDF link before submitting.");
      return;
    }

    mutation.mutate(data);
  };

  const handleVaccinationReportUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      toast.error("Please upload a PDF file only.");
      event.target.value = "";
      return;
    }

    try {
      setUploadingReport(true);
      const formData = new FormData();
      formData.append("report", file);

      const response = await api.post("/medical/upload-report", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const uploadedUrl = response.data?.data?.url;
      if (!uploadedUrl) {
        throw new Error("Upload failed");
      }

      setVaccinationReportFileName(file.name);
      setValue("vaccinationReportPdf", uploadedUrl, {
        shouldValidate: true,
        shouldDirty: true,
      });
      toast.success("Vaccination PDF uploaded.");
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      toast.error(
        axiosError.response?.data?.message || "Failed to upload PDF report",
      );
      event.target.value = "";
    } finally {
      setUploadingReport(false);
    }
  };

  const handlePetPhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      event.target.value = "";
      return;
    }

    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append("image", file);

      const response = await api.post("/pets/upload-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const uploadedUrl = response.data?.data?.url;
      if (!uploadedUrl) {
        throw new Error("Upload failed");
      }

      append({ url: uploadedUrl });
      toast.success("Pet image uploaded.");
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      const isNetworkIssue = !axiosError.response || axiosError.code === "ERR_NETWORK";
      if (user?.role === "shelter_staff" && isNetworkIssue) {
        const reader = new FileReader();
        reader.onload = () => {
          const result = typeof reader.result === "string" ? reader.result : "";
          if (result) {
            append({ url: result });
            toast.success(
              "Offline: image stored locally. It will upload automatically when syncing.",
            );
          } else {
            toast.error("Failed to read image for offline storage.");
          }
        };
        reader.onerror = () => {
          toast.error("Failed to read image for offline storage.");
        };
        reader.readAsDataURL(file);
      } else {
        toast.error(
          axiosError.response?.data?.message || "Failed to upload pet image",
        );
      }
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
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

              {pet &&
                pet.status === "medical_hold" &&
                watch("status") === "available" && (
                  <div className="md:col-span-2 p-4 rounded-xl border border-amber-200 bg-amber-50 space-y-3">
                    <p className="text-sm font-semibold text-amber-800">
                      Vet sign-off is required to move from Medical Hold to Available.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Vet Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          {...register("vetEmailForRelease")}
                          className={`w-full px-4 py-2 border rounded-xl outline-none transition-all ${errors.vetEmailForRelease ? "border-red-500 ring-1 ring-red-500" : "border-gray-200 focus:ring-2 focus:ring-primary-500"}`}
                          placeholder="vet@example.com"
                        />
                        {errors.vetEmailForRelease && (
                          <p className="text-xs text-red-500">
                            {errors.vetEmailForRelease.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Note for Vet (optional)
                        </label>
                        <input
                          {...register("vetReleaseNote")}
                          className="w-full px-4 py-2 border rounded-xl outline-none transition-all border-gray-200 focus:ring-2 focus:ring-primary-500"
                          placeholder="Medical summary..."
                        />
                      </div>
                    </div>
                  </div>
                )}

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

                {watch("health.vaccinated") && (
                  <div className="space-y-1 mt-4">
                    <label className="text-sm font-medium text-gray-700">
                      Vaccination Report (PDF File)
                    </label>
                    <input type="hidden" {...register("vaccinationReportPdf")} />
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handleVaccinationReportUpload}
                      className={`w-full px-4 py-2 border rounded-xl outline-none transition-all file:mr-4 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100 ${
                        errors.vaccinationReportPdf
                          ? "border-red-500 ring-1 ring-red-500"
                          : "border-gray-200 focus:ring-2 focus:ring-primary-500"
                      }`}
                    />
                    {vaccinationReportFileName && (
                      <p className="text-xs text-green-600 flex items-center gap-2">
                        Uploaded: {vaccinationReportFileName}
                        {watch("vaccinationReportPdf") && (
                          <a
                            href={watch("vaccinationReportPdf")}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="underline text-primary-700 hover:text-primary-800"
                          >
                            Download PDF
                          </a>
                        )}
                      </p>
                    )}
                    {uploadingReport && (
                      <p className="text-xs text-primary-600">Uploading PDF...</p>
                    )}
                    {errors.vaccinationReportPdf && (
                      <p className="text-xs text-red-500">
                        {errors.vaccinationReportPdf.message}
                      </p>
                    )}
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

              {pet && (
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-primary-600 uppercase tracking-wider">
                      Vaccination Timeline
                    </h3>
                    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setMedicalViewMode("effective")}
                        className={`px-3 py-1.5 text-xs font-medium ${
                          medicalViewMode === "effective"
                            ? "bg-primary-600 text-white"
                            : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        Effective
                      </button>
                      <button
                        type="button"
                        onClick={() => setMedicalViewMode("audit")}
                        className={`px-3 py-1.5 text-xs font-medium border-l border-gray-200 ${
                          medicalViewMode === "audit"
                            ? "bg-primary-600 text-white"
                            : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        Audit Trail
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const timeline = medicalTimelineData?.data;
                    const records =
                      medicalViewMode === "effective"
                        ? timeline?.effectiveTimeline || []
                        : timeline?.auditTrail || [];

                    if (records.length === 0) {
                      return (
                        <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                          No medical records available yet.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {records.map((record: any) => (
                          <div
                            key={record._id}
                            className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-gray-900">
                                {record.title}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 uppercase">
                                  {String(record.recordType).replace("_", " ")}
                                </span>
                                {record.isCorrected && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                    Corrected
                                  </span>
                                )}
                                {record.recordType === "correction" && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                    Correction
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {record.description}
                            </p>
                            <div className="mt-2 text-[11px] text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                              <span>
                                Date:{" "}
                                {record.date
                                  ? new Date(record.date).toLocaleDateString()
                                  : "-"}
                              </span>
                              {record.correctsRecordId && (
                                <span>Corrects ID: {record.correctsRecordId}</span>
                              )}
                              {record.appliedCorrectionId && (
                                <span>
                                  Applied Correction ID: {record.appliedCorrectionId}
                                </span>
                              )}
                            </div>
                            {Array.isArray(record.documents) &&
                              record.documents.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {record.documents.map(
                                    (doc: string, docIndex: number) => (
                                      <a
                                        key={`${record._id}-doc-${docIndex}`}
                                        href={doc}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="text-xs px-2 py-1 rounded border border-primary-200 text-primary-700 bg-white hover:bg-primary-50"
                                      >
                                        Download PDF
                                      </a>
                                    ),
                                  )}
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-primary-600 uppercase tracking-wider">
                    Photos
                  </h3>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => append({ url: "" })}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Photo URL
                    </button>
                    <label className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 cursor-pointer">
                      <Upload className="w-3 h-3" /> Upload From Device
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePetPhotoUpload}
                      />
                    </label>
                  </div>
                </div>
                {uploadingPhoto && (
                  <p className="text-xs text-primary-600">Uploading photo...</p>
                )}

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
            disabled={mutation.isPending || uploadingReport || uploadingPhoto}
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
