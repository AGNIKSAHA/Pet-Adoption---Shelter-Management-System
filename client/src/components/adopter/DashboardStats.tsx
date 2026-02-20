import { FileText, Heart, CheckCircle } from "lucide-react";
interface DashboardStatsProps {
    stats: {
        totalApplications: number;
        pendingReview: number;
        approvedApplications: number;
    };
}
export default function DashboardStats({ stats }: DashboardStatsProps) {
    return (<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="w-6 h-6"/>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">
              Active Applications
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalApplications || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <Heart className="w-6 h-6"/>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Pending Review</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.pendingReview || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <CheckCircle className="w-6 h-6"/>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Adoptions</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.approvedApplications || 0}
            </p>
          </div>
        </div>
      </div>
    </div>);
}
