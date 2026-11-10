import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClientBoot } from "@/components/ClientBoot";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "DocSecure – Family Document Vault", template: "%s · DocSecure" },
  description:
    "Scan documents with your phone or scanner. DocSecure reads them, finds the owner and files them into folders – medical, passport, ID and more.",
  applicationName: "DocSecure",
  appleWebApp: { capable: true, title: "DocSecure", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192" }],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4f46e5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies the saved theme before paint, so there is no flash.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-mesh">
        <ClientBoot />
        {children}
      </body>
    </html>
  );
}
