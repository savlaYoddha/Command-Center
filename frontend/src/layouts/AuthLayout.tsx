import { Outlet } from "react-router-dom";
import { GridBackground, ScanlineBackground } from "@/components/hud/Atmosphere";
import { PageTransition } from "@/components/ui";
import { BootProvider } from "@/motion/boot";

export function AuthLayout() {
  return (
    <BootProvider>
      <div className="relative flex min-h-dvh items-center justify-center bg-[color:var(--bg-primary)] p-4">
        <GridBackground />
        <ScanlineBackground />
        <div className="relative w-full max-w-md">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </div>
    </BootProvider>
  );
}
