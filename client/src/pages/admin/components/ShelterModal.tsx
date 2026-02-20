import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Loader2 } from "lucide-react";

const shelterSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(5, "Phone is required"),
  timezone: z.string().min(1, "Timezone is required"),
  address: z.object({
    street: z.string().min(1, "Street is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().min(1, "Zip Code is required"),
    country: z.string().min(1, "Country is required"),
  }),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  location: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
});

import { Shelter } from "../../../types";

type ShelterFormData = z.infer<typeof shelterSchema>;

interface ShelterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ShelterFormData) => void;
  shelter?: Shelter | null;
  isLoading: boolean;
}

export default function ShelterModal({
  isOpen,
  onClose,
  onSubmit,
  shelter,
  isLoading,
}: ShelterModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShelterFormData>({
    resolver: zodResolver(shelterSchema),
    defaultValues: {
      location: { type: "Point", coordinates: [0, 0] },
      address: { country: "USA" },
    },
  });

  useEffect(() => {
    if (shelter) {
      reset({
        name: shelter.name,
        description: shelter.description,
        email: shelter.email,
        phone: shelter.phone,
        timezone: shelter.timezone || "UTC",
        address: shelter.address,
        capacity: shelter.capacity,
        location: shelter.location || { type: "Point", coordinates: [0, 0] },
      });
    } else {
      reset({
        name: "",
        description: "",
        email: "",
        phone: "",
        timezone: "UTC",
        address: {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "USA",
        },
        capacity: 10,
        location: { type: "Point", coordinates: [0, 0] },
      });
    }
  }, [shelter, reset, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">
            {shelter ? "Edit Shelter" : "Add New Shelter"}
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
            id="shelter-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Shelter Name
                </label>
                <input
                  {...register("name")}
                  className={`w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all ${errors.name ? "border-red-500" : "border-gray-200"}`}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  {...register("email")}
                  className={`w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all ${errors.email ? "border-red-500" : "border-gray-200"}`}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  {...register("phone")}
                  className={`w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all ${errors.phone ? "border-red-500" : "border-gray-200"}`}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Capacity
                </label>
                <input
                  type="number"
                  {...register("capacity", { valueAsNumber: true })}
                  className={`w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all ${errors.capacity ? "border-red-500" : "border-gray-200"}`}
                />
                {errors.capacity && (
                  <p className="text-xs text-red-500">
                    {errors.capacity.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Timezone
                </label>
                <input
                  {...register("timezone")}
                  className={`w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all ${errors.timezone ? "border-red-500" : "border-gray-200"}`}
                  placeholder="e.g., America/New_York"
                />
                {errors.timezone && (
                  <p className="text-xs text-red-500">
                    {errors.timezone.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className={`w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none ${errors.description ? "border-red-500" : "border-gray-200"}`}
                />
                {errors.description && (
                  <p className="text-xs text-red-500">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tighter border-b pb-1">
                  Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs text-gray-500 font-bold uppercase">
                      Street
                    </label>
                    <input
                      {...register("address.street")}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold uppercase">
                      City
                    </label>
                    <input
                      {...register("address.city")}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold uppercase">
                      State
                    </label>
                    <input
                      {...register("address.state")}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold uppercase">
                      Zip Code
                    </label>
                    <input
                      {...register("address.zipCode")}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold uppercase">
                      Country
                    </label>
                    <input
                      {...register("address.country")}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tighter border-b pb-1">
                  Location Coordinates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold uppercase">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      {...register("location.coordinates.0", {
                        valueAsNumber: true,
                      })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="e.g., -122.4194"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold uppercase">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      {...register("location.coordinates.1", {
                        valueAsNumber: true,
                      })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="e.g., 37.7749"
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-white transition-all shadow-sm font-medium"
          >
            Cancel
          </button>
          <button
            form="shelter-form"
            type="submit"
            disabled={isLoading}
            className="px-8 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 font-medium flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {shelter ? "Update Shelter" : "Create Shelter"}
          </button>
        </div>
      </div>
    </div>
  );
}
