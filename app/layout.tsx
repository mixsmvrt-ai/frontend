import "./globals.css";
import { Navbar } from "../components/Navbar";

export const metadata = {
  title: "MIXSMVRT · AI-Powered Mixing & Mastering",
  description: "MIXSMVRT is a smart, modern AI-powered mixing and mastering studio built for global artists.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-brand-bg text-brand-text">
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
