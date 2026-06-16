"use client";

import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";

export default function AppLayout({ children }) {
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col relative overflow-hidden transition-all duration-300 ${user ? 'ml-0 md:ml-64' : 'ml-0'}`}>
        <TopNav />
        <main className="flex-1 overflow-y-auto bg-gray-950 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
