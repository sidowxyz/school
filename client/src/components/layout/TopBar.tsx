import { useState, useRef, useEffect } from "react";
import { Bell, Calendar, MagnifyingGlass, Check, CaretDown, SignOut, List, User } from '@phosphor-icons/react';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { authApi } from "../../features/auth/api/authApi";
import { academicApi } from "../../features/academic-structure/api/academicApi";
import type { Year } from "../../features/academic-structure/types";
import { useAcademicYearStore } from "../../store/academicYearStore";
import { communicationApi, type NotificationItem } from "../../features/communication/api/communicationApi";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const timeAgo = (value?: string) => {
  if (!value) return "Recently";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

interface TopBarProps {
  onMobileMenuClick?: () => void;
  showMenuButton?: boolean;
}

export default function TopBar({ onMobileMenuClick, showMenuButton = true }: TopBarProps) {
  const { clearAuth, user, refreshToken } = useAuth();
  const navigate = useNavigate();
  const [years, setYears] = useState<Year[]>([]);
  const { selectedYearId, setSelectedYearId } = useAcademicYearStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    academicApi.getYears()
      .then(async (list) => {
        setYears(list);
        const stillValid = list.some((y) => y._id === selectedYearId);
        if (!stillValid) {
          const current = await academicApi.getCurrentYear().catch(() => null);
          const fallbackId = current?._id ?? list[0]?._id;
          if (fallbackId) setSelectedYearId(fallbackId);
        }
      })
      .catch(() => setYears([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedYear = years.find((y) => y._id === selectedYearId);
  const unreadCount = notifications.Funnel((notification) => !notification.is_read).length;

  const loadNotifications = () => {
    setNotificationsLoading(true);
    communicationApi.getNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setNotificationsLoading(false));
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-Funnel]:bg-background/60 flex items-center justify-between px-4 sm:px-6 shrink-0 gap-4 relative z-50">
      {/* Mobile Hamburger List */}
      {showMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileMenuClick}
          className="lg:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Toggle Navigation List"
        >
          <List size={20} />
        </Button>
      )}

      {/* Global Quick MagnifyingGlass */}
      <div className="relative flex-1 max-w-sm md:max-w-md">
        <MagnifyingGlass
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          type="text"
          placeholder="Search students, teachers, classes..."
          className="pl-9 h-9 bg-muted/40 border-input text-foreground text-xs placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Academic Year Selector */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="h-8 gap-2 text-xs font-medium text-foreground bg-card hover:bg-accent"
          >
            <Calendar size={13} className="text-muted-foreground" />
            <span className="max-w-[120px] sm:max-w-none truncate">
              {selectedYear ? selectedYear.y_name : "Academic Year"}
            </span>
            <CaretDown size={12} className="text-muted-foreground" />
          </Button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-popover text-popover-foreground rounded-lg shadow-md border border-border overflow-hidden z-50 animate-in fade-in-50 zoom-in-95">
              <div className="p-2 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Select Academic Year
              </div>
              <div className="p-1 max-h-56 overflow-y-auto">
                {years.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground italic">No academic years configured</div>
                ) : (
                  years.map((year) => (
                    <Button
                      variant="ghost"
                      key={year._id}
                      type="button"
                      onClick={() => {
                        setSelectedYearId(year._id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-md transition-colors h-auto ${
                        selectedYearId === year._id
                          ? "bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="truncate">{year.y_name}</span>
                      {selectedYearId === year._id && <Check size={14} />}
                    </Button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const opening = !notifOpen;
              setNotifOpen(opening);
              if (opening) loadNotifications();
            }}
            aria-label="Notifications"
            className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-destructive rounded-full text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-popover text-popover-foreground rounded-lg shadow-lg border border-border overflow-hidden z-50 animate-in fade-in-50 zoom-in-95">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
                {notificationsLoading ? (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">Loading notifications...</div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">No new notifications.</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className="p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-foreground leading-tight">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground/80 mt-1">{timeAgo(n.createDate)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar & List */}
        <div className="relative" ref={userMenuRef}>
          <Button
            variant="ghost"
            type="button"
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-2 p-1.5 h-auto rounded-md hover:bg-muted transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-foreground leading-tight truncate max-w-[120px]">
                {user?.name ?? "Admin User"}
              </p>
              <p className="text-[10px] text-muted-foreground capitalize leading-tight">
                {user?.role?.replace("_", " ") ?? "Staff"}
              </p>
            </div>
            <CaretDown size={12} className="text-muted-foreground hidden sm:block shrink-0" />
          </Button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-popover text-popover-foreground rounded-lg shadow-lg border border-border p-1 z-50 animate-in fade-in-50 zoom-in-95">
              <div className="px-3 py-2 border-b border-border/60 mb-1">
                <p className="text-xs font-semibold text-foreground truncate">{user?.name ?? "User"}</p>
                <p className="text-[10px] text-muted-foreground capitalize truncate">{user?.role?.replace('_', ' ') ?? "Portal User"}</p>
              </div>
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center justify-start gap-2 px-3 py-2 text-xs rounded-md text-foreground hover:bg-muted transition-colors h-auto"
              >
                <User size={14} className="text-muted-foreground" />
                Account Settings
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  authApi.SignOut(refreshToken).catch(() => {});
                  clearAuth();
                  navigate("/login");
                }}
                className="w-full flex items-center justify-start gap-2 px-3 py-2 text-xs rounded-md text-destructive hover:bg-destructive/10 transition-colors h-auto"
              >
                <SignOut size={14} />
                Sign out
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}