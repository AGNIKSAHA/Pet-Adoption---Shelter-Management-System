import { Link } from "react-router-dom";
import { AdoptionApplication, Pet, Shelter } from "../../types";
import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
interface RecentApplicationsProps {
    applications: AdoptionApplication[];
}
const getStatusColor = (status: string) => {
    switch (status) {
        case "approved":
            return "bg-green-50 text-green-700 border-green-200";
        case "pending":
            return "bg-yellow-50 text-yellow-700 border-yellow-200";
        case "rejected":
            return "bg-red-50 text-red-700 border-red-200";
        default:
            return "bg-gray-50 text-gray-700 border-gray-200";
    }
};
const getStatusIcon = (status: string) => {
    switch (status) {
        case "approved":
            return <CheckCircle className="w-4 h-4"/>;
        case "pending":
            return <Clock className="w-4 h-4"/>;
        case "rejected":
            return <XCircle className="w-4 h-4"/>;
        default:
            return <AlertCircle className="w-4 h-4"/>;
    }
};
export default function RecentApplications({ applications, }: RecentApplicationsProps) {
    return (<div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Recent Applications</h2>
        <Link to="/adopter/applications" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
          View All
        </Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {applications.map((app: AdoptionApplication) => (<div key={app._id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">
                Application for {(app.petId as Pet)?.name}
              </p>
              <p className="text-sm text-gray-500">
                {(app.shelterId as Shelter)?.name}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Submitted on {new Date(app.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium capitalize border ${getStatusColor(app.status)}`}>
              {getStatusIcon(app.status)}
              {app.status}
            </div>
          </div>))}
        {applications.length === 0 && (<div className="p-8 text-center text-gray-500">
            No recent applications found.
          </div>)}
      </div>
    </div>);
}
