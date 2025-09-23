import React, { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { toast } from "sonner";

// Components
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { DeviceManagement } from './components/DeviceManagement';
import { WeeklyPlanner } from './components/WeeklyPlanner';
import { DeviceChecks } from './components/DeviceChecks';
import { DelayedDevices } from './components/DelayedDevices';
import { DocumentManagement } from './components/DocumentManagement';
import { Reports } from './components/Reports';
import { Profile } from './components/Profile';
import { Navigation } from './components/Navigation';
import { AdminDashboard } from './components/AdminDashboard';

// Types
export interface Device {
  id: string;
  name: string;
  identificationNumber: string;
  location: string;
  plannedFrequency: number;
  planComment: string;
  createdAt: string;
  status: string;
}

export interface DeviceCheck {
  id: string;
  deviceId: string;
  week: string;
  year: string;
  status: 'pending' | 'completed' | 'delayed';
  assignedAt: string;
  assignedBy: string;
  completedAt?: string;
  completedBy?: string;
  comment?: string;
}

export interface AppUser {
  employeeId: string;
  email: string;
  name: string;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  read: boolean;
  documentId?: string;
}

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [admin, setAdmin] = useState<{ username: string; isAdmin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check for existing session on app load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { supabase } = await import('./utils/supabase');
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // User is already signed in, get their profile
          const employeeId = session.user.user_metadata?.employeeId || session.user.email?.split('@')[0];

          if (employeeId) {
            const { projectId, publicAnonKey } = await import('./utils/supabase/info');

            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            try {
              const { functionsBase } = await import('./utils/supabase/info');
              const response = await fetch(
                `${functionsBase(projectId)}/users/${employeeId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                    'Content-Type': 'application/json'
                  },
                  signal: controller.signal
                }
              );

              clearTimeout(timeoutId);

              if (response.ok) {
                const userData = await response.json();
                setUser(userData);
              } else {
                console.log('User profile not found, will need to login again');
              }
            } catch (fetchError) {
              clearTimeout(timeoutId);
              console.log('Failed to fetch user profile on session check:', fetchError);
              // Don't set an error, just continue to login screen
            }
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleViewChange = (view: string) => {
    setCurrentView(view);
  };

  const handleUserLogin = (userData: AppUser) => {
    setUser(userData);
  };

  const handleUserLogout = () => {
    setUser(null);
  };

  const handleUserUpdate = (updatedUser: AppUser) => {
    setUser(updatedUser);
  };

  const handleAdminLogin = (adminData: { username: string; isAdmin: boolean }) => {
    setAdmin(adminData);
  };

  const handleAdminLogout = () => {
    setAdmin(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user && !admin) {
    return (
      <>
        <AuthScreen onUserLogin={handleUserLogin} onAdminLogin={handleAdminLogin} />
        <Toaster />
      </>
    );
  }

  if (admin) {
    return (
      <>
        <AdminDashboard admin={admin} onLogout={handleAdminLogout} />
        <Toaster />
      </>
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard user={user} onViewChange={handleViewChange} />;
      case 'devices':
        return <DeviceManagement />;
      case 'planner':
        return <WeeklyPlanner user={user} />;
      case 'checks':
        return <DeviceChecks user={user} />;
      case 'delayed':
        return <DelayedDevices user={user} />;
      case 'documents':
        return <DocumentManagement user={user} />;
      case 'reports':
        return <Reports />;
      case 'profile':
        return <Profile user={user} onUserLogout={handleUserLogout} onUserUpdate={handleUserUpdate} />;
      default:
        return <Dashboard user={user} onViewChange={handleViewChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        user={user}
        currentView={currentView}
        onViewChange={handleViewChange}
        onUserLogout={handleUserLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="lg:ml-64">
        <main className="container mx-auto px-4 py-6 max-w-7xl lg:pt-6 pt-20">
          {renderCurrentView()}
        </main>
      </div>

      <Toaster />
    </div>
  );
}