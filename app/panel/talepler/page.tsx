import { redirect } from "next/navigation";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import OperationsClient from "../operations-client";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  try {
    const user = await getCurrentUser(["admin", "staff"]);
    return <OperationsClient mode="requests" role={user.role} name={user.name} />;
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/giris?next=%2Fpanel%2Ftalepler");
    if (error instanceof PermissionDeniedError) redirect("/panel");
    throw error;
  }
}
