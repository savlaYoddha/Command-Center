export type StatusTone =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral"
  | "active"
  | "inactive"
  | "pending"
  | "blocked"
  | "completed";

export type PriorityLevel = "low" | "medium" | "high" | "urgent";

export const statusColors: Record<StatusTone, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--danger)",
  info: "var(--info)",
  neutral: "var(--text-muted)",
  active: "var(--success)",
  inactive: "var(--text-muted)",
  pending: "var(--warning)",
  blocked: "var(--danger)",
  completed: "var(--success)",
};

export const priorityColors: Record<PriorityLevel, string> = {
  low: "var(--priority-low)",
  medium: "var(--priority-medium)",
  high: "var(--priority-high)",
  urgent: "var(--priority-urgent)",
};
