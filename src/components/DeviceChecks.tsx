import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { CheckSquare, Clock, MapPin, Settings, MessageSquare } from 'lucide-react';
import { toast } from "sonner";
import { Device, DeviceCheck, AppUser } from '../App';

interface DeviceChecksProps {
  user: AppUser;
}

export function DeviceChecks({ user }: DeviceChecksProps) {
  const [pendingChecks, setPendingChecks] = useState<DeviceCheck[]>([]);
  const [devices, setDevices] = useState<{ [key: string]: Device }>({});
  const [loading, setLoading] = useState(true);
  const [selectedCheck, setSelectedCheck] = useState<DeviceCheck | null>(null);
  const [comment, setComment] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    fetchCurrentWeekChecks();
  }, []);

  const fetchCurrentWeekChecks = async () => {
    try {
      setLoading(true);
      
      // Get current week and year
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentWeek = getWeekNumber(currentDate);

      // Fetch current week's checks
      const checksResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-354d5d14/weekly-plans/${currentYear}/${currentWeek}`,
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
        setPendingChecks(checks.filter((check: DeviceCheck) => check.status === 'pending'));
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
      console.error('Error fetching device checks:', error);
      toast.error('Failed to fetch device checks');
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
        const result = await response.json();
        
        // Show success message with next check information
        if (result.nextCheckScheduled) {
          const nextCheckDate = new Date(result.nextCheckScheduled.scheduledFor);
          toast.success(`Device check completed! Next check automatically scheduled for week ${result.nextCheckScheduled.week}, ${nextCheckDate.getFullYear()} (${nextCheckDate.toLocaleDateString()})`);
        } else {
          toast.success('Device check completed successfully');
        }
        
        setSelectedCheck(null);
        setComment('');
        // Remove the completed check from pending list
        setPendingChecks(prev => prev.filter(check => check.id !== selectedCheck.id));
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

  const getCurrentWeekRange = (): string => {
    const currentDate = new Date();
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startOfWeek.setDate(diff);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl">Device Checks</h1>
          <p className="text-gray-600">Week {getWeekNumber(new Date())} - {getCurrentWeekRange()}</p>
        </div>
        <Badge variant="outline">
          {pendingChecks.length} pending checks
        </Badge>
      </div>

      {pendingChecks.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckSquare className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg mb-2">All checks completed!</h3>
          <p className="text-gray-600">
            There are no pending device checks for this week. Great work!
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingChecks.map((check) => {
            const device = devices[check.deviceId];
            if (!device) return null;

            return (
              <Card key={check.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{device.name}</CardTitle>
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
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
                        className="w-full"
                        onClick={() => setSelectedCheck(check)}
                      >
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Mark as Checked
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Complete Device Check</DialogTitle>
                        <DialogDescription>
                          Mark "{device.name}" as checked and add any maintenance notes.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
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
                          <Label htmlFor="completion-comment">
                            Maintenance Comment (Optional)
                          </Label>
                          <Textarea
                            id="completion-comment"
                            placeholder="Any observations, maintenance performed, or issues found..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                          />
                        </div>
                        
                        <div className="flex gap-2 pt-4">
                          <Button 
                            onClick={handleCompleteCheck}
                            disabled={isCompleting}
                            className="flex-1"
                          >
                            {isCompleting ? 'Completing...' : 'Complete Check'}
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
          })}
        </div>
      )}

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-blue-800 mb-2">How to complete device checks:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Physically inspect each device for proper operation</li>
                <li>• Follow any specific maintenance notes provided</li>
                <li>• Click "Mark as Checked" when inspection is complete</li>
                <li>• Add any observations or maintenance performed in the comment</li>
                <li>• Completed checks will be recorded with your employee ID and timestamp</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}