import { useState, useEffect } from 'react';
import { projectId, publicAnonKey, functionsBase } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { AlertTriangle, Clock, MapPin, Settings, Calendar, CheckSquare, Users, Mail, Search, SortAsc, SortDesc, User, Hash, X } from 'lucide-react';
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
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedNotificationEmployees, setSelectedNotificationEmployees] = useState<string[]>([]);
  const [tempSelectedEmployees, setTempSelectedEmployees] = useState<string[]>([]);
  const [showEmployeeSelection, setShowEmployeeSelection] = useState(false);
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [employeeSortBy, setEmployeeSortBy] = useState<'name' | 'employeeId'>('name');
  const [employeeSortOrder, setEmployeeSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchDelayedChecks();
    fetchUsers();
    fetchDelayedDeviceNotificationSettings();
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

  const fetchUsers = async () => {
    try {
      const response = await fetch(
        `${functionsBase(projectId)}/users`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
      } else {
        console.error('Failed to fetch users:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchDelayedDeviceNotificationSettings = async () => {
    try {
      const response = await fetch(
        `${functionsBase(projectId)}/delayed-device-notifications`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const settings = await response.json();
        const employeeIds = settings.selectedEmployees || [];
        setSelectedNotificationEmployees(employeeIds);
        setTempSelectedEmployees(employeeIds);
      } else {
        console.error('Failed to fetch delayed device notification settings');
      }
    } catch (error) {
      console.error('Error fetching delayed device notification settings:', error);
    }
  };

  const saveNotificationSettings = async () => {
    try {
      setSavingNotificationSettings(true);

      const response = await fetch(
        `${functionsBase(projectId)}/delayed-device-notifications`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            selectedEmployees: tempSelectedEmployees
          })
        }
      );

      if (response.ok) {
        setSelectedNotificationEmployees(tempSelectedEmployees);
        toast.success('Notification settings saved successfully');
        setShowEmployeeSelection(false);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save notification settings');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save notification settings');
    } finally {
      setSavingNotificationSettings(false);
    }
  };

  // Helper functions for employee selection
  const getFilteredAndSortedEmployees = () => {
    let filteredUsers = users.filter(user =>
      user.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
      user.employeeId.toLowerCase().includes(employeeSearchTerm.toLowerCase())
    );

    filteredUsers.sort((a, b) => {
      let aValue = employeeSortBy === 'name' ? a.name : a.employeeId;
      let bValue = employeeSortBy === 'name' ? b.name : b.employeeId;

      if (employeeSortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    return filteredUsers;
  };

  const handleEmployeeAdd = (employeeId: string) => {
    if (!tempSelectedEmployees.includes(employeeId)) {
      setTempSelectedEmployees(prev => [...prev, employeeId]);
    }
  };

  const handleEmployeeRemove = (employeeId: string) => {
    setTempSelectedEmployees(prev => prev.filter(id => id !== employeeId));
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Reset temp selection to saved selection when closing without saving
      setTempSelectedEmployees(selectedNotificationEmployees);
      setEmployeeSearchTerm('');
    }
    setShowEmployeeSelection(open);
  };

  const getNextMondayGST = () => {
    const now = new Date();
    const gstNow = new Date(now.getTime() + (4 * 60 * 60 * 1000)); // Convert to GST (GMT+4)

    // Find next Monday
    const dayOfWeek = gstNow.getDay();
    let daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // 0 = Sunday

    // If it's Monday and before 7 AM GST, use today
    if (dayOfWeek === 1 && gstNow.getHours() < 7) {
      daysUntilMonday = 0;
    }

    const nextMonday = new Date(gstNow);
    nextMonday.setDate(gstNow.getDate() + daysUntilMonday);
    nextMonday.setHours(7, 0, 0, 0); // Set to 7:00 AM

    return nextMonday;
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
        <div className="flex items-center gap-3">
          <Dialog open={showEmployeeSelection} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Notification Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Weekly Automated Email Notifications
                </DialogTitle>
                <DialogDescription>
                  Select employees who will receive automated email notifications every Monday at 7:00 AM GST when devices have overdue checks. Emails are sent automatically - no manual intervention required.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Employee Selection Dropdown */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Add Employees for Notifications</Label>

                  {/* Search and Sort Controls */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search Employees..."
                        value={employeeSearchTerm}
                        onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Select value={employeeSortBy} onValueChange={(value: 'name' | 'employeeId') => setEmployeeSortBy(value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Name
                            </div>
                          </SelectItem>
                          <SelectItem value="employeeId">
                            <div className="flex items-center gap-2">
                              <Hash className="h-4 w-4" />
                              Emp ID
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEmployeeSortOrder(employeeSortOrder === 'asc' ? 'desc' : 'asc')}
                      >
                        {employeeSortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Employee Dropdown */}
                  <Select onValueChange={handleEmployeeAdd}>
                    <SelectTrigger className="border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                      <SelectValue placeholder="Select employee to add..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {getFilteredAndSortedEmployees()
                        .filter(employee => !tempSelectedEmployees.includes(employee.employeeId))
                        .length > 0 ? (
                        getFilteredAndSortedEmployees()
                          .filter(employee => !tempSelectedEmployees.includes(employee.employeeId))
                          .map(employee => (
                            <SelectItem key={employee.employeeId} value={employee.employeeId}>
                              <div className="flex items-center gap-3 py-2 px-2">
                                <div className="flex-1">
                                  <div className="font-medium">{employee.name}</div>
                                  <div className="text-xs text-gray-500 flex items-center gap-2">
                                    <span className="flex items-center gap-1">
                                      <Hash className="h-3 w-3" />
                                      {employee.employeeId}
                                    </span>
                                    <span>{employee.email}</span>
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p>No available employees</p>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Employees Display */}
                {tempSelectedEmployees.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Selected Employees ({tempSelectedEmployees.length})</Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-4">
                      {tempSelectedEmployees.map((employeeId) => {
                        const employee = users.find(u => u.employeeId === employeeId);
                        if (!employee) return null;

                        return (
                          <div key={employeeId} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{employee.name}</div>
                              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                <span className="flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  {employee.employeeId}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {employee.email}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEmployeeRemove(employeeId)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{tempSelectedEmployees.length} employee(s) will receive notifications</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Clock className="h-4 w-4" />
                      <span>Every Monday at 7:00 AM GST</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={saveNotificationSettings}
                    disabled={savingNotificationSettings}
                    className="flex-1"
                  >
                    {savingNotificationSettings ? 'Saving...' : 'Save Notification Settings'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDialogClose(false)}
                    disabled={savingNotificationSettings}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {delayedChecks.length} delayed checks
          </Badge>
        </div>
      </div>

      {/* Automated Email System Info */}
      {selectedNotificationEmployees.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-1">Automated Email Notifications Active</h4>
                <p className="text-sm text-blue-700 mb-2">
                  {selectedNotificationEmployees.length} employee{selectedNotificationEmployees.length > 1 ? 's' : ''} will receive automated emails when devices are delayed.
                </p>
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Clock className="h-3 w-3" />
                  <span>Next email: {getNextMondayGST().toLocaleDateString('en-GB')} at 7:00 AM GST</span>
                </div>
                {delayedChecks.length > 0 && (
                  <div className="mt-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    ⚠️ These {delayedChecks.length} delayed devices will be included in the next automated email
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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