import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/auth";
import AdminTabs from "./AdminTabs";

// Admins are set up in SQL: update profiles set role = 'admin' where id = '<user id>';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireOnboarded();
  if (profile.role !== "admin") redirect("/home");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Admin</h1>
      <AdminTabs />
      {children}
    </div>
  );
}
