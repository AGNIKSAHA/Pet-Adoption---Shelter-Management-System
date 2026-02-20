import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { PawPrint, Loader2 } from "lucide-react";
import api from "../../lib/api";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
const registerSchema = z
    .object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    email: z.string().email("Invalid email address"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and number"),
    confirmPassword: z.string(),
    roles: z
        .array(z.enum(["adopter", "shelter_staff", "admin"]))
        .min(1, "Please select at least one role"),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
type RegisterForm = z.infer<typeof registerSchema>;
export default function Register() {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors }, } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            roles: ["adopter"],
        },
    });
    const onSubmit = async (data: RegisterForm) => {
        setIsLoading(true);
        try {
            const { confirmPassword, ...registerData } = data;
            await api.post("/auth/register", registerData);
            toast.success("Account created successfully! Please check your email to verify.");
            navigate("/login");
        }
        catch (error: unknown) {
            if (error instanceof AxiosError) {
                const axiosError = error as AxiosError<{
                    message: string;
                    errors?: {
                        msg?: string;
                        message?: string;
                    }[];
                }>;
                if (axiosError.response?.data?.errors &&
                    Array.isArray(axiosError.response.data.errors)) {
                    axiosError.response.data.errors.forEach((err) => {
                        toast.error(err.message || err.msg || "Validation error");
                    });
                }
                else {
                    toast.error(axiosError.response?.data?.message || "Registration failed");
                }
            }
            else {
                toast.error("An unexpected error occurred");
            }
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center gap-2 text-primary-600">
          <PawPrint className="w-10 h-10"/>
          <span className="text-3xl font-bold">PetAdopt</span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{" "}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <div className="mt-1">
                  <input id="firstName" type="text" autoComplete="given-name" className={`appearance-none block w-full px-3 py-2 border ${errors.firstName ? "border-red-300" : "border-gray-300"} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`} {...register("firstName")}/>
                  {errors.firstName && (<p className="mt-2 text-sm text-red-600">
                      {errors.firstName.message}
                    </p>)}
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <div className="mt-1">
                  <input id="lastName" type="text" autoComplete="family-name" className={`appearance-none block w-full px-3 py-2 border ${errors.lastName ? "border-red-300" : "border-gray-300"} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`} {...register("lastName")}/>
                  {errors.lastName && (<p className="mt-2 text-sm text-red-600">
                      {errors.lastName.message}
                    </p>)}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input id="email" type="email" autoComplete="email" className={`appearance-none block w-full px-3 py-2 border ${errors.email ? "border-red-300" : "border-gray-300"} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`} {...register("email")}/>
                {errors.email && (<p className="mt-2 text-sm text-red-600">
                    {errors.email.message}
                  </p>)}
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700">
                I want to apply as
              </span>
              <div className="mt-2 space-y-2">
                <div className="flex items-center">
                  <input id="role-adopter" type="checkbox" value="adopter" className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" {...register("roles")}/>
                  <label htmlFor="role-adopter" className="ml-2 block text-sm text-gray-900">
                    Pet Adopter
                  </label>
                </div>
                <div className="flex items-center">
                  <input id="role-staff" type="checkbox" value="shelter_staff" className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" {...register("roles")}/>
                  <label htmlFor="role-staff" className="ml-2 block text-sm text-gray-900">
                    Shelter Staff
                  </label>
                </div>
                <div className="flex items-center">
                  <input id="role-admin" type="checkbox" value="admin" className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" {...register("roles")}/>
                  <label htmlFor="role-admin" className="ml-2 block text-sm text-gray-900">
                    Admin
                  </label>
                </div>
              </div>
              {errors.roles && (<p className="mt-2 text-sm text-red-600">
                  {errors.roles.message}
                </p>)}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input id="password" type="password" autoComplete="new-password" className={`appearance-none block w-full px-3 py-2 border ${errors.password ? "border-red-300" : "border-gray-300"} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`} {...register("password")}/>
                {errors.password && (<p className="mt-2 text-sm text-red-600">
                    {errors.password.message}
                  </p>)}
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1">
                <input id="confirmPassword" type="password" autoComplete="new-password" className={`appearance-none block w-full px-3 py-2 border ${errors.confirmPassword
            ? "border-red-300"
            : "border-gray-300"} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`} {...register("confirmPassword")}/>
                {errors.confirmPassword && (<p className="mt-2 text-sm text-red-600">
                    {errors.confirmPassword.message}
                  </p>)}
              </div>
            </div>

            <div>
              <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? (<Loader2 className="w-5 h-5 animate-spin"/>) : ("Create Account")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>);
}
