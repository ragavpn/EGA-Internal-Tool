import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { AlertTriangle, Clock, MapPin, Settings, Calendar, CheckSquare } from 'lucide-react';
import { toast } from "sonner";
import { Device, DeviceCheck, AppUser } from '../App';

interface DelayedDevicesProps {
  user: AppUser;
}

export function DelayedDevices({ user }: DelayedDevicesProps) {
  const [delayedChecks, setDelayedChecks] = useState<DeviceCheck[]>([]);
  const [devices, setDevices] = useState<{ [key: string]: Device }>({});
  const [loading, setLoading] = useState(true);
  const [selectedCheck, setSelectedCheck] = useState<DeviceCheck | null>(null);
  const [comment, setComment] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    fetchDelayedChecks();
  }, []);

  const fetchDelayedChecks = async () => {
    try {
      setLoading(true);
      
      // Fetch delayed checks
      const checksResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-354d5d14/delayed-checks`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Fetch all devices to get device details
      const devicesResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-354d5d14/devices`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (checksResponse.ok) {
        const checks = await checksResponse.json();
        setDelayedChecks(checks);
      }

      if (devicesResponse.ok) {
        const deviceList = await devicesResponse.json();
        const deviceMap = deviceList.reduce((acc: { [key: string]: Device }, device: Device) => {
          acc[device.id] = device;
          return acc;
        }, {});
        setDevices(deviceMap);
      }

    } catch (error) {
      console.error('Error fetching delayed checks:', error);
      toast.error('Failed to fetch delayed checks');
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

  const getWeekDateRange = (year: number, week: number): string => {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4)
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    
    const weekEnd = new Date(ISOweekStart);
    weekEnd.setDate(ISOweekStart.getDate() + 6);
    
    return `${ISOweekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
  };

  const getDaysOverdue = (check: DeviceCheck): number => {
    const checkYear = parseInt(check.year);
    const checkWeek = parseInt(check.week);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentWeek = getWeekNumber(currentDate);
    
    // Simple calculation - in reality you'd want more precise date arithmetic
    const weeksOverdue = (currentYear - checkYear) * 52 + (currentWeek - checkWeek);
    return weeksOverdue * 7; // Convert to days
  };

  const getSeverityBadge = (daysOverdue: number) => {
    if (daysOverdue <= 7) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Recently Overdue</Badge>;
    } else if (daysOverdue <= 14) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Moderately Overdue</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-red-100 text-red-800">Critically Overdue</Badge>;
    }
  };

  const handleCompleteCheck = async () => {
    if (!selectedCheck) return;

    try {
      setIsCompleting(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-354d5d14/checks/${selectedCheck.id}/complete`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            completedBy: user.employeeId,
            comment: comment.trim()
          })
        }
      );

      if (response.ok) {
        toast.success('Delayed device check completed successfully');
        setSelectedCheck(null);
        setComment('');
        // Remove the completed check from delayed list
        setDelayedChecks(prev => prev.filter(check => check.id !== selectedCheck.id));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to complete check');
      }
    } catch (error) {
      console.error('Error completing check:', error);
      toast.error('Failed to complete check');
    } finally {
      setIsCompleting(false);
    }
  };

  // Group delayed checks by severity
  const groupedChecks = delayedChecks.reduce((acc, check) => {
    const daysOverdue = getDaysOverdue(check);
    let category = 'recent'; // <= 7 days
    
    if (daysOverdue > 14) {
      category = 'critical';
    } else if (daysOverdue > 7) {
      category = 'moderate';
    }
    
    if (!acc[category]) acc[category] = [];
    acc[category].push({ ...check, daysOverdue });
    return acc;
  }, {} as { [key: string]: Array<DeviceCheck & { daysOverdue: number }> });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl">Delayed Devices</h1>
          <p className="text-gray-600">Device checks that are overdue</p>
        </div>
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {delayedChecks.length} delayed checks
        </Badge>
      </div>

      {delayedChecks.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckSquare className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg mb-2">No delayed checks!</h3>
          <p className="text-gray-600">
            All device checks are up to date. Excellent work!
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Critical Overdue */}
          {groupedChecks.critical && (
            <div>
              <h2 className="text-lg text-red-700 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Critically Overdue (14+ days)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedChecks.critical.map((check) => renderDelayedCheckCard(check))}
              </div>
            </div>
          )}

          {/* Moderately Overdue */}
          {groupedChecks.moderate && (
            <div>
              <h2 className="text-lg text-orange-700 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Moderately Overdue (8-14 days)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedChecks.moderate.map((check) => renderDelayedCheckCard(check))}
              </div>
            </div>
          )}

          {/* Recently Overdue */}
          {groupedChecks.recent && (
            <div>
              <h2 className="text-lg text-yellow-700 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Recently Overdue (1-7 days)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedChecks.recent.map((check) => renderDelayedCheckCard(check))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warning message */}
      {delayedChecks.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="text-red-800 mb-2">Action Required</h4>
                <p className="text-sm text-red-700">
                  These device checks are overdue and require immediate attention. 
                  Delayed maintenance can lead to equipment failure and safety risks. 
                  Please complete these checks as soon as possible to maintain compliance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  function renderDelayedCheckCard(check: DeviceCheck & { daysOverdue: number }) {
    const device = devices[check.deviceId];
    if (!device) return null;

    return (
      <Card key={check.id} className="hover:shadow-md transition-shadow border-l-4 border-l-red-500">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{device.name}</CardTitle>
            {getSeverityBadge(check.daysOverdue)}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <Settings className="h-4 w-4 mr-2" />
            {device.identificationNumber}
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            {device.location}
          </div>
          
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              <strong>Overdue:</strong> {check.daysOverdue} days
            </p>
            <p className="text-sm text-red-700">
              Originally scheduled for Week {check.week} - {getWeekDateRange(parseInt(check.year), parseInt(check.week))}
            </p>
          </div>
          
          {device.planComment && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Maintenance Note:</strong> {device.planComment}
              </p>
            </div>
          )}
          
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Assigned: {new Date(check.assignedAt).toLocaleDateString()}
            </p>
            <p className="text-xs text-gray-500">
              Assigned by: {check.assignedBy}
            </p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={() => setSelectedCheck(check)}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Complete Now
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Complete Delayed Check</DialogTitle>
                <DialogDescription>
                  Complete the overdue check for "{device.name}" and add any maintenance notes.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800">
                    <strong>⚠ This check is {check.daysOverdue} days overdue</strong>
                  </p>
                  <p className="text-sm text-red-700">
                    Originally due: Week {check.week}, {check.year}
                  </p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm">
                    <strong>Device:</strong> {device.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>ID:</strong> {device.identificationNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Location:</strong> {device.location}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="delayed-completion-comment">
                    Maintenance Comment (Required for delayed checks)
                  </Label>
                  <Textarea
                    id="delayed-completion-comment"
                    placeholder="Please explain any issues found, maintenance performed, or reason for delay..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    required
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleCompleteCheck}
                    disabled={isCompleting || !comment.trim()}
                    className="flex-1"
                    variant="destructive"
                  >
                    {isCompleting ? 'Completing...' : 'Complete Delayed Check'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSelectedCheck(null);
                      setComment('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }
}