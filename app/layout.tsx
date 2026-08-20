import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "KIDA Welfare Association",
  description:
    "KIDA Welfare keeps one register, one ledger, and one number for every member.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <nav className="nav">
            <Link href="/" className="nav-brand">
              KIDA Welfare<span style={{ color: "var(--color-accent)" }}> ·</span>{" "}
              <span
                style={{
                  fontSize: 12,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-body)",
                }}
              >
                Association
              </span>
            </Link>
            <div className="nav-links">
              <Link href="/">Home</Link>
              <Link href="/register">Register</Link>
              <Link href="/portal">Member portal</Link>
              <Link href="/registry">Registry</Link>
              <Link href="/stack">Stack</Link>
            </div>
          </nav>
          <div style={{ flex: 1 }}>{children}</div>
          <footer className="site-footer">
            <span>© {new Date().getFullYear()} KIDA Welfare Association</span>
            <span style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <Link href="/policy" style={{ color: "inherit" }}>
                Membership policy
              </Link>
              <Link href="/privacy" style={{ color: "inherit" }}>
                Privacy policy
              </Link>
              <span className="tabular">
                Member numbers issued in the KIDAW series
              </span>
            </span>
          </footer>
        </div>
      </body>
    </html>
  );
}
