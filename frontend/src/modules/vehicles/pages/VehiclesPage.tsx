import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { Archive, ArchiveRestore, Fuel, MoveRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/hud/PageHeader";
import { CommandPanel } from "@/components/hud/CommandPanel";
import { HudButton } from "@/components/hud/HudButton";
import { HudModal } from "@/components/hud/HudModal";
import { HudDrawer } from "@/components/hud/HudDrawer";
import { HudFileUpload, type HudFileUploadState } from "@/components/hud/HudFileUpload";
import { ConfirmDialog } from "@/components/hud/ConfirmDialog";
import { EmptyState } from "@/components/hud/EmptyState";
import { LoadingState } from "@/components/hud/LoadingState";
import { SearchInput } from "@/components/hud/SearchInput";
import { FilterBar } from "@/components/hud/FilterBar";
import { MetricCard } from "@/components/hud/MetricCard";
import { LabelBadge } from "@/components/hud/LabelBadge";
import { StatusIndicator } from "@/components/hud/StatusIndicator";
import { Switch } from "@/components/ui";
import { notify } from "@/store/toastStore";
import { todayStamp } from "@/modules/finance/transactionStore";
import { vehicleApi } from "../services/vehicles";
import type { Vehicle } from "../types";
import { useVehicleExpenseStore, type VehicleExpense } from "../vehicleExpenseStore";
import { FuelChargeModal } from "../VehicleExpenses";
import {
  ArchivedTag,
  CardCell,
  DetailRow,
  KIND_COLORS,
  KIND_ICONS,
  KIND_LABELS,
  VehicleForm,
  emptyForm,
  fmtOdometer,
  fmtPrice,
  vehicleToForm,
} from "../vehiclesUi";
import { VehicleDetailPage } from "./VehicleDetailPage";
import { useLoanStore } from "@/modules/finance/loans/loanStore";

function VehicleCard({
  vehicle,
  onOpen,
  onEdit,
  onDetails,
  onToggleArchive,
  onAddFuel,
  onAddToll,
}: {
  vehicle: Vehicle;
  onOpen: () => void;
  onEdit: () => void;
  onDetails: () => void;
  onToggleArchive: () => void;
  onAddFuel: () => void;
  onAddToll: () => void;
}) {
  const hasPhoto = Boolean(vehicle.photo);
  const Icon = KIND_ICONS[vehicle.kind] as LucideIcon;
  const subtitle = [vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(" · ");
  const tyres = [vehicle.frontTyre, vehicle.rearTyre].filter(Boolean).join(" · ") || "—";
  const monthPrefix = todayStamp().slice(0, 7);
  const fuelThisMonth = useVehicleExpenseStore((s) =>
    s.expenses.reduce((sum, e) => (e.vehicleId === vehicle.id && e.type === "fuel" && e.date.startsWith(monthPrefix) ? sum + e.amount : sum), 0),
  );

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className="group w-full cursor-pointer outline-none transition-shadow duration-[var(--anim)] hover:shadow-hud focus-visible:border-[color:var(--accent)]"
    >
      <CommandPanel className="h-full overflow-hidden">
        {hasPhoto ? (
          <div className="relative h-32 w-full overflow-hidden border-b border-[color:var(--border)] bg-[color:var(--bg-tertiary)]">
            <img
              src={vehicle.photo}
              alt={vehicle.name}
              className="h-full w-full object-cover transition-transform duration-[var(--anim)] group-hover:scale-105"
            />
            {vehicle.archived ? <ArchivedTag /> : null}
          </div>
        ) : (
          <div className="relative flex h-32 w-full flex-col items-center justify-center gap-2.5 border-b border-[color:var(--border)] bg-[color:var(--bg-tertiary)]">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--border)] transition-colors duration-[var(--anim)] group-hover:border-[color:color-mix(in_srgb,var(--accent)_45%,transparent)]"
              style={{ backgroundColor: `color-mix(in srgb, ${KIND_COLORS[vehicle.kind]} 12%, transparent)` }}
            >
              <Icon size={30} strokeWidth={1.5} style={{ color: KIND_COLORS[vehicle.kind] }} className="drop-shadow-[0_0_10px_color-mix(in_srgb,var(--accent)_35%,transparent)]" />
            </span>
            <span className="font-display text-[9px] tracking-[0.24em] text-text-muted uppercase">
              {KIND_LABELS[vehicle.kind]}
            </span>
            {vehicle.archived ? <ArchivedTag /> : null}
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-display text-sm tracking-[0.12em] uppercase">{vehicle.name}</div>
              <div className="mt-0.5 truncate text-xs text-text-secondary">
                {subtitle || vehicle.kind.toUpperCase()}
              </div>
            </div>
            <LabelBadge color={KIND_COLORS[vehicle.kind]}>{KIND_LABELS[vehicle.kind]}</LabelBadge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
            <CardCell label="Reg" value={vehicle.registrationNumber || "—"} />
            <CardCell label="Odometer" value={fmtOdometer(vehicle.currentOdometer)} />
            <CardCell label="Year" value={vehicle.year ? String(vehicle.year) : "—"} />
            <CardCell label="Est. Value" value={fmtPrice(vehicle.currentValue)} />
          </div>

          <div className="mt-4 border-t border-[color:var(--border)] pt-3">
            <CardCell label="Tyres" value={tyres} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-[color:var(--border)] pt-3 text-xs">
            <CardCell label={`Fuel this month (${monthPrefix.slice(5, 7)})`} value={fuelThisMonth > 0 ? fmtPrice(fuelThisMonth) : "—"} />
            <CardCell label="Fuel type" value={vehicle.fuelType || "—"} />
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <HudButton
              type="button"
              variant="ghost"
              className="!min-h-0 flex items-center justify-center gap-1 px-1.5 py-1 whitespace-nowrap"
              onClick={(e) => {
                e.stopPropagation();
                onAddFuel();
              }}
            >
              <Fuel size={11} />
              Fuel
            </HudButton>
            {vehicle.kind === "car" ? (
              <HudButton
                type="button"
                variant="ghost"
                className="!min-h-0 flex items-center justify-center gap-1 px-1.5 py-1 whitespace-nowrap"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToll();
                }}
              >
                <Plus size={11} />
                Toll
              </HudButton>
            ) : null}
            <HudButton
              type="button"
              variant="ghost"
              className="!min-h-0 flex items-center justify-center gap-1 px-1.5 py-1 whitespace-nowrap"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil size={11} />
              Edit
            </HudButton>
            <HudButton
              type="button"
              variant="ghost"
              className="!min-h-0 flex items-center justify-center gap-1 px-1.5 py-1 whitespace-nowrap"
              onClick={(e) => {
                e.stopPropagation();
                onToggleArchive();
              }}
            >
              {vehicle.archived ? <ArchiveRestore size={11} /> : <Archive size={11} />}
              {vehicle.archived ? "Restore" : "Archive"}
            </HudButton>
            <HudButton
              type="button"
              variant="ghost"
              className="!min-h-0 flex items-center justify-center gap-1 px-1.5 py-1 whitespace-nowrap text-[color:var(--accent)]"
              onClick={(e) => {
                e.stopPropagation();
                onDetails();
              }}
            >
              <MoveRight size={11} />
              Details
            </HudButton>
          </div>
        </div>
      </CommandPanel>
    </div>
  );
}

