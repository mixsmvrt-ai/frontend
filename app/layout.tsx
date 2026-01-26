import "./globals.css";
import { Navbar } from "../components/Navbar";
import { GlobalBackButton } from "../components/GlobalBackButton";
import { Footer } from "../components/Footer";
import { StudioFlowModalProvider } from "../components/StudioFlowModal";

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
        <StudioFlowModalProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <GlobalBackButton />
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </StudioFlowModalProvider>
      </body>
    </html>
  );
}
