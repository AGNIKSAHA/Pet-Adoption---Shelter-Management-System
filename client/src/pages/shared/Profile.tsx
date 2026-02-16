import { useState } from "react";
import { useAppSelector, useAppDispatch } from "../../store/store";
import { setUser } from "../../store/slices/authSlice";
import {
  Mail,
  Shield,
  Phone,
  MapPin,
  Edit2,
  Save,
  X,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "../../lib/api";
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shelter } from "../../types";
import { AxiosError } from "axios";

const profileSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  phone: z.string().optional(),
  address: z
    .object({
      street: z.string().default(""),
      city: z.string().default(""),
      state: z.string().default(""),
      zipCode: z.string().default(""),
      country: z.string().default(""),
    })
    .optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch shelters
  const { data: shelters } = useQuery({
    queryKey: ["shelters"],
    queryFn: async () => {
      const response = await api.get("/shelters");
      return response.data.data;
    },
  });

  const applyMutation = useMutation({
    mutationFn: (shelterId: string) =>
      api.post("/shelters/apply", { shelterId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-requests"] });
      // Refresh user data (for applications)
      api.get("/auth/me").then((res) => {
        dispatch(setUser(res.data.data.user));
      });
      toast.success("Application submitted successfully!");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(
        error.response?.data?.message || "Failed to submit application",
      );
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
      address: {
        street: user?.address?.street || "",
        city: user?.address?.city || "",
        state: user?.address?.state || "",
        zipCode: user?.address?.zipCode || "",
        country: user?.address?.country || "",
      },
    },
  });

  if (!user) return null;

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    try {
      const response = await api.patch("/users/profile", data);
      dispatch(setUser(response.data.data.user));
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        toast.error(
          error.response?.data?.message || "Failed to update profile",
        );
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  const getApplicationStatus = (shelterId: string) => {
    return user.staffApplications?.find((app) => {
      if (!app.shelterId) return false;
      const id =
        typeof app.shelterId === "string" ? app.shelterId : app.shelterId._id;
      return id === shelterId;
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Personal Information
          </h2>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
            {user.role.replace("_", " ")}
          </span>
        </div>

        <div className="p-6 space-y-8">
          <div className="flex items-center space-x-4 pb-6 border-b border-gray-100">
            <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-2xl font-bold">
              {user.firstName[0]}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-gray-500">
                Member since{" "}
                {new Date(
                  user.id
                    ? parseInt(user.id.substring(0, 8), 16) * 1000
                    : Date.now(),
                ).getFullYear()}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Fields */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500">
                  First Name
                </label>
                {isEditing ? (
                  <input
                    {...register("firstName")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{user.firstName}</p>
                )}
                {errors.firstName && (
                  <p className="text-xs text-red-500">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500">
                  Last Name
                </label>
                {isEditing ? (
                  <input
                    {...register("lastName")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{user.lastName}</p>
                )}
                {errors.lastName && (
                  <p className="text-xs text-red-500">
                    {errors.lastName.message}
                  </p>
                )}
              </div>

              {/* Email (Read-only) */}
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg md:col-span-2">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Email Address
                  </p>
                  <p className="text-gray-900">{user.email}</p>
                </div>
              </div>

              {/* Phone */}
              <div
                className={`flex items-center space-x-3 p-4 ${isEditing ? "bg-white border ring-1 ring-gray-200" : "bg-gray-50"} rounded-lg transition-all`}
              >
                <Phone className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">
                    Phone Number
                  </p>
                  {isEditing ? (
                    <input
                      {...register("phone")}
                      placeholder="Enter phone number"
                      className="w-full mt-1 px-0 py-0 border-none focus:ring-0 text-gray-900"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {user.phone || "Not provided"}
                    </p>
                  )}
                </div>
              </div>

              {/* Account Role */}
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <Shield className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Account Role
                  </p>
                  <p className="text-gray-900 capitalize">
                    {user.role.replace("_", " ")}
                  </p>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div
              className={`p-4 ${isEditing ? "bg-white border ring-1 ring-gray-200" : "bg-gray-50"} rounded-lg space-y-4`}
            >
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <p className="text-sm font-medium text-gray-500">
                  Address Information
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                    Street
                  </label>
                  {isEditing ? (
                    <input
                      {...register("address.street")}
                      className="w-full text-sm border-b border-gray-200 focus:border-primary-500 outline-none pb-1"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {user.address?.street || "No street information"}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                    City
                  </label>
                  {isEditing ? (
                    <input
                      {...register("address.city")}
                      className="w-full text-sm border-b border-gray-200 focus:border-primary-500 outline-none pb-1"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {user.address?.city || "No city information"}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                    State / Zip
                  </label>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input
                        {...register("address.state")}
                        placeholder="State"
                        className="w-1/2 text-sm border-b border-gray-200 focus:border-primary-500 outline-none pb-1"
                      />
                      <input
                        {...register("address.zipCode")}
                        placeholder="Zip"
                        className="w-1/2 text-sm border-b border-gray-200 focus:border-primary-500 outline-none pb-1"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900">
                      {user.address?.state
                        ? `${user.address.state}, ${user.address.zipCode}`
                        : "No state/zip information"}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                    Country
                  </label>
                  {isEditing ? (
                    <input
                      {...register("address.country")}
                      className="w-full text-sm border-b border-gray-200 focus:border-primary-500 outline-none pb-1"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {user.address?.country || "No country information"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Shelter Applications Panel for Shelter Staff */}
      {user.role === "shelter_staff" && (
        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-600" />
              Shelter Applications
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {shelters?.map((shelter: Shelter) => {
                const app = getApplicationStatus(shelter._id);
                return (
                  <div
                    key={shelter._id}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">
                          {shelter.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {shelter.address.city}, {shelter.address.state}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {app ? (
                        <span
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            app.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : app.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {app.status === "approved" && (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          {app.status === "rejected" && (
                            <XCircle className="w-3 h-3" />
                          )}
                          {app.status === "pending" && (
                            <Clock className="w-3 h-3" />
                          )}
                          {app.status}
                        </span>
                      ) : (
                        <button
                          onClick={() => applyMutation.mutate(shelter._id)}
                          disabled={applyMutation.isPending}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                          {applyMutation.isPending
                            ? "Applying..."
                            : "Apply to Shelter"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
