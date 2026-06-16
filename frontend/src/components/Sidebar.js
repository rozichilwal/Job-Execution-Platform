"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  PlusSquare, 
  Briefcase, 
  Users, 
  History, 
  XCircle, 
  Settings,
  Hexagon
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Submit Job", href: "/submit", icon: PlusSquare },
    { name: "Jobs", href: "/jobs", icon: Briefcase },
    { name: "Workers", href: "/workers", icon: Users },
    { name: "Execution History", href: "/history", icon: History },
    { name: "Failed Jobs", href: "/failed", icon: XCircle },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  if (!user) return null; // Don't render if not logged in

  return (
    <div className="w-64 bg-gray-950 border-r border-gray-800 h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-lg">
          <Hexagon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">Job Execution</h1>
          <p className="text-gray-400 text-sm leading-tight">Platform</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/" && pathname === "");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-gray-400 hover:text-white hover:bg-gray-900"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-xl cursor-pointer hover:bg-gray-800 transition-colors">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
