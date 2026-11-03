import { redirect } from "next/navigation";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import OperationsClient from "../operations-client";

export const dynamic = "force-dynamic";

export default async function TechniciansPage() {
  try {
    const user = await getCurrentUser(["admin", "staff"]);
    return <OperationsClient mode="technicians" role={user.role} />;
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/giris?next=%2Fpanel%2Fustalar");
    if (error instanceof PermissionDeniedError) redirect("/panel");
    throw error;
  }
}
