import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help — Local Roots",
  description: "Answers to common questions for buyers and sellers on Local Roots.",
};

const buyerFaqs = [
  {
    question: "How do I pick up my box?",
    answer:
      "When you arrive at the farm or pickup location, open your order in the LocalRoots app and show your 6-digit code or QR code to the seller. They'll scan or enter it to confirm your pickup and release your payment.",
  },
  {
    question: "How do I pause or cancel my subscription?",
    answer:
      "Go to your subscription page from your buyer dashboard and click Manage. You can pause or cancel at any time. Changes made before the pickup-window cutoff take effect immediately with no charge.",
  },
  {
    question: "What if something is wrong with my order?",
    answer:
      "Contact the farmer directly through your order page — they're best placed to make it right. If you're unable to resolve it, email us at hello@localroots.com and we'll step in.",
  },
  {
    question: "How does billing work?",
    answer:
      "Your card is authorized before pickup but only charged when the seller confirms your pickup using your code or QR scan. If you don't pick up, the authorization is voided and no charge is made.",
  },
];

const sellerFaqs = [
  {
    question: "How do I set up my store?",
    answer:
      "After registering as a seller, you'll be guided through a 4-step setup wizard: create your store profile, add your products and box options, set your pickup schedule and location, and connect your Stripe account to receive payouts.",
  },
  {
    question: "How do I get paid?",
    answer:
      "LocalRoots uses Stripe Connect to send payouts directly to your bank account. Funds are released after you confirm a buyer's pickup by scanning their QR code or entering their 6-digit code on your seller dashboard.",
  },
  {
    question: "How do refunds work?",
    answer:
      "You can issue a refund from your seller dashboard for any order in a picked-up or ready state. Refunds are processed back to the buyer's original payment method through Stripe.",
  },
  {
    question: "How do I see my store's performance?",
    answer:
      "Your analytics dashboard shows your total active subscribers, pickup rate, and revenue over time. Access it from the main menu in your seller dashboard.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-sm font-semibold text-[color:var(--lr-ink)]">{question}</dt>
      <dd className="text-sm text-[color:var(--lr-muted)]">{answer}</dd>
    </div>
  );
}

export default function HelpPage() {
  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-6 py-10">
      <header className="grid gap-2">
        <h1 className="font-[family-name:var(--font-lr-serif)] text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
          How can we help?
        </h1>
        <p className="text-sm text-[color:var(--lr-muted)]">
          Common questions for buyers and sellers on LocalRoots.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Buyer column */}
        <section className="lr-card lr-card-strong grid gap-6 p-6">
          <h2 className="font-[family-name:var(--font-lr-serif)] text-xl font-semibold text-[color:var(--lr-ink)]">
            For Buyers
          </h2>
          <dl className="grid gap-5">
            {buyerFaqs.map((faq) => (
              <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </dl>
        </section>

        {/* Seller column */}
        <section className="lr-card lr-card-strong grid gap-6 p-6">
          <h2 className="font-[family-name:var(--font-lr-serif)] text-xl font-semibold text-[color:var(--lr-ink)]">
            For Sellers
          </h2>
          <dl className="grid gap-5">
            {sellerFaqs.map((faq) => (
              <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </dl>
        </section>
      </div>

      <p className="text-sm text-[color:var(--lr-muted)]">
        Still need help? Email us at{" "}
        <Link
          href="mailto:hello@localroots.com"
          className="text-[color:var(--lr-leaf)] underline underline-offset-2 hover:opacity-80"
        >
          hello@localroots.com
        </Link>
      </p>
    </main>
  );
}
