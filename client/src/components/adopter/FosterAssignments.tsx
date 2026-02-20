import { Link } from "react-router-dom";
import { Heart, Clock } from "lucide-react";
import { FosterAssignment, Pet } from "../../types";
interface FosterAssignmentsProps {
    assignments: FosterAssignment[];
}
export default function FosterAssignments({ assignments, }: FosterAssignmentsProps) {
    if (assignments.length === 0)
        return null;
    return (<div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <Heart className="w-5 h-5 text-primary-600 fill-current"/>
        My Foster Pets
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {assignments.map((assignment: FosterAssignment) => {
            const pet = assignment.petId as Pet;
            return (<div key={assignment._id} className="bg-white rounded-xl shadow-md overflow-hidden border border-primary-100">
              <div className="aspect-[4/3] relative">
                <img src={pet.photos?.[0] ||
                    "https://images.unsplash.com/photo-1543466835-00a7907e9de1"} alt={pet.name} className="w-full h-full object-cover"/>
                <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded shadow-sm">
                  ACTIVE FOSTER
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    {pet.name}
                  </h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {pet.breed}
                  </span>
                </div>

                <div className="text-sm text-gray-600 space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-500"/>
                    <span>
                      Started:{" "}
                      {new Date(assignment.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-500"/>
                    <span>Duration: {assignment.expectedDuration} days</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <Link to={`/pets/${pet._id}`} className="block w-full text-center py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors font-medium text-sm">
                    View Details
                  </Link>
                </div>
              </div>
            </div>);
        })}
      </div>
    </div>);
}
