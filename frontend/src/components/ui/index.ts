// Existing HUD primitives (preserved for backward compatibility)
export { HudButton, HudButton as Button } from "@/components/hud/HudButton";
export { IconButton as HudIconButton, IconButton } from "@/components/hud/IconButton";
export { HudInput, HudInput as Input } from "@/components/hud/HudInput";
export { HudSelect, HudSelect as Select } from "@/components/hud/HudSelect";
export { HudTextarea, HudTextarea as Textarea } from "@/components/hud/HudTextarea";
export { HudModal, HudModal as Modal } from "@/components/hud/HudModal";
export { HudDrawer, HudDrawer as Drawer } from "@/components/hud/HudDrawer";
export { HudDatePicker, HudDatePicker as DatePicker } from "@/components/hud/HudDatePicker";
export { HudLink } from "@/components/hud/HudLink";
export { HudBackButton } from "@/components/hud/HudBackButton";
export { HudFileUpload, HudFileUpload as FileUpload } from "@/components/hud/HudFileUpload";
export { HudToastHost, HudToastHost as Toast } from "@/components/hud/HudToast";
export { CommandPanel, CommandPanel as Panel, CommandPanel as CardShell } from "@/components/hud/CommandPanel";
export { ConfirmDialog } from "@/components/hud/ConfirmDialog";
export { SearchInput } from "@/components/hud/SearchInput";
export { FilterBar } from "@/components/hud/FilterBar";
export { PageHeader } from "@/components/hud/PageHeader";
export { SectionHeader } from "@/components/hud/SectionHeader";
export { LabelBadge, LabelBadge as Tag } from "@/components/hud/LabelBadge";
export { TechBadge } from "@/components/hud/TechBadge";
export { StatusIndicator } from "@/components/hud/StatusIndicator";
export { EmptyState } from "@/components/hud/EmptyState";
export { LoadingState } from "@/components/hud/LoadingState";
export { MetricCard } from "@/components/hud/MetricCard";
export { ActivityItem } from "@/components/hud/ActivityItem";
export { DataReadout } from "@/components/hud/DataReadout";
export { ModuleTile } from "@/components/hud/ModuleTile";

// Motion / feedback primitives
export {
  PageTransition,
  HudFadeIn,
  HudSlideIn,
  HudScaleIn,
  HudReveal,
  HudPulse,
  HudSkeleton,
  HudProgress,
  HudLoading,
  HudStagger,
  HudPanelReveal,
  HudCardReveal,
} from "@/components/hud/motion";

// New shared UI system
export { Badge, StatusBadge, PriorityBadge } from "./Badge";
export { statusColors, priorityColors, type StatusTone, type PriorityLevel } from "./status";
export { DataTable, type DataTableColumn } from "./DataTable";
export { Pagination } from "./Pagination";
export { Tabs, type TabItem } from "./Tabs";
export { ComposableFilterBar, FilterChip, type FilterDef, type FilterValues } from "./FilterSystem";
export { Card, StatCard, SummaryCard, StatusCard, ActionCard, PriorityCard } from "./Cards";
export {
  Checkbox,
  CheckboxControl,
  Switch,
  RadioGroup,
  MultiSelect,
  NumberInput,
  CurrencyInput,
  DateRangePicker,
  FormField,
  Slider,
} from "./FormControls";
export { ErrorState } from "./Feedback";
export { Timeline, TimelineCard, type TimelineItem } from "./Timeline";
export { Tooltip, Popover, Accordion, Breadcrumb } from "./Overlays";
export { LineChart, AreaChart, BarChart, DonutChart, ComparisonAreaChart, ChartCard } from "./Charts";
export { formatInr, formatPercent, type ChartPoint, type ComparisonPoint } from "./chartUtils";
export { type ChartZoomLevel } from "./useChartZoom";
export { Avatar, AvatarGroup, FileList, AttachmentCard } from "./Media";
export { CommandPalette, type CommandItem } from "./CommandPalette";

// Theme / settings utilities still available from UI barrel
export { ThemeEditor } from "@/components/hud/ThemeEditor";
export { ThemePresetCard, ThemePresetGrid } from "@/components/hud/ThemePresetCard";
export { ThemeSelector } from "@/components/hud/ThemeSelector";
export { ColorTokenEditor } from "@/components/hud/ColorTokenEditor";
export { ExportImportDialog } from "@/components/hud/ExportImportDialog";
export { ApiKeyManager } from "@/components/hud/ApiKeyManager";
