import { LogOut, XCircle } from "lucide-react";
import { FosterAssignment, Pet } from "../../types";
interface TakeBackModalProps {
    assignment: FosterAssignment | null;
    onClose: () => void;
    onSubmit: (data: {
        returnStatus: string;
        notes: string;
    }) => void;
    isPending: boolean;
    returnStatus: string;
    setReturnStatus: (status: string) => void;
    returnNotes: string;
    setReturnNotes: (notes: string) => void;
}
export default function TakeBackModal({ assignment, onClose, onSubmit, isPending, returnStatus, setReturnStatus, returnNotes, setReturnNotes, }: TakeBackModalProps) {
    if (!assignment)
        return null;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-primary-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <LogOut className="w-5 h-5 text-primary-600"/>
            Return to Shelter
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors" disabled={isPending}>
            <XCircle className="w-6 h-6 text-gray-400"/>
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
              <img src={(assignment.petId as Pet).photos?.[0] ||
            "/placeholder-pet.png"} className="w-full h-full object-cover" alt="Pet"/>
            </div>
            <div>
              <p className="font-bold text-gray-900">
                Returning {(assignment.petId as Pet).name}
              </p>
              <p className="text-sm text-gray-500">
                {(assignment.petId as Pet).breed}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Update Pet Status
              </label>
              <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 outline-none text-gray-700" value={returnStatus} onChange={(e) => setReturnStatus(e.target.value)}>
                <option value="available">Available for Adoption</option>
                <option value="medical_hold">Medical Hold</option>
                <option value="intake">Back to Intake</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Return Notes (Optional)
              </label>
              <textarea className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 outline-none h-24 resize-none text-gray-700" placeholder="Describe pet's condition or reason for return..." value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)}/>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 px-4 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all active:scale-[0.98]" disabled={isPending}>
              Cancel
            </button>
            <button onClick={() => onSubmit({ returnStatus, notes: returnNotes })} disabled={isPending} className="flex-1 py-3 px-4 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all disabled:opacity-50 shadow-lg shadow-primary-200 active:scale-[0.98]">
              {isPending ? "Processing..." : "Confirm Return"}
            </button>
          </div>
        </div>
      </div>
    </div>);
}
