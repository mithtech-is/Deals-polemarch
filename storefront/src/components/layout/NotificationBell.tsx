"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { medusaClient } from "@/lib/medusa";
import { useUser } from "@/context/UserContext";
import Link from "next/link";

const NotificationBell = () => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"}/store/notifications?limit=10`, {
        headers: {
            "Authorization": `Bearer ${localStorage.getItem("medusa_auth_token")}`,
            "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
        }
      });
      const data = await response.json();
      setNotifications(data.notifications || []);
      setCount(data.notifications?.filter((n: any) => !n.is_read).length || 0);
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"}/store/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${localStorage.getItem("medusa_auth_token")}`,
            "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
        }
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"}/store/notifications/read-all`, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${localStorage.getItem("medusa_auth_token")}`,
            "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
        }
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-muted rounded-full transition-colors relative"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] flex items-center justify-center text-white font-bold animate-pulse">
            {count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-background border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b flex items-center justify-between bg-primary/5">
            <h3 className="font-bold text-sm">Notifications</h3>
            {count > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-primary font-bold hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
                  onClick={() => markAsRead(n.id)}
                >
                  <p className="font-bold text-[13px] leading-tight mb-1">{n.title}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-2 font-medium">
                    {new Date(n.created_at).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
              </div>
            )}
          </div>
          <Link 
            href="/dashboard" 
            className="block p-3 text-center text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            View Dashboard
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