export function VehiclesPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const loans = useLoanStore((s) => s.loans);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm());
  const [editSaving, setEditSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [expenseModal, setExpenseModal] = useState<{ vehicle: Vehicle; kind: "fuel" | "toll"; editing: VehicleExpense | null } | null>(null);

  const [photo, setPhoto] = useState<{ state: HudFileUploadState; fileName: string; error: string | null }>({
    state: "idle",
    fileName: "",
    error: null,
  });

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(query), 250);
    return () => window.clearTimeout(handle);
  }, [query]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vehicleApi.list({ archived: showArchived, search: search || undefined });
      setVehicles(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load vehicles.");
    } finally {
      setLoading(false);
    }
  }, [showArchived, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function loanLabel(vehicle: Vehicle): string {
    if (!vehicle.loanId) return "—";
    const loan = loans.find((l) => l.id === vehicle.loanId);
    return loan ? `${loan.loanId} · ${loan.name}` : "—";
  }

  function openCreate() {
    setCreateForm(emptyForm());
    setCreateOpen(true);
  }

  function openDetail(vehicle: Vehicle) {
    setDetailVehicle(vehicle);
    setEditMode(false);
    setEditForm(vehicleToForm(vehicle));
    setPhoto({ state: "idle", fileName: "", error: null });
  }

  async function handleCreate() {
    try {
      setSaving(true);
      const created = await vehicleApi.create(createForm);
      setCreateOpen(false);
      setCreateForm(emptyForm());
      notify("success", "VEHICLE ADDED", `${created.name} is now part of the fleet.`);
      void load();
      navigate(`/vehicles/${created.id}`);
    } catch (err: unknown) {
      notify("error", "ADD FAILED", err instanceof Error ? err.message : "Failed to create vehicle.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!detailVehicle) return;
    try {
      setEditSaving(true);
      const updated = await vehicleApi.update(detailVehicle.id, editForm);
      setDetailVehicle(updated);
      setEditForm(vehicleToForm(updated));
      setEditMode(false);
      notify("success", "VEHICLE UPDATED", `${updated.name} details saved.`);
      void load();
    } catch (err: unknown) {
      notify("error", "UPDATE FAILED", err instanceof Error ? err.message : "Failed to update vehicle.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleToggleArchive(vehicle: Vehicle) {
    try {
      const updated = vehicle.archived
        ? await vehicleApi.unarchive(vehicle.id)
        : await vehicleApi.archive(vehicle.id);
      setDetailVehicle((prev) => (prev && prev.id === vehicle.id ? updated : prev));
      notify("success", vehicle.archived ? "VEHICLE RESTORED" : "VEHICLE ARCHIVED", updated.name);
      void load();
    } catch (err: unknown) {
      notify("error", "ACTION FAILED", err instanceof Error ? err.message : "Failed to update archive state.");
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      await vehicleApi.delete(confirmDelete.id);
      notify("success", "VEHICLE DELETED", `${confirmDelete.name} was permanently removed.`);
      setConfirmDelete(null);
      setDetailVehicle((prev) => (prev && prev.id === confirmDelete.id ? null : prev));
      void load();
    } catch (err: unknown) {
      notify("error", "DELETE FAILED", err instanceof Error ? err.message : "Failed to delete vehicle.");
    } finally {
      setDeleting(false);
    }
  }

  async function handlePhotoUpload(file: File) {
    if (!detailVehicle) return;
    try {
      setPhoto({ state: "uploading", fileName: file.name, error: null });
      const result = await vehicleApi.uploadPhoto(detailVehicle.id, file);
      setDetailVehicle((prev) => (prev ? { ...prev, photo: result.photo } : prev));
      setPhoto({ state: "success", fileName: file.name, error: null });
      notify("success", "PHOTO UPLOADED", `${detailVehicle.name} photo updated.`);
      void load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload photo.";
      setPhoto({ state: "error", fileName: file.name, error: message });
      notify("error", "UPLOAD FAILED", message);
    }
  }

  if (vehicleId) {
    return <VehicleDetailPage vehicleId={vehicleId} />;
  }

  const fleet = vehicles.filter((v) => v.archived === 0);
  const carCount = fleet.filter((v) => v.kind === "car").length;
  const motorcycleCount = fleet.filter((v) => v.kind === "motorcycle").length;
  const otherCount = fleet.filter((v) => v.kind === "scooter" || v.kind === "other").length;
  const totalValue = fleet.reduce((sum, v) => sum + (v.currentValue ?? 0), 0);
  const totalOdometer = fleet.reduce((sum, v) => sum + v.currentOdometer, 0);

  const archivedCount = vehicles.filter((v) => v.archived === 1).length;
  const syncing = loading && vehicles.length > 0;
  const hasFilters = Boolean(search || showArchived);

  if (loading && vehicles.length === 0) return <LoadingState label="LOADING FLEET DATA..." />;

  if (error) {
    return (
      <EmptyState
        kicker="System error"
        title="Unable to load vehicles"
        body={error}
        actionLabel="Retry"
        onAction={() => void load()}
      />
    );
  }

  if (vehicles.length === 0 && !hasFilters) {
    return (
      <>
        <EmptyState
          kicker="Fleet systems"
          title="No vehicles registered"
          body="Add your first vehicle to begin tracking fleet data, maintenance schedules, fuel consumption, and insurance records."
          actionLabel="Add Vehicle"
          onAction={openCreate}
        />
        <HudModal open={createOpen} title="Register Vehicle" onClose={() => setCreateOpen(false)} size="lg">
          <VehicleForm
            values={createForm}
            onChange={(patch) => setCreateForm((prev) => ({ ...prev, ...patch }))}
            onSave={() => void handleCreate()}
            saving={saving}
          />
        </HudModal>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Fleet systems"
        title="Vehicles"
        actions={
          <HudButton onClick={openCreate}>
            <Plus size={16} className="mr-1.5" />
            Add Vehicle
          </HudButton>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <MetricCard value={fleet.length} label="Total Vehicles" />
        <MetricCard value={carCount} label="Cars" />
        <MetricCard value={motorcycleCount} label="Motorcycles" />
        <MetricCard value={otherCount} label="Other" />
        <MetricCard value={fmtPrice(totalValue)} label="Est. Fleet Value" />
        <MetricCard value={fmtOdometer(totalOdometer)} label="Fleet Distance" />
      </div>

      <FilterBar>
        <div className="min-w-52 flex-1">
          <SearchInput
            placeholder="Search by name, make, model, registration..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search vehicles"
          />
        </div>
        <div className="ml-auto flex items-center gap-3">
          {syncing ? <StatusIndicator label="SYNCING" status="warn" /> : null}
          <Switch
            label={archivedCount > 0 ? `Show archived (${archivedCount})` : "Show archived"}
            checked={showArchived}
            onChange={setShowArchived}
          />
        </div>
      </FilterBar>

      {vehicles.length === 0 ? (
        <EmptyState
          kicker="No results"
          title="No vehicles found"
          body={search ? `No vehicles match "${search}".` : "No archived vehicles in the fleet."}
          actionLabel="Clear Filters"
          onAction={() => {
            setQuery("");
            if (!search && showArchived) {
              setShowArchived(false);
            }
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onOpen={() => navigate(`/vehicles/${vehicle.id}`)}
              onAddFuel={() => setExpenseModal({ vehicle, kind: "fuel", editing: null })}
              onAddToll={() => setExpenseModal({ vehicle, kind: "toll", editing: null })}
              onEdit={() => {
                setEditForm(vehicleToForm(vehicle));
                setDetailVehicle(vehicle);
                setEditMode(true);
              }}
              onDetails={() => openDetail(vehicle)}
              onToggleArchive={() => void handleToggleArchive(vehicle)}
            />
          ))}
        </div>
      )}

      <HudDrawer
        open={Boolean(detailVehicle)}
        title={detailVehicle ? (editMode ? "Edit Vehicle" : detailVehicle.name) : "Vehicle"}
        onClose={() => {
          setDetailVehicle(null);
          setEditMode(false);
        }}
        wide
      >
        {detailVehicle && (
          <div className="space-y-5">
            {!editMode && (
              <div className="flex flex-wrap gap-2">
                <HudButton variant="ghost" onClick={() => setEditMode(true)}>
                  <Pencil size={14} className="mr-1.5" />
                  Edit
                </HudButton>
                <HudButton variant="ghost" onClick={() => void handleToggleArchive(detailVehicle)}>
                  {detailVehicle.archived ? (
                    <>
                      <ArchiveRestore size={14} className="mr-1.5" />
                      Restore
                    </>
                  ) : (
                    <>
                      <Archive size={14} className="mr-1.5" />
                      Archive
                    </>
                  )}
                </HudButton>
                <HudButton variant="danger" onClick={() => setConfirmDelete(detailVehicle)}>
                  <Trash2 size={14} className="mr-1.5" />
                  Delete
                </HudButton>
              </div>
            )}

            {editMode ? (
              <VehicleForm
                values={editForm}
                onChange={(patch) => setEditForm((prev) => ({ ...prev, ...patch }))}
                onSave={() => void handleUpdate()}
                saving={editSaving}
              />
            ) : (
              <div className="space-y-4">
                {detailVehicle.photo ? (
                  <div className="overflow-hidden border border-[color:var(--border)]">
                    <img
                      src={detailVehicle.photo}
                      alt={detailVehicle.name}
                      className="w-full object-cover"
                      style={{ maxHeight: "200px" }}
                    />
                  </div>
                ) : null}

                <HudFileUpload
                  accept="image/png,image/jpeg,image/webp"
                  label="Vehicle Photo"
                  state={photo.state}
                  error={photo.error}
                  onFile={(file) => void handlePhotoUpload(file)}
                  onClear={() => setPhoto({ state: "idle", fileName: "", error: null })}
                />

                <CommandPanel className="p-4">
                  <div className="space-y-3">
                    <DetailRow label="Type" value={KIND_LABELS[detailVehicle.kind]} />
                    <DetailRow label="Make" value={detailVehicle.make || "—"} />
                    <DetailRow label="Model" value={detailVehicle.model || "—"} />
                    <DetailRow label="Variant" value={detailVehicle.variant || "—"} />
                    <DetailRow label="Year" value={detailVehicle.year ? String(detailVehicle.year) : "—"} />
                    <DetailRow label="Color" value={detailVehicle.color || "—"} />
                  </div>
                </CommandPanel>

                <CommandPanel className="p-4">
                  <div className="space-y-3">
                    <DetailRow label="Registration" value={detailVehicle.registrationNumber || "—"} />
                    <DetailRow label="VIN / Chassis" value={detailVehicle.vin || "—"} />
                    <DetailRow label="Engine No." value={detailVehicle.engineNumber || "—"} />
                    <DetailRow label="Fuel Type" value={detailVehicle.fuelType || "—"} />
                    <DetailRow label="Transmission" value={detailVehicle.transmission || "—"} />
                    <DetailRow label="Linked Loan" value={loanLabel(detailVehicle)} />
                  </div>
                </CommandPanel>

                <CommandPanel className="p-4">
                  <div className="space-y-3">
                    <DetailRow label="Front Tyre" value={detailVehicle.frontTyre || "—"} />
                    <DetailRow label="Rear Tyre" value={detailVehicle.rearTyre || "—"} />
                  </div>
                </CommandPanel>

                <CommandPanel className="p-4">
                  <div className="space-y-3">
                    <DetailRow label="Purchase Date" value={detailVehicle.purchaseDate || "—"} />
                    <DetailRow label="Purchase Price" value={fmtPrice(detailVehicle.purchasePrice)} />
                    <DetailRow label="Current Value" value={fmtPrice(detailVehicle.currentValue)} />
                    <DetailRow label="Odometer" value={fmtOdometer(detailVehicle.currentOdometer)} />
                  </div>
                </CommandPanel>

                {detailVehicle.notes ? (
                  <CommandPanel className="p-4">
                    <div className="font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">Notes</div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{detailVehicle.notes}</p>
                  </CommandPanel>
                ) : null}
              </div>
            )}
          </div>
        )}
      </HudDrawer>

      <HudModal open={createOpen} title="Register Vehicle" onClose={() => setCreateOpen(false)} size="lg">
        <VehicleForm
          values={createForm}
          onChange={(patch) => setCreateForm((prev) => ({ ...prev, ...patch }))}
          onSave={() => void handleCreate()}
          saving={saving}
        />
      </HudModal>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete Vehicle"
        body={
          <p>
            Are you sure you want to permanently delete <strong>{confirmDelete?.name}</strong>? This action cannot be
            undone.
          </p>
        }
        confirmLabel="Delete"
        danger
        confirmDisabled={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(null)}
      />

      {expenseModal ? (
        <FuelChargeModal
          key={`${expenseModal.vehicle.id}-${expenseModal.editing?.id ?? "new"}-${expenseModal.kind}`}
          open
          vehicle={expenseModal.vehicle}
          kind={expenseModal.editing ? expenseModal.editing.type : expenseModal.kind}
          editing={expenseModal.editing}
          onClose={() => setExpenseModal(null)}
        />
      ) : null}
    </div>
  );
}