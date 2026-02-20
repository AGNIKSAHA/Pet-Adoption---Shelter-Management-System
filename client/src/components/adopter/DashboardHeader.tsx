import { Link } from "react-router-dom";
import { User } from "../../types";
interface DashboardHeaderProps {
    user: User | null;
}
export default function DashboardHeader({ user }: DashboardHeaderProps) {
    return (<div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hello, {user?.firstName}!
        </h1>
        <p className="text-gray-500">
          Here's what's happening with your adoption journey.
        </p>
      </div>
      <Link to="/adopter/foster-apply" className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg border border-primary-100 text-sm font-medium hover:bg-primary-100 transition-colors">
        Apply Foster Parent
      </Link>
    </div>);
}
