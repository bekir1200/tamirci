import { redirect } from "next/navigation";
import { AuthenticationRequiredError, getCurrentUser } from "@/lib/authorization";
import PanelDashboard from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  try {
    const user = await getCurrentUser();
    return <PanelDashboard user={user} />;
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/giris?next=%2Fpanel");
    throw error;
  }
}
