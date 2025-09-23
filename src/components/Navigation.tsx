import { useState, useEffect } from 'react';
import { projectId, publicAnonKey, functionsBase } from '../utils/supabase/info';
import { supabase } from '../utils/supabase';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import {
  Home,
  Settings,
  Calendar,
  CheckSquare,
  AlertTriangle,
  FileText,
  BarChart3,
  LogOut,
  Bell,
  Menu,
  X,
  User
} from 'lucide-react';
import { AppUser, Notification } from '../App';
import { toast } from "sonner";

interface NavigationProps {
  user: AppUser;
  currentView: string;
  onViewChange: (view: string) => void;
  onUserLogout: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Navigation({ user, currentView, onViewChange, onUserLogout, sidebarOpen, setSidebarOpen }: NavigationProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [delayedDevicesCount, setDelayedDevicesCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    fetchDelayedDevicesCount();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchDelayedDevicesCount();
    }, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [user.employeeId]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `${functionsBase(projectId)}/notifications/${user.employeeId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const notifs = await response.json();
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n: Notification) => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchDelayedDevicesCount = async () => {
    try {
      const response = await fetch(
        `${functionsBase(projectId)}/delayed-checks`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const delayedChecks = await response.json();
        setDelayedDevicesCount(delayedChecks.length);
      }
    } catch (error) {
      console.error('Error fetching delayed devices count:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `${functionsBase(projectId)}/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const response = await fetch(
        `${functionsBase(projectId)}/notifications/${user.employeeId}/read-all`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearNotificationHistory = async () => {
    try {
      const response = await fetch(
        `${functionsBase(projectId)}/notifications/${user.employeeId}/clear`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        setNotifications([]);
        setUnreadCount(0);
        toast.success('Notification history cleared');
      }
    } catch (error) {
      console.error('Error clearing notification history:', error);
      toast.error('Failed to clear notification history');
    }
  };

  const handleSignOut = async () => {
    try {
      // Sign out from Supabase (for social auth users)
      await supabase.auth.signOut();
      onUserLogout();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'devices', label: 'Devices', icon: Settings },
    { id: 'planner', label: 'Weekly Planner', icon: Calendar },
    { id: 'checks', label: 'Device Checks', icon: CheckSquare },
    { id: 'delayed', label: 'Delayed', icon: AlertTriangle, badge: delayedDevicesCount },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <>
      {/* Header for all screens */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <h1 className="text-lg lg:text-xl">Device Manager</h1>
          </div>

          <div className="flex items-center space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm">Notifications</h4>
                    <div className="flex gap-1">
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={markAllNotificationsAsRead}
                          className="text-xs h-6 px-2"
                        >
                          Mark all read
                        </Button>
                      )}
                      {notifications.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearNotificationHistory}
                          className="text-xs h-6 px-2 text-red-600 hover:text-red-700"
                        >
                          Clear history
                        </Button>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No notifications
                      </p>
                    ) : (
                      notifications.map((notification) => (
                        <Card
                          key={notification.id}
                          className={`p-3 cursor-pointer hover:bg-gray-50 ${!notification.read ? 'bg-blue-50 border-blue-200' : ''
                            }`}
                          onClick={() => {
                            if (!notification.read) {
                              markNotificationAsRead(notification.id);
                            }
                            // Navigate to relevant section based on notification type
                            if (notification.type === 'document_signature_required' && notification.documentId) {
                              onViewChange('documents');
                            } else if (notification.type === 'device_check_assigned') {
                              onViewChange('checks');
                            } else if (notification.type === 'device_check_overdue') {
                              onViewChange('delayed');
                            }
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-1">
                              <p className="text-sm">{notification.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(notification.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            )}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="lg:hidden"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:z-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 pt-20 lg:pt-6">
          <h1 className="text-xl mb-8 hidden lg:block">Device Manager</h1>

          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {(user as any).avatar && (
                <img
                  src={(user as any).avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div>
                <p className="text-sm text-gray-600">Welcome</p>
                <p>{user.name}</p>
                <p className="text-xs text-gray-500">{user.employeeId}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={currentView === item.id ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => {
                    onViewChange(item.id);
                    setSidebarOpen(false); // Close mobile menu after selection
                  }}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.label}
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <Badge className="ml-auto">{item.badge}</Badge>
                  )}
                </Button>
              );
            })}
          </nav>

          <div className="absolute bottom-6 left-6 right-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}