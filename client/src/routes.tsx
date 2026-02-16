import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "./store/store";
import { User } from "./types";

// Layouts
import PublicLayout from "./layouts/PublicLayout";
import DashboardLayout from "./layouts/DashboardLayout";

// Public Pages
import Home from "./pages/public/Home";
import BrowsePets from "./pages/public/BrowsePets";
import PetDetail from "./pages/public/PetDetail";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyEmail from "./pages/auth/VerifyEmail";

// Protected Pages
import AdopterDashboard from "./pages/adopter/Dashboard";
import Favorites from "./pages/adopter/Favorites";
import MyApplications from "./pages/adopter/MyApplications";
import ApplyForPet from "./pages/adopter/ApplyForPet";
import FosterApply from "./pages/adopter/FosterApply";

// Shelter Staff Pages
import ShelterDashboard from "./pages/shelter/Dashboard";
import PetManagement from "./pages/shelter/PetManagement";
import ApplicationsQueue from "./pages/shelter/ApplicationsQueue";
import FosterBoard from "./pages/shelter/FosterBoard";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import ShelterManagement from "./pages/admin/ShelterManagement";
import UserManagement from "./pages/admin/UserManagement";
import ShelterRequests from "./pages/admin/ShelterRequests";

// Shared Pages
import Messages from "./pages/shared/Messages";
import Profile from "./pages/shared/Profile";
import ShelterGuard from "./components/ShelterGuard";

/**
 * GuestGuard: Redirects authenticated users away from public-only pages (like Login)
 */
const GuestGuard = () => {
  const { isAuthenticated, user, loading } = useAppSelector(
    (state) => state.auth,
  );

  if (loading) return <LoadingSpinner />;

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardRoute(user)} replace />;
  }

  return <Outlet />;
};

/**
 * AuthGuard: Ensures user is authenticated
 */
const AuthGuard = () => {
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);

  if (loading) return <LoadingSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

/**
 * RoleGuard: Ensures authenticated user has specific roles
 */
const RoleGuard = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const { user, loading } = useAppSelector((state) => state.auth);

  if (loading) return <LoadingSpinner />;

  if (!user || !allowedRoles.includes(user.role)) {
    // If not authorized, send back to their own dashboard or home
    return <Navigate to={user ? getDashboardRoute(user) : "/login"} replace />;
  }

  return <Outlet />;
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
);

const getDashboardRoute = (user: User) => {
  switch (user.role) {
    case "admin":
      return "/admin/dashboard";
    case "shelter_staff":
      return "/shelter/dashboard";
    case "adopter":
      return "/adopter/dashboard";
    default:
      return "/";
  }
};

const DashboardRedirect = () => {
  const { user } = useAppSelector((state) => state.auth);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardRoute(user)} replace />;
};

export const router = createBrowserRouter([
  // Public Routes
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/pets", element: <BrowsePets /> },
      { path: "/pets/:id", element: <PetDetail /> },

      // Guest-only routes
      {
        element: <GuestGuard />,
        children: [
          { path: "/login", element: <Login /> },
          { path: "/register", element: <Register /> },
          { path: "/forgot-password", element: <ForgotPassword /> },
          { path: "/reset-password", element: <ResetPassword /> },
          { path: "/verify-email", element: <VerifyEmail /> },
        ],
      },
    ],
  },

  // Protected Routes
  {
    element: <AuthGuard />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardRedirect />,
      },
      {
        element: <DashboardLayout />,
        children: [
          // Adopter-only routes
          {
            path: "/adopter",
            element: <RoleGuard allowedRoles={["adopter"]} />,
            children: [
              { path: "dashboard", element: <AdopterDashboard /> },
              { path: "pets", element: <BrowsePets /> },
              { path: "favorites", element: <Favorites /> },
              { path: "applications", element: <MyApplications /> },
              { path: "apply/:petId", element: <ApplyForPet /> },
              { path: "foster-apply", element: <FosterApply /> },
            ],
          },

          {
            path: "/shelter",
            element: <RoleGuard allowedRoles={["shelter_staff", "admin"]} />,
            children: [
              {
                element: (
                  <ShelterGuard>
                    <Outlet />
                  </ShelterGuard>
                ),
                children: [
                  { path: "dashboard", element: <ShelterDashboard /> },
                  { path: "pets", element: <PetManagement /> },
                  { path: "applications", element: <ApplicationsQueue /> },
                  { path: "fosters", element: <FosterBoard /> },
                ],
              },
            ],
          },

          // Admin-only routes
          {
            path: "/admin",
            element: <RoleGuard allowedRoles={["admin"]} />,
            children: [
              { path: "dashboard", element: <AdminDashboard /> },
              { path: "shelters", element: <ShelterManagement /> },
              { path: "users", element: <UserManagement /> },
              { path: "shelter-requests", element: <ShelterRequests /> },
            ],
          },

          // Shared Protected Routes
          { path: "/messages", element: <Messages /> },
          { path: "/profile", element: <Profile /> },
        ],
      },
    ],
  },

  // 404
  {
    path: "*",
    element: (
      <div className="p-12 text-center h-screen flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-500 mb-8">Page not found</p>
        <Navigate to="/" />
      </div>
    ),
  },
]);
