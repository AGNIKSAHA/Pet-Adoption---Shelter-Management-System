import { Mail, Shield, Phone, MapPin } from "lucide-react";
import { User } from "../../../../types";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { ProfileForm } from "../../Profile";

interface PersonalInfoFormProps {
  user: User;
  activeRole: string;
  isEditing: boolean;
  register: UseFormRegister<ProfileForm>;
  errors: FieldErrors<ProfileForm>;
  onSubmit: (e: React.FormEvent) => void;
}

export default function PersonalInfoForm({
  user,
  activeRole,
  isEditing,
  register,
  errors,
  onSubmit,
}: PersonalInfoFormProps) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">
          Personal Information
        </h2>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
          {activeRole.replace("_", " ")}
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
                  : user._id
                    ? parseInt(user._id.substring(0, 8), 16) * 1000
                    : Date.now(),
              ).getFullYear()}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  {errors.firstName.message as string}
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
                  {errors.lastName.message as string}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg md:col-span-2">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Email Address
                </p>
                <p className="text-gray-900">{user.email}</p>
              </div>
            </div>

            {activeRole !== "admin" && (
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
            )}

            <div
              className={`p-4 ${isEditing ? "bg-white border ring-1 ring-gray-200" : "bg-gray-50"} rounded-lg`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <Shield className="w-5 h-5 text-gray-400" />
                <p className="text-sm font-medium text-gray-500">
                  Account Roles
                </p>
              </div>
              <div className="ml-8">
                {isEditing ? (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center">
                      <input
                        id="role-adopter-edit"
                        type="checkbox"
                        value="adopter"
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        {...register("roles")}
                      />
                      <label
                        htmlFor="role-adopter-edit"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Pet Adopter
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="role-staff-edit"
                        type="checkbox"
                        value="shelter_staff"
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        {...register("roles")}
                      />
                      <label
                        htmlFor="role-staff-edit"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Shelter Staff
                      </label>
                    </div>
                    {user.role === "admin" && (
                      <div className="flex items-center">
                        <input
                          id="role-admin-edit"
                          type="checkbox"
                          value="admin"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          {...register("roles")}
                        />
                        <label
                          htmlFor="role-admin-edit"
                          className="ml-2 block text-sm text-gray-900"
                        >
                          Admin
                        </label>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-900 capitalize">
                    {(user.roles && user.roles.length > 0
                      ? user.roles
                      : [user.role]
                    )
                      .map((r) => r.replace("_", " "))
                      .join(", ")}
                  </p>
                )}
                {errors.roles && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.roles.message as string}
                  </p>
                )}
              </div>
            </div>
          </div>

          {activeRole === "adopter" && (
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
          )}
        </form>
      </div>
    </div>
  );
}
