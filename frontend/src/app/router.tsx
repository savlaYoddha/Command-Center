import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { LoadingState } from "@/components/hud/LoadingState";
import { useAuthStore } from "@/store/authStore";

const CommandHomePage = lazy(() =>
  import("@/modules/dashboard/pages/CommandHomePage").then((m) => ({ default: m.CommandHomePage })),
);
const DashboardPage = lazy(() =>
  import("@/modules/dashboard/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const TasksPage = lazy(() => import("@/modules/tasks/pages/TasksPage").then((m) => ({ default: m.TasksPage })));
const TaskArchivePage = lazy(() =>
  import("@/modules/tasks/pages/TaskArchivePage").then((m) => ({ default: m.TaskArchivePage })),
);
const TaskRecyclePage = lazy(() =>
  import("@/modules/tasks/pages/TaskRecyclePage").then((m) => ({ default: m.TaskRecyclePage })),
);
const FinancePage = lazy(() =>
  import("@/modules/finance/pages/FinancePage").then((m) => ({ default: m.FinancePage })),
);
const VehiclesPage = lazy(() =>
  import("@/modules/vehicles/pages/VehiclesPage").then((m) => ({ default: m.VehiclesPage })),
);
const VehicleDetailPage = lazy(() =>
  import("@/modules/vehicles/pages/VehicleDetailPage").then((m) => ({ default: m.VehicleDetailPage })),
);
const DocumentsPage = lazy(() =>
  import("@/modules/documents/pages/DocumentsPage").then((m) => ({ default: m.DocumentsPage })),
);
const HomelabPage = lazy(() =>
  import("@/modules/homelab/pages/HomelabPage").then((m) => ({ default: m.HomelabPage })),
);
const SettingsPage = lazy(() =>
  import("@/modules/settings/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const LoginPage = lazy(() => import("@/modules/settings/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const UiPlaygroundPage = lazy(() =>
  import("@/modules/ui-playground/pages/UiPlaygroundPage").then((m) => ({ default: m.UiPlaygroundPage })),
);

function Guard({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route
          element={
            <Guard>
              <MainLayout />
            </Guard>
          }
        >
          <Route path="/" element={<CommandHomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/tasks/archive" element={<TaskArchivePage />} />
          <Route path="/tasks/recycle" element={<TaskRecyclePage />} />
          <Route path="/tasks/:taskNumber" element={<TasksPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/vehicles/:vehicleId" element={<VehicleDetailPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/homelab" element={<HomelabPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/ui-playground" element={<UiPlaygroundPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
