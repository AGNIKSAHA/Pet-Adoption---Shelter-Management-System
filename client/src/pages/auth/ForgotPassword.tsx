import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PawPrint, Loader2, ArrowLeft, Mail } from "lucide-react";
import api from "../../lib/api";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
export default function ForgotPassword() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const { register, handleSubmit, formState: { errors }, } = useForm<ForgotPasswordForm>({
        resolver: zodResolver(forgotPasswordSchema),
    });
    const onSubmit = async (data: ForgotPasswordForm) => {
        setIsLoading(true);
        try {
            await api.post("/auth/forgot-password", data);
            setIsSuccess(true);
            toast.success("Password reset email sent!");
        }
        catch (error: unknown) {
            if (error instanceof AxiosError) {
                toast.error((error as AxiosError<{
                    message: string;
                }>).response?.data?.message ||
                    "Something went wrong.");
            }
            else {
                toast.error("An unexpected error occurred");
            }
        }
        finally {
            setIsLoading(false);
        }
    };
    if (isSuccess) {
        return (<div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <Mail className="h-6 w-6 text-green-600"/>
            </div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Check your email
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                We sent a password reset link to your email address. Please
                follow the instructions to reset your password.
              </p>
            </div>
            <div className="mt-6">
              <Link to="/login" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center gap-2 text-primary-600">
          <PawPrint className="w-10 h-10"/>
          <span className="text-3xl font-bold">PetAdopt</span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
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
              <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? (<Loader2 className="w-5 h-5 animate-spin"/>) : ("Send Reset Link")}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-500">
              <ArrowLeft className="w-4 h-4"/>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>);
}
