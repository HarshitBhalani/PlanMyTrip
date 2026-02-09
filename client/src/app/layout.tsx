import "./globals.css";
import Navbar from "@/components/Navbar";
import { Sonner } from "../components/ui/sonner";

export const metadata = {
  title: "AI Trip Planner",
  description: "Plan trips with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
        <Sonner />
      </body>
    </html>
  );
}
