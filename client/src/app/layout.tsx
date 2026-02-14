import "./globals.css";
import Navbar from "@/components/Navbar";
import { Sonner } from "../components/ui/sonner";
import TodoList from "@/components/TodoList";

export const metadata = {
  title: "AI Trip Planner",
  description: "Plan trips with AI - Your personal travel curator",
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
        <TodoList />
      </body>
    </html>
  );
}