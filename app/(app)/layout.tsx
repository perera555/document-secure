import { AppShell } from "@/components/AppShell";
import { AdminLockProvider } from "@/components/AdminLock";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AdminLockProvider>
      <AppShell>{children}</AppShell>
    </AdminLockProvider>
  );
}
