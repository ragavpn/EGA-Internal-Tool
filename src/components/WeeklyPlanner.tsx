import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey, functionsBase } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarIcon, CheckSquare, Clock, Users } from 'lucide-react';
import { toast } from "sonner";
import { Device, AppUser } from '../App';

interface WeeklyPlannerProps {
  user: AppUser;
}

export function WeeklyPlanner({ user }: WeeklyPlannerProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [existingPlan, setExistingPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Set current week and year as default
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear().toString();
    const currentWeek = getWeekNumber(currentDate).toString();

    setSelectedDate(currentDate);
    setSelectedYear(currentYear);
    setSelectedWeek(currentWeek);

    fetchDevices();
  }, []);

  useEffect(() => {
    // Update week and year when date changes
    if (selectedDate) {
      try {
        const year = selectedDate.getFullYear().toString();
        const week = getWeekNumber(selectedDate).toString();
        setSelectedYear(year);
        setSelectedWeek(week);
      } catch (error) {
        console.error('Error updating week and year:', error);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedWeek && selectedYear) {
      checkExistingPlan();
    }
  }, [selectedWeek, selectedYear]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${functionsBase(projectId)}/devices`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const deviceData = await response.json();
        setDevices(deviceData);
      } else {
        toast.error('Failed to fetch devices');
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingPlan = async () => {
    try {
      const response = await fetch(
        `${functionsBase(projectId)}/weekly-plans/${selectedYear}/${selectedWeek}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const checks = await response.json();
        setExistingPlan(checks);
        setSelectedDevices(checks.map((check: any) => check.deviceId));
      } else {
        setExistingPlan(null);
        setSelectedDevices([]);
      }
    } catch (error) {
      console.error('Error checking existing plan:', error);
      setExistingPlan(null);
      setSelectedDevices([]);
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

  const isDeviceDueForCheck = (device: Device): boolean => {
    // Simple logic - in a real app, you'd check the last check date
    // For now, suggest devices that should be checked based on frequency
    const currentWeekNum = parseInt(selectedWeek);
    const deviceFreq = device.plannedFrequency;

    // Suggest device if current week is divisible by its frequency
    return currentWeekNum % deviceFreq === 0;
  };

  const getSuggestedDevices = (): Device[] => {
    return devices.filter(device => isDeviceDueForCheck(device));
  };

  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleSelectSuggested = () => {
    const suggested = getSuggestedDevices().map(d => d.id);
    setSelectedDevices(suggested);
  };

  const handleSubmitPlan = async () => {
    if (selectedDevices.length === 0) {
      toast.error('Please select at least one device');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(
        `${functionsBase(projectId)}/weekly-plans`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            week: selectedWeek,
            year: selectedYear,
            deviceIds: selectedDevices,
            assignedBy: user.employeeId
          })
        }
      );

      if (response.ok) {
        toast.success('Weekly plan created successfully');
        checkExistingPlan(); // Refresh the plan
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create weekly plan');
      }
    } catch (error) {
      console.error('Error creating weekly plan:', error);
      toast.error('Failed to create weekly plan');
    } finally {
      setSubmitting(false);
    }
  };

  const getWeekEndDate = (startDate: Date): Date => {
    const endDate = new Date(startDate);
    // Calculate how many days until Sunday (0 = Sunday, 1 = Monday, etc.)
    const daysUntilSunday = (7 - startDate.getDay()) % 7;
    endDate.setDate(startDate.getDate() + daysUntilSunday);
    return endDate;
  };

  const formatDate = (date: Date): string => {
    try {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return date.toDateString();
    }
  };

  const formatDateShort = (date: Date): string => {
    try {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  const formatDateRange = (startDate: Date): string => {
    try {
      const endDate = getWeekEndDate(startDate);
      return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}, ${endDate.getFullYear()}`;
    } catch (error) {
      return startDate.toDateString();
    }
  };

  const getWeekdayName = (date: Date): string => {
    try {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } catch (error) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()];
    }
  };

  const formatMonthDay = (date: Date): string => {
    try {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    }
  };

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

  const suggestedDevices = getSuggestedDevices();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Weekly Planner</h1>
        <Badge variant="outline">
          Planning for Week {selectedWeek} - {selectedYear}
        </Badge>
      </div>

      {/* Week Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            Select Planning Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm">Choose start date (week begins on selected day)</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? formatDate(selectedDate) : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                      }
                    }}
                    disabled={(date) => {
                      // Disable past dates (before today)
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {selectedDate && selectedWeek && selectedYear && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Selected Week:</span>
                    <span className="text-blue-900">Week {selectedWeek}, {selectedYear}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Date Range:</span>
                    <span className="text-blue-900">{formatDateRange(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Week ends on:</span>
                    <span className="text-blue-900">{getWeekdayName(getWeekEndDate(selectedDate))}, {formatMonthDay(getWeekEndDate(selectedDate))}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing Plan Notice */}
      {existingPlan && existingPlan.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <p className="text-yellow-800">
                  A plan already exists for Week {selectedWeek} - {selectedYear}
                </p>
                <p className="text-sm text-yellow-700">
                  {existingPlan.length} devices are currently assigned for checking
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggested Devices */}
      {suggestedDevices.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <CheckSquare className="h-5 w-5 mr-2" />
                Suggested Devices
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleSelectSuggested}>
                Select All Suggested
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              These devices are due for checking based on their maintenance frequency:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {suggestedDevices.map((device) => (
                <div key={device.id} className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedDevices.includes(device.id)}
                      onCheckedChange={() => handleDeviceToggle(device.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm">{device.name}</p>
                      <p className="text-xs text-gray-600">{device.location}</p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        Every {device.plannedFrequency} week{device.plannedFrequency > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            All Devices ({devices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {devices.map((device) => {
              const isSelected = selectedDevices.includes(device.id);
              const isSuggested = suggestedDevices.some(d => d.id === device.id);

              return (
                <div
                  key={device.id}
                  className={`p-4 border rounded-lg transition-colors ${isSelected ? 'bg-green-50 border-green-200' :
                      isSuggested ? 'bg-blue-50 border-blue-200' :
                        'hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleDeviceToggle(device.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4>{device.name}</h4>
                        {isSuggested && (
                          <Badge variant="secondary" className="text-xs">
                            Suggested
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {device.identificationNumber} • {device.location}
                      </p>
                      <p className="text-xs text-gray-500">
                        Check frequency: Every {device.plannedFrequency} week{device.plannedFrequency > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleSubmitPlan}
          disabled={selectedDevices.length === 0 || submitting}
          className="flex-1"
        >
          {submitting ? 'Creating Plan...' : 'Create Weekly Plan'}
        </Button>

        <Button
          variant="outline"
          onClick={() => setSelectedDevices([])}
          disabled={selectedDevices.length === 0}
        >
          Clear Selection
        </Button>
      </div>

      {/* Selection Summary */}
      {selectedDevices.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <p className="text-green-800">
              <strong>{selectedDevices.length}</strong> device{selectedDevices.length > 1 ? 's' : ''} selected for Week {selectedWeek} - {selectedYear}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}