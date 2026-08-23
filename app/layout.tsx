import type { Metadata } from "next";
import Link from "next/link";
import NewsletterSignup from "@/components/NewsletterSignup";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kenyans in Darwin Welfare Association — KIDAW",
  description:
    "Kenyans in Darwin Welfare Association keeps one register, one ledger, and one number for every member.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <div className="site-flags" aria-hidden />
          <nav className="nav">
            <Link
              href="/"
              className="nav-brand"
              style={{ display: "inline-flex", alignItems: "center", gap: 12 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-mark.png"
                alt="KIDAW logo — black, red and green hands encircling a family"
                style={{ height: 36, width: "auto" }}
              />
              <span>
                Kenyans in Darwin{" "}
                <span
                  style={{
                    fontSize: 12,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-body)",
                    color: "var(--color-accent-2)",
                  }}
                >
                  Welfare Association
                </span>
              </span>
            </Link>
            <div className="nav-links">
              <Link href="/">Home</Link>
              <Link href="/register">Register</Link>
              <Link href="/portal">Member portal</Link>
              <Link href="/registry">Registry</Link>
              <Link href="/ledger">Ledger</Link>
              <Link href="/gallery">Gallery</Link>
              <Link href="/stack">Stack</Link>
              <a href="mailto:contact@kidawelfare.org">Contact us</a>
              <Link href="/register" className="btn btn-primary" style={{ padding: "6px 14px" }}>
                Join now
              </Link>
            </div>
          </nav>
          <div className="flag-stripe" aria-hidden />
          <div style={{ flex: 1 }}>{children}</div>
          <footer className="site-footer">
            <div className="site-footer-top">
              <NewsletterSignup />
              <div className="site-footer-contact">
                <div className="newsletter-title">Contact</div>
                <p className="newsletter-blurb" style={{ marginBottom: 6 }}>
                  Questions about membership, records or contributions?
                </p>
                <a href="mailto:contact@kidawelfare.org">contact@kidawelfare.org</a>
              </div>
            </div>
            <div className="site-footer-bottom">
              <span>
                © {new Date().getFullYear()} Kenyans in Darwin Welfare Association (KIDAW)
              </span>
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
                <span>
                  Flag maps:{" "}
                  <a
                    href="https://commons.wikimedia.org/wiki/File:Flag-map_of_Australia.svg"
                    style={{ color: "inherit" }}
                  >
                    Wikimedia Commons
                  </a>{" "}
                  (CC BY-SA 4.0)
                </span>
              </span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
