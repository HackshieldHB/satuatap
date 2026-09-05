import { redirect } from "next/navigation";

// Superseded by the real /access guest passes + door unlock.
export default function Page() {
  redirect("/access");
}
