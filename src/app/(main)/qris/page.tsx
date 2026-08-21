import { redirect } from "next/navigation";

// QRIS is no longer a standalone menu — it is auto-generated inside the
// checkout flow for any bill, top-up, or order. Anyone landing here is
// sent to the payments hub.
export default function QrisPage() {
  redirect("/payments");
}
