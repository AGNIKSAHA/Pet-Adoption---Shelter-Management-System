import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import { Loader2, Home, User, Heart } from "lucide-react";
import api from "../../lib/api";
import { AxiosError } from "axios";
const applicationSchema = z.object({
    housingType: z.enum(["house", "apartment", "condo", "other"]),
    ownership: z.enum(["own", "rent"]),
    landlordPhone: z.string().optional(),
    hasFencedYard: z.boolean(),
    householdMembers: z.number().min(1),
    hasChildren: z.boolean(),
    otherPets: z.string(),
    experience: z.string().min(20, "Please provide more details"),
    hoursAlone: z.number().min(0).max(24),
    reason: z.string().min(20, "Please tell us why you want to adopt"),
});
type ApplicationForm = z.infer<typeof applicationSchema>;
export default function ApplyForPet() {
    const { petId } = useParams();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register, handleSubmit, watch, formState: { errors }, } = useForm<ApplicationForm>({
        resolver: zodResolver(applicationSchema),
        defaultValues: {
            hasFencedYard: false,
            hasChildren: false,
            householdMembers: 1,
        },
    });
    const ownership = watch("ownership");
    const onSubmit = async (data: ApplicationForm) => {
        try {
            setIsSubmitting(true);
            const applicationData = {
                petId,
                questionnaire: {
                    housingType: data.housingType,
                    hasOwnedPetsBefore: data.experience.length > 0,
                    currentPets: data.otherPets || "None",
                    hasYard: data.hasFencedYard,
                    householdMembers: data.householdMembers,
                    hasChildren: data.hasChildren,
                    childrenAges: data.hasChildren ? "Not specified" : undefined,
                    workSchedule: `Pet will be alone for approximately ${data.hoursAlone} hours per day`,
                    petCareExperience: data.experience,
                    whyAdopt: data.reason,
                },
                references: [
                    {
                        name: "Reference 1",
                        relationship: "Friend",
                        phone: "000-000-0000",
                        email: "reference@example.com",
                    },
                ],
            };
            await api.post("/applications", applicationData);
            toast.success("Application submitted successfully!");
            navigate("/adopter/applications");
        }
        catch (error) {
            const axiosError = error as AxiosError<{
                message: string;
            }>;
            toast.error(axiosError.response?.data?.message || "Failed to submit application");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (!petId)
        return <div>Pet not found</div>;
    return (<div className="max-w-3xl mx-auto py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-primary-600 px-8 py-6 text-white">
          <h1 className="text-2xl font-bold">Adoption Application</h1>
          <p className="text-primary-100 mt-2">
            Please fill out this form honestly to help us find the best match
            for you and the pet.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
          
          <section>
            <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold border-b pb-2">
              <Home className="w-5 h-5 text-primary-600"/>
              <h2>Housing Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Housing Type
                </label>
                <select {...register("housingType")} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500">
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="condo">Condo</option>
                  <option value="other">Other</option>
                </select>
                {errors.housingType && (<p className="text-red-500 text-xs mt-1">
                    {errors.housingType.message}
                  </p>)}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ownership
                </label>
                <select {...register("ownership")} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500">
                  <option value="own">Own</option>
                  <option value="rent">Rent</option>
                </select>
              </div>

              {ownership === "rent" && (<div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Landlord Contact (Phone)
                  </label>
                  <input type="tel" {...register("landlordPhone")} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Required for renters"/>
                </div>)}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="hasFencedYard" {...register("hasFencedYard")} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"/>
                <label htmlFor="hasFencedYard" className="text-sm text-gray-700">
                  I have a fenced yard
                </label>
              </div>
            </div>
          </section>

          
          <section>
            <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold border-b pb-2">
              <User className="w-5 h-5 text-primary-600"/>
              <h2>Household Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Adults
                </label>
                <input type="number" {...register("householdMembers", { valueAsNumber: true })} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500" min="1"/>
              </div>

              <div className="flex items-center gap-2 md:pt-8">
                <input type="checkbox" id="hasChildren" {...register("hasChildren")} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"/>
                <label htmlFor="hasChildren" className="text-sm text-gray-700">
                  I have children under 12
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Pets (Species, Breed, Age)
                </label>
                <textarea {...register("otherPets")} rows={2} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="e.g. 1 Dog (Labrador, 5y), 2 Cats..."/>
              </div>
            </div>
          </section>

          
          <section>
            <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold border-b pb-2">
              <Heart className="w-5 h-5 text-primary-600"/>
              <h2>Lifestyle & Experience</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pet Ownership Experience
                </label>
                <textarea {...register("experience")} rows={3} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Tell us about your past experience with pets..."/>
                {errors.experience && (<p className="text-red-500 text-xs mt-1">
                    {errors.experience.message}
                  </p>)}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours pet will be alone per day
                </label>
                <input type="number" {...register("hoursAlone", { valueAsNumber: true })} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500" min="0" max="24"/>
                {errors.hoursAlone && (<p className="text-red-500 text-xs mt-1">
                    {errors.hoursAlone.message}
                  </p>)}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Why do you want to adopt this pet?
                </label>
                <textarea {...register("reason")} rows={3} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Share your motivation..."/>
                {errors.reason && (<p className="text-red-500 text-xs mt-1">
                    {errors.reason.message}
                  </p>)}
              </div>
            </div>
          </section>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
            <button type="button" onClick={() => navigate(-1)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary px-8 py-2 flex items-center gap-2">
              {isSubmitting ? (<Loader2 className="w-5 h-5 animate-spin"/>) : ("Submit Application")}
            </button>
          </div>
        </form>
      </div>
    </div>);
}
