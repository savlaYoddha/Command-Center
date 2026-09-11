import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Archive, ArchiveRestore, Banknote, FileStack, Fuel, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/hud/PageHeader";
import { CommandPanel } from "@/components/hud/CommandPanel";
import { HudButton } from "@/components/hud/HudButton";
import { HudBackButton } from "@/components/hud/HudBackButton";
import { HudDrawer } from "@/components/hud/HudDrawer";
import { HudFileUpload, type HudFileUploadState } from "@/components/hud/HudFileUpload";
import { HudInput } from "@/components/hud/HudInput";
import { HudModal } from "@/components/hud/HudModal";
import { ConfirmDialog } from "@/components/hud/ConfirmDialog";
import { EmptyState } from "@/components/hud/EmptyState";
import { LoadingState } from "@/components/hud/LoadingState";
import { LabelBadge } from "@/components/hud/LabelBadge";
import { MetricCard } from "@/components/hud/MetricCard";
import { notify } from "@/store/toastStore";
import { vehicleApi } from "../services/vehicles";
import type { Vehicle } from "../types";
import { useVehicleExpenseStore, type LinkedDocument, type VehicleExpense } from "../vehicleExpenseStore";
import { FuelChargeModal, VehicleExpenseList } from "../VehicleExpenses";
import {
  KIND_COLORS,
  KIND_LABELS,
  DetailRow,
  VehicleForm,
  emptyForm,
  fmtOdometer,
  fmtPrice,
  vehicleToForm,
} from "../vehiclesUi";
import { useLoanStore } from "@/modules/finance/loans/loanStore";
import { computeMetrics, inr } from "@/modules/finance/loans/loanEngine";

function PanelTitle({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">
      {icon ? <span className="text-[color:var(--accent)]">{icon}</span> : null}
      {label}
    </div>
  );
}

function SectionEmpty({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="border border-dashed border-[color:var(--border)] px-4 py-6 text-center">
      <div className="font-display text-[9px] tracking-[0.24em] text-[color:var(--accent)] uppercase">{kicker}</div>
      <p className="mt-1.5 text-xs text-text-secondary">{body}</p>
    </div>
  );
}

