import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { Pet } from "../types";
export interface PetFilter {
    species?: string;
    breed?: string;
    minAge?: number;
    maxAge?: number;
    gender?: string;
    size?: string;
    status?: string;
    page?: number;
    limit?: number;
}
interface PetsResponse {
    success: boolean;
    data: {
        pets: Pet[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    };
}
export const usePets = (filters: PetFilter) => {
    return useQuery({
        queryKey: ["pets", filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== "" && value !== "all") {
                    params.append(key, String(value));
                }
            });
            const response = await api.get<PetsResponse>(`/pets?${params.toString()}`);
            return response.data;
        },
    });
};
