import { Building2, Check, Shield } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../../store/store";
import { setActiveShelter } from "../../../../store/slices/authSlice";
import { useNavigate } from "react-router-dom";
export default function ActiveRoleSwitcher() {
    const { user, activeShelterId, activeRole } = useAppSelector((state) => state.auth);
    const dispatch = useAppDispatch();
    if (!user)
        return null;
    const memberships = user.memberships || [];
    const navigate = useNavigate();
    const handleSwitchShelter = (shelterId: string | null, role: string | null) => {
        dispatch(setActiveShelter({ shelterId, role }));
        if (role === "admin") {
            navigate("/admin/dashboard");
        }
        else if (role === "shelter_staff") {
            navigate("/shelter/dashboard");
        }
        else {
            navigate("/adopter/dashboard");
        }
    };
    return (<div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100 mt-6">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
        <Shield className="w-5 h-5 text-gray-500"/>
        <h2 className="text-lg font-medium text-gray-900">
          Active Workspace View
        </h2>
      </div>

      <div className="p-6">
        <p className="text-sm text-gray-500 mb-4">
          Switch your current active view to access different features based on
          your roles and shelter memberships. Changes take effect instantly
          across the application.
        </p>

        <div className="space-y-3">
          
          <button onClick={() => handleSwitchShelter(null, "adopter")} className={`w-full flex items-center justify-between p-4 border rounded-xl transition-all ${!activeShelterId && activeRole === "adopter" ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500" : "border-gray-200 hover:border-primary-300 hover:bg-gray-50"}`}>
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!activeShelterId && activeRole === "adopter" ? "border-primary-600 bg-primary-600" : "border-gray-300"}`}>
                {!activeShelterId && activeRole === "adopter" && (<Check className="w-3 h-3 text-white"/>)}
              </div>
              <div className="text-left">
                <p className={`font-medium ${!activeShelterId && activeRole === "adopter" ? "text-primary-900" : "text-gray-900"}`}>
                  Personal Account
                </p>
                <p className="text-sm text-gray-500">Adopter Profile</p>
              </div>
            </div>
            {!activeShelterId && activeRole === "adopter" && (<span className="text-xs font-semibold text-primary-700 bg-primary-100 px-2 py-1 rounded-full">
                Active
              </span>)}
          </button>

          
          {user.role === "admin" && (<button onClick={() => handleSwitchShelter(null, "admin")} className={`w-full flex items-center justify-between p-4 border rounded-xl transition-all ${!activeShelterId && activeRole === "admin" ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500" : "border-gray-200 hover:border-primary-300 hover:bg-gray-50"}`}>
              <div className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!activeShelterId && activeRole === "admin" ? "border-primary-600 bg-primary-600" : "border-gray-300"}`}>
                  {!activeShelterId && activeRole === "admin" && (<Check className="w-3 h-3 text-white"/>)}
                </div>
                <div className="text-left">
                  <p className={`font-medium ${!activeShelterId && activeRole === "admin" ? "text-primary-900" : "text-gray-900"}`}>
                    Admin
                  </p>
                  <p className="text-sm text-gray-500">Full Platform Access</p>
                </div>
              </div>
              {!activeShelterId && activeRole === "admin" && (<span className="text-xs font-semibold text-primary-700 bg-primary-100 px-2 py-1 rounded-full">
                  Active
                </span>)}
            </button>)}

          
          {memberships.map((m) => {
            const sid = typeof m.shelterId === "string" ? m.shelterId : m.shelterId._id;
            const sname = typeof m.shelterId === "object"
                ? m.shelterId.name
                : "Shelter Account";
            const isSelected = activeShelterId === sid;
            return (<button key={sid} onClick={() => handleSwitchShelter(sid, m.role)} className={`w-full flex items-center justify-between p-4 border rounded-xl transition-all ${isSelected ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500" : "border-gray-200 hover:border-primary-300 hover:bg-gray-50"}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? "border-primary-600 bg-primary-600" : "border-gray-300"}`}>
                    {isSelected && <Check className="w-3 h-3 text-white"/>}
                  </div>
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border shadow-sm">
                    <Building2 className="w-5 h-5 text-gray-500"/>
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${isSelected ? "text-primary-900" : "text-gray-900"}`}>
                      {sname}
                    </p>
                    <p className="text-sm capitalize text-gray-500">
                      {m.role.replace("_", " ")}
                    </p>
                  </div>
                </div>
                {isSelected && (<span className="text-xs font-semibold text-primary-700 bg-primary-100 px-2 py-1 rounded-full">
                    Active
                  </span>)}
              </button>);
        })}
        </div>
      </div>
    </div>);
}
