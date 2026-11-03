import { redirect } from "next/navigation";
import { AuthenticationRequiredError, getCurrentUser } from "@/lib/authorization";
import BillingClient from "./billing-client";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  try {
    const user = await getCurrentUser();
    if (!["admin", "technician", "customer"].includes(user.role)) redirect("/panel");
    return <BillingClient role={user.role} name={user.name} />;
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/giris?next=%2Fpanel%2Ffaturalar");
    throw error;
  }
}
