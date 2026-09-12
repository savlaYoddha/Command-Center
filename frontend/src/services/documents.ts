import { api, type ApiError, type ApiSuccess } from "./api";

export type DocumentItem = {
  id: string;
  folder: string;
  category: string;
  name: string;
  mimeType: string;
  size: number;
  tags: string[];
  notes: string;
  createdAt: number;
  updatedAt: number;
  viewable: boolean;
};

export type DocumentFilters = {
  folder?: string;
  category?: string;
  tag?: string;
  q?: string;
};

async function formRequest<T>(path: string, body: FormData): Promise<T> {
  const response = await fetch(path, { method: "POST", body, credentials: "include" });
  const text = await response.text().catch(() => "");
  let payload: ApiSuccess<T> | ApiError | null = null;
  try {
    payload = text ? (JSON.parse(text) as ApiSuccess<T> | ApiError) : null;
  } catch {
    payload = null;
  }
  if (!response.ok || !payload || payload.status !== "ok") {
    const message =
      payload && payload.status === "error"
        ? payload.error.message
        : text || `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload.data;
}

export const documentService = {
  list: (filters: DocumentFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.folder !== undefined) params.set("folder", filters.folder);
    if (filters.category) params.set("category", filters.category);
    if (filters.tag) params.set("tag", filters.tag);
    if (filters.q) params.set("q", filters.q);
    const qs = params.toString();
    return api.get<DocumentItem[]>(`/api/v1/documents${qs ? `?${qs}` : ""}`);
  },
  fileUrl: (id: string) => `/api/v1/documents/${id}/file`,
  downloadUrl: (id: string) => `/api/v1/documents/${id}/download`,
  upload: (file: File, meta: { folder?: string; category?: string; name?: string; tags?: string[]; notes?: string }) => {
    const body = new FormData();
    body.append("file", file);
    if (meta.folder) body.append("folder", meta.folder);
    if (meta.category) body.append("category", meta.category);
    if (meta.name) body.append("name", meta.name);
    if (meta.tags && meta.tags.length > 0) body.append("tags", meta.tags.join(","));
    if (meta.notes) body.append("notes", meta.notes);
    return formRequest<DocumentItem>("/api/v1/documents", body);
  },
  update: (id: string, patch: Partial<Pick<DocumentItem, "folder" | "category" | "name" | "tags" | "notes">>) =>
    api.patch<DocumentItem>(`/api/v1/documents/${id}`, patch),
  remove: (id: string) => api.delete<{ deleted: boolean }>(`/api/v1/documents/${id}`),
  zipBlob: async (ids: string[]): Promise<Blob> => {
    const response = await fetch("/api/v1/documents/zip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
      credentials: "include",
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      let message = `Request failed (${response.status}).`;
      try {
        const payload = JSON.parse(text) as ApiError;
        if (payload.status === "error") message = payload.error.message;
      } catch {
        message = text || message;
      }
      throw new Error(message);
    }
    return response.blob();
  },
  email: (ids: string[], to: string, subject?: string, body?: string) =>
    api.post<{ sent: boolean; to: string; attachments: number }>("/api/v1/documents/email", {
      ids,
      to,
      subject: subject || undefined,
      body: body || undefined,
    }),
};