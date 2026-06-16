"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Check } from "lucide-react";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = "http://localhost:5000/api";

export default function TopNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) return;
      const res = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (error) {
      console.error("Error fetching notifications", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      const token = Cookies.get("token");
      await axios.put(`${API_URL}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (error) {
      console.error("Error marking as read", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = Cookies.get("token");
      await axios.put(`${API_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (error) {
      console.error("Error marking all as read", error);
    }
  };

  if (!user) return null;

  const getTitle = () => {
    switch (pathname) {
      case "/submit":
        return { title: "Submit Job", sub: "Submit a new job for execution." };
      case "/jobs":
        return { title: "Jobs", sub: "View and manage all jobs in the system." };
      case "/workers":
        return { title: "Workers", sub: "Monitor and manage worker nodes." };
      case "/history":
        return { title: "Execution History", sub: "View detailed execution history of all jobs." };
      case "/failed":
        return { title: "Failed Jobs", sub: "View and manage all failed jobs." };
      case "/settings":
        return { title: "Settings", sub: "Configure system settings and preferences." };
      default:
        return { title: "Dashboard", sub: "Welcome back! Here's what's happening with your jobs." };
    }
  };

  const { title, sub } = getTitle();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-20 border-b border-gray-800 bg-gray-950 flex items-center justify-between px-8 relative z-40">
      <div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="text-sm text-gray-400">{sub}</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="text-gray-400 hover:text-white transition-colors relative flex items-center justify-center"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold border border-gray-950">
                {unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-4 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950">
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">No notifications yet</div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif._id} 
                      className={`p-4 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors ${!notif.read ? 'bg-gray-800/20' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p className={`text-sm ${!notif.read ? 'text-white font-medium' : 'text-gray-300'}`}>
                            {notif.message}
                          </p>
                          <span className="text-xs text-gray-500 mt-1 block">
                            {new Date(notif.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {!notif.read && (
                          <button 
                            onClick={() => markAsRead(notif._id)}
                            className="text-gray-500 hover:text-emerald-400 transition-colors h-fit p-1 bg-gray-800 rounded hover:bg-gray-700"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={logout}
          className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
