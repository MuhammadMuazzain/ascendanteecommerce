import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user || !ADMIN_EMAILS.includes(session.user.email)) {
    redirect("/");
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <AdminSidebar />
      <main className="w-full h-screen bg-background flex relative overflow-hidden">
        {children}
      </main>
    </SidebarProvider>
  );
};

export default AdminLayout;
