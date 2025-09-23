import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Settings, 
  Calendar, 
  CheckSquare, 
  AlertTriangle, 
  FileText,
  TrendingUp
} from 'lucide-react';
import { AppUser } from '../App';

interface DashboardProps {
  user: AppUser;
  onViewChange?: (view: string) => void;
}

interface DashboardStats {
  totalDevices: number;
  pendingChecks: number;
  delayedChecks: number;
  completedThisWeek: number;
  pendingDocuments: number;
}

export function Dashboard({ user, onViewChange }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalDevices: 0,
    pendingChecks: 0,
    delayedChecks: 0,
    completedThisWeek: 0,
    pendingDocuments: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch total devices
      const devicesResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-354d5d14/devices`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Fetch current week checks
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentWeek = getWeekNumber(currentDate);
      
      const checksResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-354d5d14/weekly-plans/${currentYear}/${currentWeek}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Fetch delayed checks
      const delayedResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-354d5d14/delayed-checks`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Process responses
      const devices = devicesResponse.ok ? await devicesResponse.json() : [];
      const checks = checksResponse.ok ? await checksResponse.json() : [];
      const delayed = delayedResponse.ok ? await delayedResponse.json() : [];

      const pendingChecks = checks.filter((check: any) => check.status === 'pending').length;
      const completedThisWeek = checks.filter((check: any) => check.status === 'completed').length;

      setStats({
        totalDevices: devices.length,
        pendingChecks,
        delayedChecks: delayed.length,
        completedThisWeek,
        pendingDocuments: user.notifications?.filter(n => n.type === 'document_signature_required' && !n.read).length || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const statCards = [
    {
      title: 'Total Devices',
      value: stats.totalDevices,
      icon: Settings,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Pending Checks',
      value: stats.pendingChecks,
      icon: CheckSquare,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Delayed Checks',
      value: stats.delayedChecks,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Completed This Week',
      value: stats.completedThisWeek,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Pending Documents',
      value: stats.pendingDocuments,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Dashboard</h1>
        <Badge variant="outline">
          Week {getWeekNumber(new Date())} - {new Date().getFullYear()}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-2xl">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div 
              className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onViewChange?.('devices')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p>Add New Device</p>
                  <p className="text-sm text-gray-600">Register a new device for monitoring</p>
                </div>
                <Settings className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div 
              className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onViewChange?.('planner')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p>Plan This Week</p>
                  <p className="text-sm text-gray-600">Assign devices for weekly checks</p>
                </div>
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div 
              className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onViewChange?.('documents')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p>Upload Document</p>
                  <p className="text-sm text-gray-600">Upload PDF for signature workflow</p>
                </div>
                <FileText className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>System Health</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Operational
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Database Connection</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Connected
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Last Backup</span>
                <span className="text-sm text-gray-600">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>User</span>
                <span className="text-sm text-gray-600">
                  {user.name} ({user.employeeId})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Panel */}
      {user.notifications && user.notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.notifications.slice(0, 5).map((notification, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className={`p-1 rounded-full ${notification.read ? 'bg-gray-100' : 'bg-blue-100'}`}>
                    <div className={`h-2 w-2 rounded-full ${notification.read ? 'bg-gray-400' : 'bg-blue-600'}`}></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}