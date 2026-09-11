import { api } from "@/services/api";
import type { Vehicle, VehicleInput } from "../types";

export const vehicleApi = {
  list: (opts?: { archived?: boolean; search?: string }) => {
    const params = new URLSearchParams();
    if (opts?.archived) params.set("archived", "1");
    if (opts?.search) params.set("search", opts.search);
    const q = params.toString();
    return api.get<Vehicle[]>(`/api/v1/vehicles${q ? `?${q}` : ""}`);
  },
  get: (id: string) => api.get<Vehicle>(`/api/v1/vehicles/${id}`),
  create: (body: VehicleInput) => api.post<Vehicle>("/api/v1/vehicles", body),
  update: (id: string, body: Partial<VehicleInput>) => api.put<Vehicle>(`/api/v1/vehicles/${id}`, body),
  archive: (id: string) => api.patch<Vehicle>(`/api/v1/vehicles/${id}/archive`, {}),
  unarchive: (id: string) => api.patch<Vehicle>(`/api/v1/vehicles/${id}/unarchive`, {}),
  delete: (id: string) => api.delete(`/api/v1/vehicles/${id}`),
  uploadPhoto: (id: string, file: File) => api.upload<{ photo: string }>(`/api/v1/vehicles/${id}/photo`, file),
};
