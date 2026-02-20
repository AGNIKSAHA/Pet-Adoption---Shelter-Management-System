import { Calendar, Clock, LogOut } from "lucide-react";
import { Foster, FosterAssignment, Pet, User } from "../../types";
interface AssignmentsGridProps {
    isLoading: boolean;
    assignments: FosterAssignment[];
    onTakeBack: (assignment: FosterAssignment) => void;
    isTakeBackPending: boolean;
}
export default function AssignmentsGrid({ isLoading, assignments, onTakeBack, isTakeBackPending, }: AssignmentsGridProps) {
    return (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {isLoading ? (<div className="col-span-full flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"/>
        </div>) : assignments.length === 0 ? (<div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">No active foster assignments.</p>
        </div>) : (assignments.map((assignment: FosterAssignment) => (<div key={assignment._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="aspect-[16/9] relative bg-gray-100">
              <img src={(assignment.petId as Pet).photos?.[0] ||
                "https://images.unsplash.com/photo-1543466835-00a7907e9de1"} alt={(assignment.petId as Pet).name} className="w-full h-full object-cover"/>
              <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
                ACTIVE
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {(assignment.petId as Pet)?.name}
                </h3>
                <p className="text-sm text-gray-500">
                  With{" "}
                  {((assignment.fosterId as Foster)?.userId as User)?.firstName}{" "}
                  {((assignment.fosterId as Foster)?.userId as User)?.lastName}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-primary-500"/>
                  Started {new Date(assignment.startDate).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4 text-primary-500"/>
                  {assignment.expectedDuration} days expected
                </div>
              </div>

              <button onClick={() => onTakeBack(assignment)} disabled={isTakeBackPending} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl font-semibold transition-all border border-primary-100">
                <LogOut className="w-4 h-4"/>
                Take Back to Shelter
              </button>
            </div>
          </div>)))}
    </div>);
}