export function VehicleDetailPage({ vehicleId }: { vehicleId?: string }) {
  const navigate = useNavigate();
  const routeParams = useParams<{ vehicleId: string }>();
  const activeId = vehicleId ?? routeParams.vehicleId;
  const loans = useLoanStore((s) => s.loans);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm());
  const [editSaving, setEditSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [expenseModal, setExpenseModal] = useState<{ kind: "fuel" | "toll"; editing: VehicleExpense | null } | null>(null);
  const [docModal, setDocModal] = useState<{ open: boolean; editing: LinkedDocument | null; draft: { title: string; link: string; note: string } }>({
    open: false,
    editing: null,
    draft: { title: "", link: "", note: "" },
  });
  const linkedDocs = useVehicleExpenseStore((s) => s.documents);
  const addDocument = useVehicleExpenseStore((s) => s.addDocument);
  const updateDocument = useVehicleExpenseStore((s) => s.updateDocument);
  const deleteDocument = useVehicleExpenseStore((s) => s.deleteDocument);

  const [photo, setPhoto] = useState<{ state: HudFileUploadState; fileName: string; error: string | null }>({
    state: "idle",
    fileName: "",
    error: null,
  });

  const load = useCallback(async () => {
    if (!activeId) {
      setVehicle(null);
      setError("Vehicle record not found.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await vehicleApi.get(activeId);
      setVehicle(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load vehicle.");
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const linked = vehicle?.loanId ? loans.find((l) => l.id === vehicle.loanId) ?? null : null;
  const metrics = linked ? computeMetrics(linked) : null;

  function startEdit() {
    if (!vehicle) return;
    setEditForm(vehicleToForm(vehicle));
    setEditOpen(true);
  }

  async function handleUpdate() {
    if (!vehicle) return;
    try {
      setEditSaving(true);
      const updated = await vehicleApi.update(vehicle.id, editForm);
      setVehicle(updated);
      setEditOpen(false);
      notify("success", "VEHICLE UPDATED", `${updated.name} details saved.`);
    } catch (err: unknown) {
      notify("error", "UPDATE FAILED", err instanceof Error ? err.message : "Failed to update vehicle.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleToggleArchive() {
    if (!vehicle) return;
    try {
      const updated = vehicle.archived
        ? await vehicleApi.unarchive(vehicle.id)
        : await vehicleApi.archive(vehicle.id);
      setVehicle(updated);
      notify("success", vehicle.archived ? "VEHICLE RESTORED" : "VEHICLE ARCHIVED", updated.name);
    } catch (err: unknown) {
      notify("error", "ACTION FAILED", err instanceof Error ? err.message : "Failed to update archive state.");
    }
  }

  async function handleDelete() {
    if (!vehicle) return;
    try {
      setDeleting(true);
      await vehicleApi.delete(vehicle.id);
      notify("success", "VEHICLE DELETED", `${vehicle.name} was permanently removed.`);
      navigate("/vehicles");
    } catch (err: unknown) {
      notify("error", "DELETE FAILED", err instanceof Error ? err.message : "Failed to delete vehicle.");
    } finally {
      setDeleting(false);
    }
  }

  async function handlePhotoUpload(file: File) {
    if (!vehicle) return;
    try {
      setPhoto({ state: "uploading", fileName: file.name, error: null });
      const result = await vehicleApi.uploadPhoto(vehicle.id, file);
      setVehicle((prev) => (prev ? { ...prev, photo: result.photo } : prev));
      setPhoto({ state: "success", fileName: file.name, error: null });
      notify("success", "PHOTO UPLOADED", `${vehicle.name} photo updated.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload photo.";
      setPhoto({ state: "error", fileName: file.name, error: message });
      notify("error", "UPLOAD FAILED", message);
    }
  }

  function openDocModal(document: LinkedDocument | null) {
    setDocModal({
      open: true,
      editing: document,
      draft: document ? { title: document.title, link: document.link, note: document.note ?? "" } : { title: "", link: "", note: "" },
    });
  }

  function saveDocument() {
    if (!vehicle) return;
    const { draft, editing } = docModal;
    if (!draft.title.trim()) {
      notify("warning", "TITLE REQUIRED", "Give the document a title.");
      return;
    }
    if (editing) {
      updateDocument(editing.id, { title: draft.title.trim(), link: draft.link.trim(), note: draft.note.trim() });
      notify("success", "DOCUMENT UPDATED", `${editing.title} updated for ${vehicle.name}.`);
    } else {
      addDocument({ vehicleId: vehicle.id, title: draft.title.trim(), link: draft.link.trim(), note: draft.note.trim() });
      notify("success", "DOCUMENT ADDED", `${draft.title.trim()} linked to ${vehicle.name}.`);
    }
    setDocModal((current) => ({ ...current, open: false, editing: null }));
  }

  if (loading && !vehicle) return <LoadingState label="LOADING VEHICLE RECORD..." />;

  if (error || !vehicle) {
    return (
      <EmptyState
        kicker="System error"
        title="Unable to load vehicle"
        body={error ?? "Vehicle record not found."}
        actionLabel="Back to Vehicles"
        onAction={() => navigate("/vehicles")}
      />
    );
  }

  const tyres = [vehicle.frontTyre, vehicle.rearTyre].filter(Boolean).join(" · ") || "—";

  return (
    <div className="space-y-6">
      <HudBackButton label="BACK TO VEHICLES" to="/vehicles" />

      <PageHeader
        kicker="Fleet systems"
        title={vehicle.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <LabelBadge color={KIND_COLORS[vehicle.kind]}>{KIND_LABELS[vehicle.kind]}</LabelBadge>
            <HudButton variant="ghost" onClick={startEdit}>
              <Pencil size={14} className="mr-1.5" />
              Edit
            </HudButton>
            <HudButton variant="ghost" onClick={() => void handleToggleArchive()}>
              {vehicle.archived ? (
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
            <HudButton variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} className="mr-1.5" />
              Delete
            </HudButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard value={fmtPrice(vehicle.currentValue)} label="Current Value" />
        <MetricCard value={fmtOdometer(vehicle.currentOdometer)} label="Odometer" />
        <MetricCard value={fmtPrice(vehicle.purchasePrice)} label="Purchase Price" />
        <MetricCard value={vehicle.year ? String(vehicle.year) : "—"} label="Year" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          {vehicle.photo ? (
            <div className="overflow-hidden border border-[color:var(--border)]">
              <img src={vehicle.photo} alt={vehicle.name} className="w-full object-cover" />
            </div>
          ) : null}
          <HudFileUpload
            accept="image/png,image/jpeg,image/webp"
            label={vehicle.photo ? "Replace Photo" : "Upload Photo"}
            state={photo.state}
            error={photo.error}
            onFile={(file) => void handlePhotoUpload(file)}
            onClear={() => setPhoto({ state: "idle", fileName: "", error: null })}
          />
          <CommandPanel className="p-4">
            <PanelTitle label="Identity" />
            <div className="space-y-3">
              <DetailRow label="Type" value={KIND_LABELS[vehicle.kind]} />
              <DetailRow label="Make" value={vehicle.make || "—"} />
              <DetailRow label="Model" value={vehicle.model || "—"} />
              <DetailRow label="Variant" value={vehicle.variant || "—"} />
              <DetailRow label="Color" value={vehicle.color || "—"} />
            </div>
          </CommandPanel>
        </div>

        <div className="space-y-4">
          <CommandPanel className="p-4">
            <PanelTitle label="Identification" />
            <div className="space-y-3">
              <DetailRow label="Registration" value={vehicle.registrationNumber || "—"} />
              <DetailRow label="VIN / Chassis" value={vehicle.vin || "—"} />
              <DetailRow label="Engine No." value={vehicle.engineNumber || "—"} />
              <DetailRow label="Fuel Type" value={vehicle.fuelType || "—"} />
              <DetailRow label="Transmission" value={vehicle.transmission || "—"} />
            </div>
          </CommandPanel>

          <CommandPanel className="p-4">
            <PanelTitle label="Tyres" />
            <div className="space-y-3">
              <DetailRow label="Front Tyre" value={vehicle.frontTyre || "—"} />
              <DetailRow label="Rear Tyre" value={vehicle.rearTyre || "—"} />
              <DetailRow label="Fitment" value={tyres} />
            </div>
          </CommandPanel>

          <CommandPanel className="p-4">
            <PanelTitle label="Purchase" />
            <div className="space-y-3">
              <DetailRow label="Purchase Date" value={vehicle.purchaseDate || "—"} />
              <DetailRow label="Purchase Price" value={fmtPrice(vehicle.purchasePrice)} />
              <DetailRow label="Current Value" value={fmtPrice(vehicle.currentValue)} />
              <DetailRow label="Odometer" value={fmtOdometer(vehicle.currentOdometer)} />
            </div>
          </CommandPanel>
        </div>

        <div className="space-y-4">
          <CommandPanel className="p-4">
            <PanelTitle icon={<Banknote size={13} />} label="Linked Loan" />
            {linked && metrics ? (
              <div className="space-y-3">
                <DetailRow
                  label="Loan"
                  value={`${linked.loanId} · ${linked.name}`}
                />
                <DetailRow label="Lender" value={linked.lender || "—"} />
                <DetailRow label="Status" value={linked.status.toUpperCase()} />
                <DetailRow label="Outstanding" value={inr(metrics.outstanding)} />
                <DetailRow label="EMI" value={inr(metrics.nextEmiAmount || linked.emi)} />
                <DetailRow label="Next EMI Date" value={metrics.nextEmiDate || "—"} />
                <DetailRow
                  label="Repaid"
                  value={`${metrics.emisCompleted} of ${linked.tenureMonths} EMIs (${Math.round(metrics.repaidPercent)}%)`}
                />
                <div className="border-t border-[color:var(--border)] pt-3">
                  <div className="mb-2 font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">
                    Payment History
                  </div>
                  {linked.payments.length > 0 ? (
                    <div className="space-y-2">
                      {linked.payments
                        .slice()
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] pb-2 last:border-0 last:pb-0"
                          >
                            <div>
                              <div className="text-sm text-text-primary">{payment.type}</div>
                              <div className="text-xs text-text-muted">{payment.date}</div>
                            </div>
                            <div className="text-sm text-text-primary">{inr(payment.amount)}</div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <SectionEmpty kicker="No payments" body="No payments recorded against this loan yet." />
                  )}
                </div>
              </div>
            ) : (
              <SectionEmpty
                kicker="No loan linked"
                body="Link this vehicle to a loan from the Finance module to see outstanding, EMI and payment history here."
              />
            )}
          </CommandPanel>

          <CommandPanel className="p-4">
            <PanelTitle icon={<Fuel size={13} />} label="Fuel Cost" />
            <VehicleExpenseList
              vehicle={vehicle}
              onAdd={() => setExpenseModal({ kind: "fuel", editing: null })}
              onEdit={(expense) => setExpenseModal({ kind: expense.type, editing: expense })}
            />
            {vehicle.kind === "car" ? (
              <div className="mt-3 border-t border-[color:var(--border)] pt-3">
                <HudButton variant="ghost" onClick={() => setExpenseModal({ kind: "toll", editing: null })}>
                  <Plus size={13} className="mr-1" />
                  Add toll charge
                </HudButton>
              </div>
            ) : null}
          </CommandPanel>

          <CommandPanel className="p-4">
            <PanelTitle icon={<FileStack size={13} />} label="Linked documents" />
            {linkedDocs.filter((doc) => doc.vehicleId === vehicle.id).length === 0 ? (
              <SectionEmpty
                kicker="No documents"
                body="Link RC, insurance, invoices or warranty papers to this vehicle."
              />
            ) : (
              <div className="space-y-2">
                {linkedDocs.filter((doc) => doc.vehicleId === vehicle.id).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] pb-2 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-text-primary">{doc.title}</div>
                      <div className="mt-0.5 truncate text-xs text-text-muted">
                        {doc.link ? (
                          <a href={doc.link} target="_blank" rel="noopener noreferrer" className="text-[color:var(--accent)]">{doc.link}</a>
                        ) : doc.note || "—"}
                      </div>
                      {doc.link && doc.note ? <div className="truncate text-xs text-text-muted">{doc.note}</div> : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <HudButton variant="ghost" className="!min-h-0 px-1.5 py-0.5" aria-label={`Edit ${doc.title}`} onClick={() => openDocModal(doc)}><Pencil size={12} /></HudButton>
                      <HudButton variant="ghost" className="!min-h-0 px-1.5 py-0.5 text-[color:var(--danger)]" aria-label={`Delete ${doc.title}`} onClick={() => { deleteDocument(doc.id); notify("success", "DOCUMENT REMOVED", `${doc.title} unlinked from ${vehicle.name}.`); }}><Trash2 size={12} /></HudButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 border-t border-[color:var(--border)] pt-3">
              <HudButton variant="ghost" onClick={() => openDocModal(null)}>
                <Plus size={13} className="mr-1" />
                Add document
              </HudButton>
            </div>
          </CommandPanel>

          <CommandPanel className="p-4">
            <PanelTitle icon={<Wrench size={13} />} label="Service Details" />
            <SectionEmpty
              kicker="No service records"
              body="Service history and maintenance details will appear here once logged."
            />
          </CommandPanel>

          {vehicle.notes ? (
            <CommandPanel className="p-4">
              <PanelTitle label="Notes" />
              <p className="whitespace-pre-wrap text-sm text-text-secondary">{vehicle.notes}</p>
            </CommandPanel>
          ) : null}
        </div>
      </div>

      <HudDrawer open={editOpen} title="Edit Vehicle" onClose={() => setEditOpen(false)} wide>
        <VehicleForm
          values={editForm}
          onChange={(patch) => setEditForm((prev) => ({ ...prev, ...patch }))}
          onSave={() => void handleUpdate()}
          saving={editSaving}
        />
      </HudDrawer>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Vehicle"
        body={
          <p>
            Are you sure you want to permanently delete <strong>{vehicle.name}</strong>? This action cannot be undone.
          </p>
        }
        confirmLabel="Delete"
        danger
        confirmDisabled={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />

      {expenseModal ? (
        <FuelChargeModal
          key={`${expenseModal.kind}-${expenseModal.editing?.id ?? "new"}`}
          open
          vehicle={vehicle}
          kind={expenseModal.kind}
          editing={expenseModal.editing}
          onClose={() => setExpenseModal(null)}
        />
      ) : null}

      <HudModal
        open={docModal.open}
        title={docModal.editing ? `Edit document — ${docModal.editing.title}` : "Link document"}
        size="md"
        onClose={() => setDocModal((current) => ({ ...current, open: false, editing: null }))}
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <HudInput label="Title" value={docModal.draft.title} onChange={(e) => setDocModal((current) => ({ ...current, draft: { ...current.draft, title: e.target.value } }))} placeholder="e.g. RC copy, Insurance, Showroom invoice" />
            <HudInput label="Link / reference" value={docModal.draft.link} onChange={(e) => setDocModal((current) => ({ ...current, draft: { ...current.draft, link: e.target.value } }))} placeholder="URL, drive link, or reference no." />
          </div>
          <HudInput label="Note (optional)" value={docModal.draft.note} onChange={(e) => setDocModal((current) => ({ ...current, draft: { ...current.draft, note: e.target.value } }))} placeholder="Expiry date, policy no., remarks…" />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <HudButton variant="ghost" onClick={() => setDocModal((current) => ({ ...current, open: false, editing: null }))}>Cancel</HudButton>
          <HudButton onClick={saveDocument}>{docModal.editing ? "Save changes" : "Add document"}</HudButton>
        </div>
      </HudModal>
    </div>
  );
}