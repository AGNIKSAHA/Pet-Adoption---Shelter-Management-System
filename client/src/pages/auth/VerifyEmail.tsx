import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PawPrint, Loader2, CheckCircle, XCircle } from "lucide-react";
import api from "../../lib/api";
import { AxiosError } from "axios";
export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Verifying your email...");
    const processedRef = useRef(false);
    useEffect(() => {
        if (processedRef.current)
            return;
        processedRef.current = true;
        if (!token) {
            setStatus("error");
            setMessage("Invalid or missing verification token.");
            return;
        }
        const verifyToken = async () => {
            try {
                await api.post("/auth/verify-email", { token });
                setStatus("success");
                setMessage("Email verified successfully! You can now log in.");
                setTimeout(() => {
                    navigate("/login");
                }, 3000);
            }
            catch (error: unknown) {
                if (error instanceof AxiosError) {
                    const axiosError = error as AxiosError<{
                        message: string;
                    }>;
                    setStatus("error");
                    setMessage(axiosError.response?.data?.message ||
                        "Verification failed. The link may be expired.");
                }
                else {
                    setStatus("error");
                    setMessage("An unexpected error occurred");
                }
            }
        };
        verifyToken();
    }, [token, navigate]);
    return (<div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center gap-2 text-primary-600">
          <PawPrint className="w-10 h-10"/>
          <span className="text-3xl font-bold">PetAdopt</span>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          <div className="flex justify-center mb-4">
            {status === "loading" && (<Loader2 className="w-12 h-12 text-primary-600 animate-spin"/>)}
            {status === "success" && (<CheckCircle className="w-12 h-12 text-green-500"/>)}
            {status === "error" && (<XCircle className="w-12 h-12 text-red-500"/>)}
          </div>

          <h2 className={`text-xl font-bold mb-2 ${status === "success"
            ? "text-green-700"
            : status === "error"
                ? "text-red-700"
                : "text-gray-900"}`}>
            {status === "loading"
            ? "Verifying..."
            : status === "success"
                ? "Verified!"
                : "Verification Failed"}
          </h2>

          <p className="text-gray-600 mb-6">{message}</p>

          {status === "success" && (<p className="text-sm text-gray-400">
              Redirecting to login in 3 seconds...
            </p>)}

          {status !== "loading" && (<div className="mt-6">
              <Link to="/login" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm">
                Go to Login
              </Link>
            </div>)}
        </div>
      </div>
    </div>);
}
