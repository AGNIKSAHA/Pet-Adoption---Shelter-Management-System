import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, ChevronRight, Clock, CheckCircle, XCircle, FileText, Building2, Home, PawPrint, } from "lucide-react";
import api from "../../lib/api";
import { AdoptionApplication, Shelter, Foster } from "../../types";
export default function MyApplications() {
    const { data: fosterData, isLoading: isFosterLoading } = useQuery({
        queryKey: ["my-foster-shelters-history"],
        queryFn: async () => {
            const response = await api.get("/fosters/my-shelters");
            return response.data;
        },
    });
    const { data, isLoading } = useQuery({
        queryKey: ["my-applications"],
        queryFn: async () => {
            const response = await api.get("/applications", {
                params: { page: 1, limit: 1000 },
            });
            return response.data;
        },
    });
    const applications = data?.data?.applications || [];
    const fosterApplications = (fosterData?.data?.records || []) as Foster[];
    const getStatusConfig = (status: string) => {
        switch (status) {
            case "approved":
                return {
                    color: "bg-green-50 text-green-700 border-green-200",
                    icon: CheckCircle,
                    label: "Approved",
                };
            case "rejected":
                return {
                    color: "bg-red-50 text-red-700 border-red-200",
                    icon: XCircle,
                    label: "Declined",
                };
            case "submitted":
                return {
                    color: "bg-blue-50 text-blue-700 border-blue-200",
                    icon: Clock,
                    label: "Submitted",
                };
            case "reviewing":
                return {
                    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
                    icon: Clock,
                    label: "Under Review",
                };
            case "interview":
                return {
                    color: "bg-purple-50 text-purple-700 border-purple-200",
                    icon: Calendar,
                    label: "Interview Scheduled",
                };
            default:
                return {
                    color: "bg-gray-50 text-gray-700 border-gray-200",
                    icon: Clock,
                    label: status,
                };
        }
    };
    if (isLoading || isFosterLoading) {
        return (<div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"/>
      </div>);
    }
    return (<div className="max-w-5xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-500 mt-1">
            Track the status of your adoption requests.
          </p>
        </div>
        <Link to="/pets" className="btn btn-primary">
          Find More Pets
        </Link>
      </div>

      <div className="space-y-6">
        {fosterApplications.map((fosterApplication: Foster) => (<div key={fosterApplication._id} className="bg-white rounded-xl shadow-sm border-2 border-primary-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-primary-50 px-6 py-2 border-b border-primary-100 flex items-center justify-between">
              <span className="text-xs font-bold text-primary-700 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5"/> Foster Program Application
              </span>
              <span className="text-xs text-primary-500 font-medium">
                Applied on{" "}
                {new Date(fosterApplication.createdAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-48 h-32 md:h-auto relative bg-gray-100 flex items-center justify-center">
                <Building2 className="w-12 h-12 text-primary-200"/>
              </div>

              <div className="flex-1 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {(fosterApplication.shelterId as Shelter)?.name ||
                "Unknown Shelter"}
                    </h3>
                  </div>

                  <div className="flex flex-col gap-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-primary-500"/>
                      {fosterApplication.homeType} • {fosterApplication.capacity}{" "}
                      pets capacity
                    </div>
                    <div className="flex items-center gap-2">
                      <PawPrint className="w-4 h-4 text-primary-500"/>
                      Interested in:{" "}
                      {fosterApplication.preferredSpecies?.length > 0
                ? fosterApplication.preferredSpecies.join(", ")
                : "Any animal"}
                    </div>
                    <p className="line-clamp-1 max-w-md">
                      Experience: {fosterApplication.experience}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${getStatusConfig(fosterApplication.status).color} font-medium text-sm capitalize`}>
                    {(() => {
                const Config = getStatusConfig(fosterApplication.status);
                const Icon = Config.icon;
                return (<>
                          <Icon className="w-4 h-4"/>
                          {Config.label}
                        </>);
            })()}
                  </div>
                  {fosterApplication.status === "approved" && (<Link to="/adopter/dashboard" className="text-primary-600 font-medium hover:text-primary-700 text-sm">
                      Go to Foster Dashboard →
                    </Link>)}
                </div>
              </div>
            </div>
          </div>))}

        {applications.map((application: AdoptionApplication) => {
            const statusConfig = getStatusConfig(application.status);
            const StatusIcon = statusConfig.icon;
            const pet = application.petId;
            return (<div key={application._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-48 h-32 md:h-auto relative bg-gray-100">
                  {pet?.photos?.[0] ? (<img src={pet.photos[0]} alt={pet.name} className="w-full h-full object-cover"/>) : (<div className="w-full h-full flex items-center justify-center text-gray-400">
                      <FileText className="w-8 h-8"/>
                    </div>)}
                </div>

                <div className="flex-1 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {pet?.name || "Unknown Pet"}
                      </h3>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">
                        {pet?.breed || "Unknown Breed"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4"/>
                        {(application.shelterId as Shelter)?.name ||
                    "Unknown Shelter"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4"/>
                        Submitted on{" "}
                        {new Date(application.submittedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${statusConfig.color} font-medium text-sm capitalize`}>
                      <StatusIcon className="w-4 h-4"/>
                      {statusConfig.label}
                    </div>

                    <Link to={`/pets/${pet?._id}`} className="flex items-center gap-1 text-primary-600 font-medium hover:text-primary-700 text-sm">
                      View Pet Details <ChevronRight className="w-4 h-4"/>
                    </Link>
                  </div>
                </div>
              </div>
            </div>);
        })}

        {applications.length === 0 && fosterApplications.length === 0 && (<div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
              <FileText className="w-8 h-8"/>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No applications yet
            </h3>
            <p className="text-gray-500 mb-6">
              You haven't applied for any pets yet.
            </p>
            <Link to="/pets" className="btn btn-primary">
              Browse Available Pets
            </Link>
          </div>)}
      </div>
    </div>);
}
