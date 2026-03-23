import Image from "next/image";
import Link from "next/link";

const links = [
  { label: "Browse Farms", href: "/stores" },
  { label: "Policies", href: "/policies" },
  { label: "Help", href: "/help" },
  { label: "Start Selling", href: "/seller/register" },
  { label: "Contact", href: "mailto:hello@localroots.com" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--lr-border)] px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-[color:var(--lr-muted)]">
          <Image src="/local-roots-logo.png" alt="" width={20} height={20} />
          <span className="font-[family-name:var(--font-lr-serif)] font-semibold text-[color:var(--lr-ink)]">
            LocalRoots
          </span>{" "}
          &copy; {new Date().getFullYear()}
        </p>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-sm text-[color:var(--lr-muted)] transition-colors hover:text-[color:var(--lr-ink)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
