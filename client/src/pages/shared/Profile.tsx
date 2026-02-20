import { useState } from "react";
import { useAppSelector, useAppDispatch } from "../../store/store";
import { setUser } from "../../store/slices/authSlice";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "../../lib/api";
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

// Components
import ProfileHeader from "./components/profile/ProfileHeader";
import PersonalInfoForm from "./components/profile/PersonalInfoForm";
import ShelterApplicationsList from "./components/profile/ShelterApplicationsList";

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
  roles: z
    .array(z.enum(["adopter", "shelter_staff", "admin"]))
    .min(1, "Please select at least one role")
    .optional(),
});

export type ProfileForm = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user, activeRole } = useAppSelector((state) => state.auth);
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

  const leaveMutation = useMutation({
    mutationFn: (shelterId: string) => api.delete(`/shelters/leave/${shelterId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-requests"] });
      api.get("/auth/me").then((res) => {
        dispatch(setUser(res.data.data.user));
      });
      toast.success("You left the shelter successfully");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to leave shelter");
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
      roles: (user?.roles as ("adopter" | "shelter_staff" | "admin")[]) || [
        "adopter",
      ],
    },
  });

  if (!user) return null;
  const effectiveRole = activeRole || user.role;

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

  const isCurrentShelterMember = (shelterId: string) => {
    const inMemberships = (user.memberships || []).some((m) => {
      if (!m.shelterId) return false;
      const id =
        typeof m.shelterId === "string" ? m.shelterId : m.shelterId._id;
      return id === shelterId;
    });

    const primaryShelterId = user.shelterId
      ? typeof user.shelterId === "string"
        ? user.shelterId
        : user.shelterId._id
      : null;

    return inMemberships || primaryShelterId === shelterId;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ProfileHeader
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        isLoading={isLoading}
        handleCancel={handleCancel}
        onSubmit={handleSubmit(onSubmit)}
      />

      <PersonalInfoForm
        user={user}
        activeRole={effectiveRole}
        isEditing={isEditing}
        register={register}
        errors={errors}
        onSubmit={handleSubmit(onSubmit)}
      />

      {effectiveRole === "shelter_staff" && (
        <ShelterApplicationsList
          shelters={shelters}
          getApplicationStatus={getApplicationStatus}
          applyMutation={applyMutation}
          leaveMutation={leaveMutation}
          isCurrentShelterMember={isCurrentShelterMember}
        />
      )}
    </div>
  );
}
