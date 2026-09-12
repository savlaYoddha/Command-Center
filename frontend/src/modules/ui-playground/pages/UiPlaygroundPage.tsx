import { useMemo, useState } from "react";
import {
  BarChart3,
  CreditCard,
  Landmark,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import {
  Accordion,
  ActionCard,
  Avatar,
  AvatarGroup,
  Badge,
  Breadcrumb,
  ChartCard,
  Checkbox,
  CommandPalette,
  ComposableFilterBar,
  ConfirmDialog,
  CurrencyInput,
  DataTable,
  DateRangePicker,
  DonutChart,
  EmptyState,
  ErrorState,
  FileList,
  HudButton,
  HudDatePicker,
  HudDrawer,
  HudFileUpload,
  HudIconButton,
  HudLoading,
  HudModal,
  HudSelect,
  HudSkeleton,
  HudToastHost,
  Input,
  LineChart,
  BarChart,
  ComparisonAreaChart,
  LoadingState,
  MetricCard,
  MultiSelect,
  NumberInput,
  Pagination,
  Panel,
  Popover,
  PriorityBadge,
  RadioGroup,
  SearchInput,
  SectionHeader,
  StatCard,
  StatusBadge,
  StatusCard,
  SummaryCard,
  Switch,
  Slider,
  Tabs,
  Textarea,
  Timeline,
  TimelineCard,
  Tooltip,
  type DataTableColumn,
  type FilterValues,
} from "@/components/ui";
import { PageHeader } from "@/components/hud/PageHeader";
import { notify } from "@/store/toastStore";
import {
  mockActivity,
  mockChartCategories,
  mockChartCategoriesZoomLevels,
  mockChartIncomeExpenses,
  mockChartSpending,
  mockChartSpendingZoomLevels,
  mockChartUtilization,
  mockDocuments,
  mockFiles,
  mockTasks,
  mockTransactions,
  mockUsers,
  mockVehicles,
  type MockTransaction,
} from "@/components/ui/mock/data";

function PlaygroundSection({ title, purpose, children }: { title: string; purpose: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
      <div>
        <SectionHeader title={title} />
        <p className="mt-2 text-sm text-text-secondary">{purpose}</p>
      </div>
      {children}
    </section>
  );
}

export function UiPlaygroundPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tab, setTab] = useState("overview");
  const [switchOn, setSwitchOn] = useState(true);
  const [sliderValue, setSliderValue] = useState(64);
  const [radio, setRadio] = useState("standard");
  const [multi, setMulti] = useState<string[]>(["finance"]);
  const [filterValues, setFilterValues] = useState<FilterValues>({ search: "", category: "", tags: ["finance"] });
  const [dateFrom, setDateFrom] = useState("2026-08-01");
  const [dateTo, setDateTo] = useState("2026-08-24");
  const [page, setPage] = useState(1);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [files, setFiles] = useState(mockFiles);

  const txColumns = useMemo<DataTableColumn<MockTransaction>[]>(
    () => [
      { id: "date", header: "Date", accessor: (row) => row.date, sortValue: (row) => row.date },
      { id: "description", header: "Description", accessor: (row) => row.description, sortValue: (row) => row.description },
      { id: "category", header: "Category", accessor: (row) => row.category, sortValue: (row) => row.category },
      {
        id: "amount",
        header: "Amount",
        accessor: (row) => (
          <span className={row.amount < 0 ? "text-[color:var(--danger)]" : "text-[color:var(--success)]"}>
            ₹{Math.abs(row.amount).toLocaleString("en-IN")}
          </span>
        ),
        sortValue: (row) => row.amount,
      },
      {
        id: "status",
        header: "Status",
        accessor: (row) => <StatusBadge status={row.status === "failed" ? "error" : row.status === "pending" ? "pending" : "success"} label={row.status} />,
      },
    ],
    [],
  );

  const chips = useMemo(() => {
    const next = [];
    if (filterValues.search) next.push({ id: "search", label: `Search: ${filterValues.search}` });
    if (filterValues.category) next.push({ id: "category", label: `Category: ${filterValues.category}` });
    if (Array.isArray(filterValues.tags) && filterValues.tags.length) next.push({ id: "tags", label: filterValues.tags.join(", ") });
    return next;
  }, [filterValues]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Internal reference"
        title="COMMANDCENTER UI Playground"
        actions={
          <HudButton type="button" variant="ghost" onClick={() => setPaletteOpen(true)}>
            Open command palette
          </HudButton>
        }
      />

      <PlaygroundSection title="Buttons" purpose="Primary actions, secondary ghost controls, danger actions, and icon buttons.">
        <div className="flex flex-wrap gap-2">
          <HudButton>Primary</HudButton>
          <HudButton variant="ghost">Secondary</HudButton>
          <HudButton variant="danger">Danger</HudButton>
          <HudIconButton label="Settings" onClick={() => notify("info", "ICON ACTION", "Settings icon clicked")}>
            <Settings size={16} />
          </HudIconButton>
        </div>
      </PlaygroundSection>

      <PlaygroundSection title="Inputs" purpose="Reusable form primitives with labels, help text, and validation states.">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Text input" placeholder="Operator name" />
          <SearchInput placeholder="Search records…" aria-label="Search demo" />
          <HudSelect label="Select">
            <option value="a">Option A</option>
            <option value="b">Option B</option>
          </HudSelect>
          <MultiSelect label="Multi-select" options={[{ value: "finance", label: "Finance" }, { value: "tasks", label: "Tasks" }, { value: "vehicles", label: "Vehicles" }]} value={multi} onChange={setMulti} />
          <HudDatePicker label="Date" value={dateFrom || null} onChange={(v) => setDateFrom(v ?? "")} />
          <DateRangePicker label="Date range" from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
          <NumberInput label="Number" placeholder="0" />
          <CurrencyInput label="Currency" placeholder="124500" />
          <Textarea label="Textarea" placeholder="Notes…" rows={3} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Checkbox label="Checkbox" defaultChecked />
          <Switch label="Switch" checked={switchOn} onChange={setSwitchOn} />
          <RadioGroup label="Radio" name="density" value={radio} onChange={setRadio} options={[{ value: "compact", label: "Compact" }, { value: "standard", label: "Standard" }, { value: "comfortable", label: "Comfortable" }]} />
        </div>
        <Slider label="Animation level" min={0} max={100} step={5} value={sliderValue} onChange={setSliderValue} formatValue={(v) => `${v}%`} />
      </PlaygroundSection>

      <PlaygroundSection title="Badges" purpose="Centralized status and priority tokens for all modules.">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="success" />
          <StatusBadge status="warning" />
          <StatusBadge status="error" />
          <StatusBadge status="info" />
          <StatusBadge status="pending" />
          <PriorityBadge priority="high" />
          <PriorityBadge priority="urgent" />
          <Badge color="var(--accent-secondary)">Custom</Badge>
        </div>
      </PlaygroundSection>

      <PlaygroundSection title="Cards" purpose="Metric, stat, summary, status, and action card patterns.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total balance" value="₹1,24,500" unit="INR" />
          <StatCard title="Monthly delta" value="+8.4%" trend="+8.4% this month" description="Compared to previous cycle" />
          <SummaryCard title="Fleet summary" items={[{ label: "Vehicles", value: "2" }, { label: "Due service", value: "1" }]} />
          <StatusCard title="Archive sync" status="active" body="Archive policy is active for Done tasks." actionLabel="Review" onAction={() => notify("info", "STATUS ACTION", "Review clicked")} />
        </div>
        <ActionCard title="Create record" description="Launch a modal workflow from an action card." actionLabel="Create" onAction={() => setModalOpen(true)} />
      </PlaygroundSection>

      <PlaygroundSection title="Table" purpose="Generic DataTable with search, sort, pagination, selection, and row actions.">
        <DataTable
          columns={txColumns}
          data={mockTransactions}
          rowKey={(row) => row.id}
          searchable
          searchPlaceholder="Search transactions…"
          searchFilter={(row, q) => [row.description, row.category, row.status, row.date].join(" ").toLowerCase().includes(q)}
          sortable
          pagination
          pageSize={5}
          selectable
          columnVisibility
          rowActions={(row) => (
            <HudButton type="button" variant="ghost" onClick={() => notify("info", row.id.toUpperCase(), row.description)}>
              View
            </HudButton>
          )}
        />
      </PlaygroundSection>

      <PlaygroundSection title="Filters" purpose="Composable filter bar with search, select, multi-select, ranges, chips, and clear-all.">
        <ComposableFilterBar
          filters={[
            { id: "search", type: "search", placeholder: "Search transactions…" },
            { id: "category", type: "select", label: "Category", options: [{ value: "Food", label: "Food" }, { value: "Income", label: "Income" }, { value: "Loans", label: "Loans" }] },
            { id: "tags", type: "multi", label: "Tags", options: [{ value: "finance", label: "Finance" }, { value: "credit-card", label: "Credit Card" }, { value: "this-month", label: "This Month" }] },
            { id: "range", type: "date-range", label: "Date" },
            { id: "activeOnly", type: "boolean", label: "Active only" },
          ]}
          values={filterValues}
          onChange={setFilterValues}
          chips={chips}
          onRemoveChip={(id) => {
            if (id === "search") setFilterValues((v) => ({ ...v, search: "" }));
            if (id === "category") setFilterValues((v) => ({ ...v, category: "" }));
            if (id === "tags") setFilterValues((v) => ({ ...v, tags: [] }));
          }}
          onClearAll={() => setFilterValues({})}
        />
      </PlaygroundSection>

      <PlaygroundSection title="Tabs" purpose="Shared tab navigation for module sub-views.">
        <Tabs
          activeId={tab}
          onChange={setTab}
          tabs={[
            { id: "overview", label: "Overview", icon: LayoutDashboard, badge: 3, content: <p className="text-sm text-text-secondary">Overview panel content.</p> },
            { id: "transactions", label: "Transactions", icon: CreditCard, badge: mockTransactions.length, content: <p className="text-sm text-text-secondary">Transactions panel content.</p> },
            { id: "loans", label: "Loans", icon: Landmark, content: <p className="text-sm text-text-secondary">Loans panel content.</p> },
            { id: "cards", label: "Cards", icon: BarChart3, content: <p className="text-sm text-text-secondary">Cards panel content.</p> },
          ]}
        />
      </PlaygroundSection>

      <PlaygroundSection title="Charts" purpose="Lightweight SVG chart wrappers with a shared ChartCard shell.">
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="Monthly spending" description="12-month spending trend" footer="Pinch in for months · pinch out for years">
            <LineChart data={mockChartSpending} zoomLevels={mockChartSpendingZoomLevels} />
          </ChartCard>
          <ChartCard title="Income vs expenses" description="Dual-series area comparison">
            <ComparisonAreaChart data={mockChartIncomeExpenses} />
          </ChartCard>
          <ChartCard title="Category split" description="Monthly category distribution" footer="Pinch in for months · pinch out for years">
            <BarChart data={mockChartCategories} zoomLevels={mockChartCategoriesZoomLevels} />
          </ChartCard>
          <ChartCard title="Utilization" description="Portfolio utilization mix" className="flex flex-col">
            <DonutChart data={mockChartUtilization} formatValue={(v) => `${v}%`} />
          </ChartCard>
        </div>
      </PlaygroundSection>

      <PlaygroundSection title="Overlays" purpose="Modal, drawer, popover, tooltip, accordion, and confirmation patterns.">
        <div className="flex flex-wrap gap-2">
          <HudButton onClick={() => setModalOpen(true)}>Open modal</HudButton>
          <HudButton variant="ghost" onClick={() => setDrawerOpen(true)}>Open drawer</HudButton>
          <HudButton variant="ghost" onClick={() => setConfirmOpen(true)}>Confirm dialog</HudButton>
          <Popover trigger={<HudButton variant="ghost">Popover</HudButton>}>
            <p className="text-sm text-text-secondary">Popover content for quick actions.</p>
          </Popover>
          <Tooltip label="System tooltip">
            <HudButton variant="ghost">Tooltip</HudButton>
          </Tooltip>
        </div>
        <Accordion
          items={[
            { id: "a", title: "Panel variant A", content: "Accordion content for compact reference sections." },
            { id: "b", title: "Panel variant B", content: "Another reusable disclosure block." },
          ]}
        />
      </PlaygroundSection>

      <PlaygroundSection title="Feedback" purpose="Loading, skeleton, empty, error, toast, and pagination states.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel className="p-4">
            <HudLoading label="LOADING COMMAND DATA..." />
          </Panel>
          <Panel className="p-4">
            <HudSkeleton lines={5} />
          </Panel>
        </div>
        <div className="flex flex-wrap gap-2">
          <HudButton variant="ghost" onClick={() => notify("success", "SUCCESS", "Operation completed")}>Success toast</HudButton>
          <HudButton variant="ghost" onClick={() => notify("warning", "WARNING", "Check operator input")}>Warning toast</HudButton>
          <HudButton variant="danger" onClick={() => notify("error", "ERROR", "Action failed")}>Error toast</HudButton>
        </div>
        <EmptyState kicker="Demo" title="NO TRANSACTIONS" body="No transactions found for this filter." actionLabel="Clear filters" onAction={() => notify("info", "FILTERS CLEARED", "Demo only")} />
        <ErrorState message="Unable to reach the command data service." actionLabel="Retry" onAction={() => notify("info", "RETRY", "Demo retry")} />
        <Pagination page={page} pageSize={5} total={mockTransactions.length} onPageChange={setPage} />
      </PlaygroundSection>

      <PlaygroundSection title="Timeline" purpose="Reusable activity timeline for tasks, finance, vehicles, and documents events.">
        <TimelineCard title="Activity stream">
          <Timeline items={mockActivity} />
        </TimelineCard>
      </PlaygroundSection>

      <PlaygroundSection title="Forms" purpose="Complete form example using shared primitives.">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); notify("success", "FORM SUBMITTED", "Playground demo only"); }}>
          <Input label="Record name" required />
          <HudSelect label="Module">
            <option value="tasks">Tasks</option>
            <option value="finance">Finance</option>
            <option value="vehicles">Vehicles</option>
          </HudSelect>
          <CurrencyInput label="Amount" />
          <DateRangePicker from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
          <div className="md:col-span-2">
            <Textarea label="Notes" rows={4} />
          </div>
          <div className="md:col-span-2">
            <HudButton type="submit">Submit form</HudButton>
          </div>
        </form>
      </PlaygroundSection>

      <PlaygroundSection title="File components" purpose="Upload control and file list for attachments across modules.">
        <HudFileUpload
          file={uploadFile}
          state={uploadFile ? "success" : "idle"}
          onFile={setUploadFile}
          onClear={() => setUploadFile(null)}
        />
        <FileList files={files} onRemove={(id) => setFiles((current) => current.filter((file) => file.id !== id))} />
      </PlaygroundSection>

      <PlaygroundSection title="Command palette" purpose="Reusable command launcher that modules can extend with custom commands.">
        <HudButton onClick={() => setPaletteOpen(true)}>Launch palette</HudButton>
      </PlaygroundSection>

      <PlaygroundSection title="Dark HUD panels" purpose="Panel variants and navigation helpers used across COMMANDCENTER.">
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "UI Playground" }]} />
        <div className="grid gap-4 md:grid-cols-2">
          <Panel className="p-4" hatch>
            <div className="font-display text-[10px] tracking-[0.18em] uppercase text-[color:var(--accent)]">Hatch panel</div>
            <p className="mt-2 text-sm text-text-secondary">Used for tactical module surfaces.</p>
          </Panel>
          <Panel highlighted className="p-4">
            <div className="font-display text-[10px] tracking-[0.18em] uppercase">Highlighted panel</div>
            <p className="mt-2 text-sm text-text-secondary">Used for active drop targets and focus states.</p>
          </Panel>
        </div>
        <div className="flex items-center gap-3">
          <Avatar name={mockUsers[0]} />
          <AvatarGroup names={mockUsers} />
        </div>
      </PlaygroundSection>

      <PlaygroundSection title="Responsive examples" purpose="Components wrap and stack on smaller screens without module-specific hacks.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {mockTasks.map((task) => (
            <Panel key={task.id} className="p-3">
              <div className="font-display text-[10px] tracking-[0.14em] text-[color:var(--accent)]">{task.number}</div>
              <div className="mt-1 text-sm">{task.title}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <PriorityBadge priority={task.priority} />
                <Badge>{task.status}</Badge>
              </div>
            </Panel>
          ))}
        </div>
        <LoadingState label="Responsive loading state demo" />
      </PlaygroundSection>

      <PlaygroundSection title="Module mock previews" purpose="Shows how future modules can compose the same primitives without embedding business logic in UI components.">
        <div className="grid gap-4 xl:grid-cols-3">
          <SummaryCard title="Vehicles" items={mockVehicles.map((v) => ({ label: v.name, value: v.service }))} />
          <SummaryCard title="Documents" items={mockDocuments.map((d) => ({ label: d.name, value: d.type }))} />
          <SummaryCard title="Tasks" items={mockTasks.map((t) => ({ label: t.number, value: t.status }))} />
        </div>
      </PlaygroundSection>

      <HudModal open={modalOpen} title="Example modal" onClose={() => setModalOpen(false)} size="lg">
        <p className="text-sm text-text-secondary">Modal shell for create/edit workflows.</p>
        <div className="mt-4 flex gap-2">
          <HudButton onClick={() => setModalOpen(false)}>Confirm</HudButton>
          <HudButton variant="ghost" onClick={() => setModalOpen(false)}>Cancel</HudButton>
        </div>
      </HudModal>

      <HudDrawer open={drawerOpen} title="Example drawer" onClose={() => setDrawerOpen(false)} wide>
        <p className="text-sm text-text-secondary">Drawer shell for record details.</p>
        <Timeline items={mockActivity.slice(0, 3)} />
      </HudDrawer>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm destructive action?"
        danger
        confirmLabel="Delete"
        body={<p>This is a reusable confirmation dialog.</p>}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          notify("warning", "CONFIRMED", "Demo confirmation");
        }}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={[
          { id: "create-task", label: "Create task", group: "Tasks", action: () => notify("info", "CREATE TASK", "Demo command") },
          { id: "search-tasks", label: "Search tasks", group: "Tasks", action: () => notify("info", "SEARCH TASKS", "Demo command") },
          { id: "open-finance", label: "Open finance", group: "Navigation", action: () => notify("info", "OPEN FINANCE", "Demo command") },
          { id: "open-settings", label: "Open settings", group: "Navigation", action: () => notify("info", "OPEN SETTINGS", "Demo command") },
        ]}
      />

      <HudToastHost />
    </div>
  );
}
