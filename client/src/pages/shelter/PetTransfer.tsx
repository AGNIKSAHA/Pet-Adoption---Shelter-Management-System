import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import toast from "react-hot-toast";
import { useAppSelector } from "../../store/store";
import { Pet, PetTransferRequest, Shelter } from "../../types";
import { AxiosError } from "axios";

const getId = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as { _id?: unknown; id?: unknown };
    return getId(obj._id ?? obj.id);
  }
  return null;
};

export default function PetTransfer() {
  const queryClient = useQueryClient();
  const { user, activeShelterId } = useAppSelector((state) => state.auth);
  const [petId, setPetId] = useState("");
  const [toShelterId, setToShelterId] = useState("");
  const [note, setNote] = useState("");
  const [decisionNote, setDecisionNote] = useState("");

  const currentShelterId = getId(activeShelterId) || getId(user?.shelterId);

  const { data: petsData } = useQuery({
    queryKey: ["transfer-pets", currentShelterId],
    queryFn: async () => {
      const response = await api.get("/pets", {
        params: { shelterId: currentShelterId, page: 1, limit: 100 },
      });
      return response.data;
    },
    enabled: !!currentShelterId,
  });

  const { data: sheltersData } = useQuery({
    queryKey: ["transfer-shelters"],
    queryFn: async () => {
      const response = await api.get("/shelters");
      return response.data;
    },
  });

  const { data: transfersData } = useQuery({
    queryKey: ["pet-transfer-requests"],
    queryFn: async () => {
      const response = await api.get("/pets/transfers/my-requests");
      return response.data;
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: () => api.post("/pets/transfers", { petId, toShelterId, note }),
    onSuccess: () => {
      toast.success("Transfer request sent");
      setPetId("");
      setToShelterId("");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["pet-transfer-requests"] });
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to send transfer request");
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: "approved" | "rejected";
    }) =>
      api.patch(`/pets/transfers/${id}/respond`, {
        decision,
        decisionNote: decisionNote || undefined,
      }),
    onSuccess: (_, vars) => {
      toast.success(`Transfer ${vars.decision}`);
      setDecisionNote("");
      queryClient.invalidateQueries({ queryKey: ["pet-transfer-requests"] });
      queryClient.invalidateQueries({ queryKey: ["shelter-pets"] });
      queryClient.invalidateQueries({ queryKey: ["shelter-pet-stats"] });
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to process request");
    },
  });

  const pets: Pet[] = petsData?.data?.pets || [];
  const allShelters: Shelter[] = sheltersData?.data || [];
  const shelterOptions = useMemo(
    () => allShelters.filter((shelter) => shelter._id !== currentShelterId),
    [allShelters, currentShelterId],
  );

  const incoming: PetTransferRequest[] = transfersData?.data?.incoming || [];
  const outgoing: PetTransferRequest[] = transfersData?.data?.outgoing || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pet Transfer</h1>
        <p className="text-gray-500">
          Request transfers to other shelters and process incoming requests.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Create Transfer Request</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={petId}
            onChange={(e) => setPetId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg"
          >
            <option value="">Select pet</option>
            {pets.map((pet) => (
              <option key={pet._id} value={pet._id}>
                {pet.name} ({pet.species})
              </option>
            ))}
          </select>

          <select
            value={toShelterId}
            onChange={(e) => setToShelterId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg"
          >
            <option value="">Select target shelter</option>
            {shelterOptions.map((shelter) => (
              <option key={shelter._id} value={shelter._id}>
                {shelter.name}
              </option>
            ))}
          </select>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg"
            placeholder="Optional note"
          />
        </div>

        <button
          onClick={() => createTransferMutation.mutate()}
          disabled={!petId || !toShelterId || createTransferMutation.isPending}
          className="btn btn-primary disabled:opacity-60"
        >
          Send Request
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Incoming Requests</h2>
        <input
          value={decisionNote}
          onChange={(e) => setDecisionNote(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg w-full md:w-1/2"
          placeholder="Decision note (optional)"
        />
        <div className="space-y-2">
          {incoming.length === 0 ? (
            <p className="text-sm text-gray-500">No incoming requests.</p>
          ) : (
            incoming.map((request) => {
              const pet = request.petId as Pet;
              const fromShelter = request.fromShelterId as Shelter;
              return (
                <div
                  key={request._id}
                  className="p-3 border border-gray-200 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">
                      {pet?.name || "Pet"} from {fromShelter?.name || "Shelter"}
                    </p>
                    <p className="text-gray-500">Status: {request.status}</p>
                  </div>
                  {request.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          respondMutation.mutate({
                            id: request._id,
                            decision: "approved",
                          })
                        }
                        className="px-3 py-1.5 rounded bg-green-600 text-white text-sm"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() =>
                          respondMutation.mutate({
                            id: request._id,
                            decision: "rejected",
                          })
                        }
                        className="px-3 py-1.5 rounded bg-red-600 text-white text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Outgoing Requests</h2>
        <div className="space-y-2">
          {outgoing.length === 0 ? (
            <p className="text-sm text-gray-500">No outgoing requests.</p>
          ) : (
            outgoing.map((request) => {
              const pet = request.petId as Pet;
              const toShelter = request.toShelterId as Shelter;
              return (
                <div
                  key={request._id}
                  className="p-3 border border-gray-200 rounded-lg"
                >
                  <p className="font-semibold text-gray-900 text-sm">
                    {pet?.name || "Pet"} to {toShelter?.name || "Shelter"}
                  </p>
                  <p className="text-sm text-gray-500">Status: {request.status}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
