import { api } from "@/services/api";
import type {
  BoardColumn,
  SavedFilter,
  TaskCardModel,
  TaskDetail,
  TaskFilters,
  TaskLabel,
} from "../types";

function query(filters: TaskFilters, mode: "active" | "archived" | "trash" = "active"): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.labelIds.length) params.set("labelIds", filters.labelIds.join(","));
  params.set("labelMode", filters.labelMode);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.columnId) params.set("columnId", filters.columnId);
  if (filters.due !== "any") params.set("due", filters.due);
  if (mode === "archived") params.set("archived", "1");
  if (mode === "trash") params.set("trash", "1");
  const q = params.toString();
  return q ? `?${q}` : "";
}

export const taskApi = {
  columns: () => api.get<BoardColumn[]>("/api/v1/columns"),
  createColumn: (name: string, description = "") => api.post<BoardColumn>("/api/v1/columns", { name, description }),
  renameColumn: (id: string, name: string, description = "") =>
    api.put<BoardColumn>(`/api/v1/columns/${id}`, { name, description }),
  deleteColumn: (id: string, destinationColumnId?: string) =>
    api.delete(`/api/v1/columns/${id}`, destinationColumnId ? { destinationColumnId } : undefined),
  reorderColumns: (orderedIds: string[]) => api.patch<BoardColumn[]>("/api/v1/columns/reorder", { orderedIds }),
  labels: () => api.get<TaskLabel[]>("/api/v1/labels"),
  createLabel: (name: string, color: string) => api.post<TaskLabel>("/api/v1/labels", { name, color }),
  updateLabel: (id: string, patch: { name?: string; color?: string }) => api.put<TaskLabel>(`/api/v1/labels/${id}`, patch),
  deleteLabel: (id: string) => api.delete(`/api/v1/labels/${id}`),
  tasks: (filters: TaskFilters, mode: "active" | "archived" | "trash" = "active") =>
    api.get<TaskCardModel[]>(`/api/v1/tasks${query(filters, mode)}`),
  task: (id: string) => api.get<TaskDetail>(`/api/v1/tasks/${id}`),
  createTask: (body: Record<string, unknown>) => api.post<TaskDetail>("/api/v1/tasks", body),
  updateTask: (id: string, body: Record<string, unknown>) => api.put<TaskDetail>(`/api/v1/tasks/${id}`, body),
  deleteTask: (id: string) => api.patch(`/api/v1/tasks/${id}/trash`, {}),
  archiveTask: (id: string) => api.patch(`/api/v1/tasks/${id}/archive`, {}),
  unarchiveTask: (id: string) => api.patch(`/api/v1/tasks/${id}/unarchive`, {}),
  restoreTask: (id: string, destinationColumnId?: string) =>
    api.patch(`/api/v1/tasks/${id}/restore`, destinationColumnId ? { destinationColumnId } : {}),
  permanentDeleteTask: (id: string) => api.delete(`/api/v1/tasks/${id}/permanent`),
  moveTask: (id: string, body: { columnId: string; position: number; orderedIds: string[] }) =>
    api.patch<TaskCardModel[]>(`/api/v1/tasks/${id}/move`, body),
  addLabel: (taskId: string, labelId: string) => api.post(`/api/v1/tasks/${taskId}/labels`, { labelId }),
  removeLabel: (taskId: string, labelId: string) => api.delete(`/api/v1/tasks/${taskId}/labels/${labelId}`),
  addChecklist: (taskId: string, text: string) => api.post(`/api/v1/tasks/${taskId}/checklist`, { text }),
  patchChecklist: (id: string, body: { text?: string; completed?: boolean; position?: number }) =>
    api.patch(`/api/v1/checklist/${id}`, body),
  deleteChecklist: (id: string) => api.delete(`/api/v1/checklist/${id}`),
  addComment: (taskId: string, content: string) => api.post(`/api/v1/tasks/${taskId}/comments`, { content }),
  updateComment: (id: string, content: string) => api.put(`/api/v1/comments/${id}`, { content }),
  deleteComment: (id: string) => api.delete(`/api/v1/comments/${id}`),
  activity: (taskId: string) => api.get(`/api/v1/tasks/${taskId}/activity`),
  upload: (taskId: string, file: File) => api.upload(`/api/v1/tasks/${taskId}/attachments`, file),
  deleteAttachment: (id: string) => api.delete(`/api/v1/attachments/${id}`),
  savedFilters: () => api.get<SavedFilter[]>("/api/v1/saved-filters"),
  saveFilter: (name: string, payload: TaskFilters) =>
    api.post<SavedFilter>("/api/v1/saved-filters", { name, payload }),
  renameFilter: (id: string, name: string) => api.put<SavedFilter>(`/api/v1/saved-filters/${id}`, { name }),
  deleteFilter: (id: string) => api.delete(`/api/v1/saved-filters/${id}`),
};
