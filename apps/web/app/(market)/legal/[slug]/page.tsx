import { notFound } from "next/navigation";
import { LegalView } from "@marketplace/ui";

const pages: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "Terms of use",
    body: [
      "This deployment is a demonstration marketplace. Listings, balances, and payments are sample data.",
      "Named services are not sponsors and have not authorized account resale. Do not use the demo to trade live accounts, payment cards, or phone numbers.",
      "Orders store server-calculated prices. A mock payment webhook is required before inventory is reserved.",
    ],
  },
  privacy: {
    title: "Privacy",
    body: [
      "The demo runtime keeps accounts, orders, and encrypted inventory in process memory unless PostgreSQL is configured.",
      "Inventory payloads are encrypted. Product, admin, and analytics responses do not include plaintext secrets.",
      "Card numbers and CVV are rejected and are not stored. A production card flow would use a licensed issuer's hosted fields.",
    ],
  },
  refunds: {
    title: "Refunds",
    body: [
      "Admins can refund a captured demo payment. The ledger posts a reversing entry.",
      "Units that were delivered or revealed are quarantined. They are not returned to available stock.",
      "Reserved units that were never revealed can return to available stock when a payment fails before delivery.",
    ],
  },
  "acceptable-use": {
    title: "Acceptable use",
    body: [
      "Do not submit real passwords, recovery codes, PANs, or CVVs.",
      "Phone-number and virtual-card providers in this build are mocks and perform no provisioning.",
      "Seller approval is required before a reseller listing is public. Platform staff can suspend a seller and hide that seller's listings.",
    ],
  },
};

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();
  return <LegalView title={page.title} body={page.body} />;
}
