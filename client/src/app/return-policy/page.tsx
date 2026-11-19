// src/app/return-policy/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, PackageCheck, RotateCcw } from "lucide-react";

const WHATSAPP_NUMBER = "8801894302115";

// ✏️ Edit the rules here — the page updates itself.
const RETURN_DAYS = 3; // days after delivery to ask for a return / exchange

const ELIGIBLE = [
  "Wrong product, wrong size or wrong design delivered",
  "Damaged or defective product",
  "Size does not fit (exchange for another size, subject to stock)",
];

const NOT_ELIGIBLE = [
  "Product that is washed, worn or has no original tags/packaging",
  "Custom-printed items (name / number printing) and items with a UCL patch added at your request, unless we made the mistake",
  "Pre-order items cancelled after we have already placed the order with the supplier",
  "Requests made after the return window",
];

const STEPS = [
  {
    title: "Message us",
    text: `Within ${RETURN_DAYS} days of delivery, WhatsApp us your order phone number and a photo of the product.`,
  },
  {
    title: "We check",
    text: "We confirm the issue and tell you if it is a return or an exchange.",
  },
  {
    title: "Send it back",
    text: "Pack the product with its tags and we arrange the pickup / courier return.",
  },
  {
    title: "Exchange or refund",
    text: "Your replacement is sent, or your money is refunded, after we receive and check the product.",
  },
];

export const metadata: Metadata = {
  title: "Return Policy | Kickwear",
  description: `Return and exchange policy of Kickwear. Wrong or damaged product? Tell us within ${RETURN_DAYS} days of delivery.`,
  alternates: { canonical: "/return-policy" },
};

export default function ReturnPolicyPage() {
  const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "Assalamu Alaikum, I want to return / exchange my order.",
  )}`;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <RotateCcw className="h-6 w-6" />
        </span>
        <h1 className="font-display text-3xl font-bold md:text-4xl">Return Policy</h1>
        <p className="mt-2 text-muted-foreground">
          Wrong or damaged product? Tell us within {RETURN_DAYS} days of delivery and we will
          make it right.
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <PackageCheck className="h-5 w-5 text-green-600" /> We accept returns / exchanges for
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {ELIGIBLE.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="mb-3 font-semibold">We cannot accept</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {NOT_ELIGIBLE.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="mb-4 font-semibold">How it works</h2>
          <ol className="space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
          <h2 className="mb-2 font-semibold text-foreground">Good to know</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Delivery charge is paid by us if the mistake is ours (wrong or damaged product).</li>
            <li>For size exchange or change of mind, the delivery charge is paid by the customer.</li>
            <li>Refunds are sent to your bKash / Nagad number after we receive the product.</li>
          </ul>
        </section>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-semibold text-white hover:bg-green-700"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp us
          </a>
          <Link
            href="/track-order"
            className="inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-semibold hover:bg-secondary"
          >
            Track your order
          </Link>
        </div>
      </div>
    </div>
  );
}