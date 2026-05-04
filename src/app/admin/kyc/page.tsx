import { Metadata } from "next"; // Tambahkan import ini
import { AdminShell } from "../AdminShell";
import KycApprovalsClient from "./KycApprovalsClient";

// Tambahkan Metadata untuk judul tab browser
export const metadata: Metadata = {
  title: "KYC Approvals | LemariHub Admin",
  description: "Halaman persetujuan verifikasi identitas penjual.",
};

export default function KycApprovalsPage() {
  return (
    <AdminShell current="kyc">
      <KycApprovalsClient />
    </AdminShell>
  );
}