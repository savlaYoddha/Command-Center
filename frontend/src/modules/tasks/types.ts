export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type LabelMode = "any" | "all";
export type DueFilter = "any" | "today" | "week" | "overdue" | "none";

export type BoardColumn = {
  id: string;
  name: string;
  description?: string;
  position: number;
};

export type TaskLabel = {
  id: string;
  name: string;
  color: string;
  createdAt?: number;
};

export type TaskCardModel = {
  id: string;
  number: string;
  title: string;
  description: string;
  priority: TaskPriority;
  columnId: string;
  columnName?: string;
  position: number;
  startDate: string | null;
  dueDate: string | null;
  archived?: number;
  archivedAt?: number | null;
  deletedAt?: number | null;
  previousColumnId?: string | null;
  completedAt?: number | null;
  labels: TaskLabel[];
  checklistDone: number;
  checklistTotal: number;
  commentCount: number;
  attachmentCount: number;
};

export type ChecklistItem = {
  id: string;
  taskId: string;
  text: string;
  completed: number;
  position: number;
};

export type TaskComment = {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

export type TaskAttachment = {
  id: string;
  taskId: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: number;
};

export type TaskDetail = TaskCardModel & {
  columnName: string;
  checklist: ChecklistItem[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
};

export type SavedFilter = {
  id: string;
  name: string;
  payloadJson: string;
};

export type TaskFilters = {
  search: string;
  labelIds: string[];
  labelMode: LabelMode;
  priority: "" | TaskPriority;
  columnId: string;
  due: DueFilter;
};

export type ActivityRow = {
  id: string;
  action: string;
  summary: string;
  createdAt: number;
};
