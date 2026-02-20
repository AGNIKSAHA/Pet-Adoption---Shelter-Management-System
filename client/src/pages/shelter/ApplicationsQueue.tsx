import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, XCircle, Clock, ChevronLeft, ChevronRight, MessageSquare, } from "lucide-react";
import api from "../../lib/api";
import toast from "react-hot-toast";
import { AdoptionApplication } from "../../types";
import { AxiosError } from "axios";
import { useAppSelector } from "../../store/store";
import { PawPrint } from "lucide-react";
type ApplicationConflictDetails = {
    code: "APPLICATION_VERSION_CONFLICT";
    currentApplication?: AdoptionApplication;
};
type ApiErrorResponse = {
    message: string;
    details?: ApplicationConflictDetails;
};
export default function ApplicationsQueue() {
    const queryClient = useQueryClient();
    const { user, activeShelterId } = useAppSelector((state) => state.auth);
    const extractId = (val: string | {
        _id?: string;
        id?: string;
    } | null | undefined): string | undefined => {
        if (!val || val === "null")
            return undefined;
        if (typeof val === "string")
            return val;
        return val._id || val.id;
    };
    const allApproved = user?.memberships?.map((m) => {
        const shelterName = typeof m.shelterId === "object" ? m.shelterId.name : "Primary Shelter";
        return {
            id: extractId(m.shelterId),
            name: shelterName,
        };
    }) || [];
    const normalizedActiveShelterId = extractId(activeShelterId as string | undefined | null);
    const currentShelterName = allApproved.find((s) => s.id === normalizedActiveShelterId)?.name ||
        "Shelter";
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedApp, setSelectedApp] = useState<AdoptionApplication | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [conflictInfo, setConflictInfo] = useState<{
        attemptedStatus: string;
        latest?: AdoptionApplication;
    } | null>(null);
    const { data, isLoading } = useQuery({
        queryKey: ["applications", page, statusFilter, normalizedActiveShelterId],
        queryFn: async () => {
            const response = await api.get("/applications", {
                params: {
                    page,
                    limit: 10,
                    status: statusFilter !== "all" ? statusFilter : undefined,
                    shelterId: normalizedActiveShelterId,
                },
            });
            return response.data;
        },
        enabled: !!normalizedActiveShelterId || user?.role === "admin",
    });
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status, notes, expectedVersion, }: {
            id: string;
            status: string;
            notes?: string;
            expectedVersion?: number;
        }) => api.patch(`/applications/${id}/status`, {
            status,
            notes,
            expectedVersion,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["applications"] });
            toast.success("Application status updated");
            setConflictInfo(null);
            setIsModalOpen(false);
        },
        onError: (error: AxiosError<ApiErrorResponse>, variables: {
            id: string;
            status: string;
            notes?: string;
            expectedVersion?: number;
        }) => {
            const details = error.response?.data?.details;
            if (error.response?.status === 409 &&
                details?.code === "APPLICATION_VERSION_CONFLICT") {
                const latest = details.currentApplication;
                setConflictInfo({
                    attemptedStatus: variables.status,
                    latest,
                });
                if (latest) {
                    setSelectedApp(latest);
                }
                toast.error("Merge conflict detected. Review latest changes and retry.");
                return;
            }
            toast.error(error.response?.data?.message || "Failed to update status");
        },
    });
    const getStatusColor = (status: string) => {
        switch (status) {
            case "approved":
                return "bg-green-100 text-green-800 border-green-200";
            case "rejected":
                return "bg-red-100 text-red-800 border-red-200";
            case "submitted":
                return "bg-blue-100 text-blue-800 border-blue-200";
            case "reviewing":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "interview":
                return "bg-purple-100 text-purple-800 border-purple-200";
            case "withdrawn":
                return "bg-gray-100 text-gray-800 border-gray-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };
    const applications = data?.data?.applications || [];
    const totalPages = data?.data?.pagination?.pages || 1;
    const handleViewDetails = async (id: string) => {
        try {
            const response = await api.get(`/applications/${id}`);
            setSelectedApp(response.data.data.application);
            setConflictInfo(null);
            setIsModalOpen(true);
        }
        catch (error) {
            toast.error("Failed to load application details");
        }
    };
    const submitStatusUpdate = (status: string) => {
        if (!selectedApp)
            return;
        updateStatusMutation.mutate({
            id: selectedApp._id,
            status,
            expectedVersion: selectedApp.__v,
        });
    };
    return (<div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Applications Queue
          </h1>
          {normalizedActiveShelterId ? (<p className="text-sm font-semibold text-primary-600">
              Managing: {currentShelterName}
            </p>) : (<p className="text-gray-500">
              Review and manage adoption requests.
            </p>)}
        </div>
      </div>

      
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            "all",
            "submitted",
            "reviewing",
            "interview",
            "approved",
            "rejected",
        ].map((s) => (<button key={s} onClick={() => {
                setStatusFilter(s);
                setPage(1);
            }} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${statusFilter === s
                ? "bg-primary-600 text-white"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
              {s}
            </button>))}
        </div>
      </div>

      
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">
                  Pet
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">
                  Adopter
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">
                  Submitted
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (<tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin"/>
                    </div>
                  </td>
                </tr>) : applications.length === 0 ? (<tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No applications found matching the criteria.
                  </td>
                </tr>) : (applications.map((app: AdoptionApplication) => (<tr key={app._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {app.petId.photos?.[0] ? (<img src={app.petId.photos[0]} alt={app.petId.name} className="w-full h-full object-cover"/>) : (<div className="w-full h-full flex items-center justify-center text-gray-400">
                              <PawPrint className="w-5 h-5"/>
                            </div>)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {app.petId.name}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {app.petId.species}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {app.adopterId.firstName} {app.adopterId.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {app.adopterId.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(app.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleViewDetails(app._id)} className="p-2 hover:bg-white rounded-lg transition-colors text-primary-600 hover:text-primary-700 hover:shadow-sm border border-transparent hover:border-gray-200" title="View Details">
                        <Eye className="w-5 h-5"/>
                      </button>
                    </td>
                  </tr>)))}
            </tbody>
          </table>
        </div>

        
        {totalPages > 1 && (<div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
                <ChevronLeft className="w-5 h-5"/>
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
                <ChevronRight className="w-5 h-5"/>
              </button>
            </div>
          </div>)}
      </div>

      
      {isModalOpen && selectedApp && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Application Details
                </h2>
                <p className="text-sm text-gray-500">
                  Reviewing request for {selectedApp.petId.name}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <XCircle className="w-6 h-6 text-gray-400"/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary-600 rounded-full"/>
                  Applicant Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">
                      Full Name
                    </label>
                    <p className="text-gray-900 font-medium">
                      {selectedApp.adopterId.firstName}{" "}
                      {selectedApp.adopterId.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">
                      Email Address
                    </label>
                    <p className="text-gray-900 font-medium">
                      {selectedApp.adopterId.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">
                      Phone Number
                    </label>
                    <p className="text-gray-900 font-medium">
                      {selectedApp.adopterId.phone}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">
                      Housing Type
                    </label>
                    <p className="text-gray-900 font-medium capitalize">
                      {selectedApp.questionnaire.housingType}
                    </p>
                  </div>
                </div>
              </section>

              
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary-600 rounded-full"/>
                  Questionnaire Responses
                </h3>
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Has owned pets before?
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedApp.questionnaire.hasOwnedPetsBefore
                ? "Yes"
                : "No"}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Current pets in household:
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedApp.questionnaire.currentPets || "None"}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Why do they want to adopt?
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedApp.questionnaire.whyAdopt}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Work schedule / Time for pet:
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedApp.questionnaire.workSchedule}
                    </p>
                  </div>
                </div>
              </section>

              
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary-600 rounded-full"/>
                  References
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedApp.references.map((ref, idx: number) => (<div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="font-bold text-gray-900">{ref.name}</p>
                      <p className="text-xs text-gray-500 mb-2">
                        {ref.relationship}
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4"/>
                          {ref.phone}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MessageSquare className="w-4 h-4"/>
                          {ref.email}
                        </div>
                      </div>
                    </div>))}
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-gray-100 flex flex-wrap gap-3 bg-gray-50">
              {conflictInfo && (<div className="w-full mb-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-semibold">Merge conflict</p>
                  <p>
                    Another staff member updated this application.
                    {conflictInfo.latest?.status
                    ? ` Latest status: ${conflictInfo.latest.status}.`
                    : ""}{" "}
                    Your attempted change: {conflictInfo.attemptedStatus}.
                  </p>
                </div>)}
              <button onClick={() => submitStatusUpdate("reviewing")} disabled={selectedApp.status === "reviewing" ||
                updateStatusMutation.isPending} className="btn bg-yellow-500 text-white hover:bg-yellow-600 flex-1">
                Mark as Reviewing
              </button>
              <button onClick={() => submitStatusUpdate("interview")} disabled={selectedApp.status === "interview" ||
                updateStatusMutation.isPending} className="btn bg-purple-600 text-white hover:bg-purple-700 flex-1">
                Schedule Interview
              </button>
              <button onClick={() => submitStatusUpdate("approved")} disabled={selectedApp.status === "approved" ||
                updateStatusMutation.isPending} className="btn bg-green-600 text-white hover:bg-green-700 flex-1">
                Approve
              </button>
              <button onClick={() => submitStatusUpdate("rejected")} disabled={selectedApp.status === "rejected" ||
                updateStatusMutation.isPending} className="btn bg-red-600 text-white hover:bg-red-700 flex-1">
                Reject
              </button>
            </div>
          </div>
        </div>)}
    </div>);
}
