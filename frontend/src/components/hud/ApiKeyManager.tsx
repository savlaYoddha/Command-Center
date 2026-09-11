import { useEffect, useState } from "react";
import { CheckboxControl } from "@/components/ui/FormControls";
import { ConfirmDialog } from "./ConfirmDialog";
import { HudButton } from "./HudButton";
import { HudInput } from "./HudInput";
import { HudModal } from "./HudModal";
import { api } from "@/services/api";
import { notify } from "@/store/toastStore";

type KeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: number;
  lastUsedAt: number | null;
};

const SCOPES = ["tasks:read", "tasks:write", "tasks:delete", "tasks:manage"] as const;

export function ApiKeyManager() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState("Automation");
  const [scopes, setScopes] = useState<string[]>(["tasks:read", "tasks:write"]);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  async function reload() {
    setKeys(await api.get<KeyRow[]>("/api/v1/api-keys"));
  }

  useEffect(() => {
    void reload();
  }, []);

  function closeReveal() {
    setRevealed(null);
    setCopied(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Keys are hashed at rest. The full token is shown only once. Use{" "}
        <code className="text-[color:var(--accent)]">Authorization: Bearer cc_live_…</code> from external apps or voice
        assistants.
      </p>
      <HudInput label="Key name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {SCOPES.map((scope) => (
          <label key={scope} className="flex items-center gap-1 font-display text-[10px] tracking-[0.12em] uppercase">
            <CheckboxControl
              aria-label={`Scope ${scope}`}
              checked={scopes.includes(scope)}
              onChange={() =>
                setScopes((current) =>
                  current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
                )
              }
            />
            {scope}
          </label>
        ))}
      </div>
      <HudButton
        type="button"
        className="mt-2"
        onClick={() => {
          if (!name.trim() || scopes.length === 0) return;
          void api.post<{ key: string }>("/api/v1/api-keys", { name: name.trim(), scopes }).then((created) => {
            setRevealed(created.key);
            notify("success", "API KEY CREATED");
            return reload();
          });
        }}
      >
        Create API key
      </HudButton>
      <div className="space-y-2">
        {keys.map((key) => (
          <div key={key.id} className="flex flex-wrap items-center justify-between gap-2 border border-[color:var(--border)] p-2">
            <div>
              <div className="text-sm">{key.name}</div>
              <div className="font-display text-[10px] text-text-muted">
                {key.keyPrefix}… · {key.scopes.join(" ")}
              </div>
            </div>
            <HudButton type="button" variant="danger" onClick={() => setRevokeId(key.id)}>
              Revoke
            </HudButton>
          </div>
        ))}
      </div>
      <HudModal open={Boolean(revealed)} title="API KEY CREATED" onClose={closeReveal} closeOnBackdrop>
        <div className="space-y-4">
          <div className="font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">Automation access token</div>
          <p className="text-sm text-text-secondary">Copy this key now. It will not be shown again.</p>
          <code className="block break-all border border-[color:var(--border)] bg-[color:var(--input-bg)] p-3 text-xs text-[color:var(--accent)]">
            {revealed}
          </code>
          <div className="flex flex-wrap gap-2">
            <HudButton
              type="button"
              onClick={() => {
                if (!revealed) return;
                void navigator.clipboard.writeText(revealed).then(() => setCopied(true));
              }}
            >
              {copied ? "Copied" : "Copy token"}
            </HudButton>
            <HudButton type="button" variant="ghost" onClick={closeReveal}>
              Done
            </HudButton>
          </div>
          <div className="border border-[color:var(--warning)] p-3">
            <div className="font-display text-[10px] tracking-[0.2em] text-[color:var(--warning)] uppercase">Warning</div>
            <p className="mt-1 text-sm text-text-secondary">This token will only be displayed once.</p>
          </div>
        </div>
      </HudModal>
      <ConfirmDialog
        open={Boolean(revokeId)}
        title="Revoke API key"
        danger
        confirmLabel="Revoke"
        body={<p>This token will stop working immediately.</p>}
        onCancel={() => setRevokeId(null)}
        onConfirm={() => {
          if (!revokeId) return;
          void api.delete(`/api/v1/api-keys/${revokeId}`).then(() => {
            setRevokeId(null);
            notify("warning", "API KEY REVOKED");
            return reload();
          });
        }}
      />
    </div>
  );
}
