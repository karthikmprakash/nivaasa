import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Nivaasa — The operating system for modern communities",
    template: "%s · Nivaasa",
  },
  description:
    "Nivaasa brings security, community, payments, helpdesk, amenities and accounting into one beautifully simple platform for gated communities. Open source, self-managed, yours.",
  keywords: ["society management", "apartment management", "community app", "RWA software", "visitor management", "society accounting"],
  openGraph: {
    title: "Nivaasa — The operating system for modern communities",
    description: "Security, community, payments and accounting in one calm, open-source platform for gated communities.",
    type: "website",
    locale: "en_IN",
    siteName: "Nivaasa",
  },
  twitter: { card: "summary_large_image", title: "Nivaasa", description: "Community, in one place." },
  applicationName: "Nivaasa",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Nivaasa" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icon.svg" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f7fb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${instrument.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              borderRadius: "16px",
              border: "1px solid #e8eaf2",
              background: "#ffffff",
              color: "#131a2a",
              boxShadow: "0 24px 60px -24px rgba(19,26,42,0.3)",
              fontFamily: "var(--font-jakarta)",
            },
          }}
        />
      </body>
    </html>
  );
}
