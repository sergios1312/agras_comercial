import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AcademyTabs } from "@/components/academy/AcademyTabs";

export default async function AcademyPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-hidden bg-slate-950">
      <AcademyTabs />
    </div>
  );
}
