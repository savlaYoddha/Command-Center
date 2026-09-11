import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { CommandPanel } from "@/components/hud/CommandPanel";
import { HudButton } from "@/components/hud/HudButton";
import { HudInput } from "@/components/hud/HudInput";
import { BrandMark } from "@/components/layout/BrandMark";
import { useAuthStore } from "@/store/authStore";

export function LoginPage() {
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to authenticate.");
    } finally {
      setPending(false);
    }
  }

  return (
    <CommandPanel hatch className="p-6">
      <BrandMark />
      <div className="mt-6 font-display text-[10px] tracking-[0.28em] text-[color:var(--accent)] uppercase">
        Restricted access
      </div>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <HudInput
          id="username"
          label="Operator ID"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <HudInput
          id="password"
          label="Passcode"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error ? <p className="text-sm text-[color:var(--danger)]">{error}</p> : null}
        <HudButton type="submit" disabled={pending} className="w-full">
          {pending ? "Authenticating" : "Enter commandcenter"}
        </HudButton>
      </form>
    </CommandPanel>
  );
}
