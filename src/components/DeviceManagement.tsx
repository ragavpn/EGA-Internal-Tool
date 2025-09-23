import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Plus, Settings, MapPin, Search, CheckCircle, AlertCircle, Calendar, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import { Device } from '../App';

interface DeviceWithCheckInfo extends Device {
  lastCheckedAt?: string;
  lastCheckedBy?: string;
  hasBeenChecked?: boolean;
  totalChecksCompleted?: number;
}

export function DeviceManagement() {
  const [devices, setDevices] = useState<DeviceWithCheckInfo[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<DeviceWithCheckInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: '',
    identificationNumber: '',
    location: '',
    plannedFrequency: 1,
    planComment: ''
  });

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    filterDevices();
  }, [devices, searchTerm, locationFilter]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-354d5d14/devices`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const deviceData = await response.json();
        
        // Fetch last check information for each device
        const devicesWithCheckInfo = await Promise.all(
          deviceData.map(async (device: Device) => {
            try {
              const checkResponse = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-354d5d14/devices/${device.id}/last-check`,
                {
                  headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              
              if (checkResponse.ok) {
                const checkInfo = await checkResponse.json();
                return {
                  ...device,
                  lastCheckedAt: checkInfo.lastCheck?.completedAt,
                  lastCheckedBy: checkInfo.lastCheck?.completedBy,
                  hasBeenChecked: checkInfo.hasBeenChecked,
                  totalChecksCompleted: checkInfo.totalChecksCompleted
                } as DeviceWithCheckInfo;
              }
            } catch (error) {
              console.error(`Error fetching check info for device ${device.id}:`, error);
            }
            
            return {
              ...device,
              hasBeenChecked: false,
              totalChecksCompleted: 0
            } as DeviceWithCheckInfo;
          })
        );
        
        setDevices(devicesWithCheckInfo);
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

  const filterDevices = () => {
    let filtered = devices;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(device =>
        device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.identificationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(device =>
        device.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    setFilteredDevices(filtered);
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate required fields
      if (!newDevice.name || !newDevice.identificationNumber || !newDevice.location) {
        toast.error('Name, identification number, and location are required');
        return;
      }

      if (newDevice.plannedFrequency < 1) {
        toast.error('Planned frequency must be at least 1 week');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-354d5d14/devices`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newDevice)
        }
      );

      if (response.ok) {
        const result = await response.json();
        // Add the new device with check info initialized
        const deviceWithCheckInfo = {
          ...result.device,
          hasBeenChecked: false,
          totalChecksCompleted: 0
        } as DeviceWithCheckInfo;
        
        setDevices([...devices, deviceWithCheckInfo]);
        setNewDevice({
          name: '',
          identificationNumber: '',
          location: '',
          plannedFrequency: 1,
          planComment: ''
        });
        setIsAddDialogOpen(false);
        toast.success('Device added successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add device');
      }
    } catch (error) {
      console.error('Error adding device:', error);
      toast.error('Failed to add device');
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setNewDevice(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDeleteDevice = async (device: DeviceWithCheckInfo) => {
    try {
      setIsDeleting(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-354d5d14/devices/${device.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        setDevices(prev => prev.filter(d => d.id !== device.id));
        toast.success('Device removed successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove device');
      }
    } catch (error) {
      console.error('Error removing device:', error);
      toast.error('Failed to remove device');
    } finally {
      setIsDeleting(false);
    }
  };

  // Get unique locations for filter
  const locations = [...new Set(devices.map(device => device.location))];

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
        <h1 className="text-2xl">Device Management</h1>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Device</DialogTitle>
              <DialogDescription>
                Register a new device for maintenance tracking
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddDevice} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="device-name">Device Name</Label>
                <Input
                  id="device-name"
                  placeholder="Conveyor Belt A1"
                  value={newDevice.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="device-id">Identification Number</Label>
                <Input
                  id="device-id"
                  placeholder="CB-A1-001"
                  value={newDevice.identificationNumber}
                  onChange={(e) => handleInputChange('identificationNumber', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="device-location">Location</Label>
                <Input
                  id="device-location"
                  placeholder="Factory Floor - Section A"
                  value={newDevice.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="device-frequency">Check Frequency (weeks)</Label>
                <Input
                  id="device-frequency"
                  type="number"
                  min="1"
                  placeholder="2"
                  value={newDevice.plannedFrequency}
                  onChange={(e) => handleInputChange('plannedFrequency', parseInt(e.target.value) || 1)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="device-comment">Plan Comment (Optional)</Label>
                <Textarea
                  id="device-comment"
                  placeholder="Special maintenance instructions or notes..."
                  value={newDevice.planComment}
                  onChange={(e) => handleInputChange('planComment', e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  Add Device
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map(location => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Device Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredDevices.length} of {devices.length} devices
        </p>
        {locationFilter !== 'all' && (
          <Badge variant="secondary">
            Filtered by: {locationFilter}
          </Badge>
        )}
      </div>

      {/* Devices Grid */}
      {filteredDevices.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Settings className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg mb-2">No devices found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || locationFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first device.'
            }
          </p>
          {(!searchTerm && locationFilter === 'all') && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Device
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((device) => (
            <Card key={device.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{device.name}</CardTitle>
                  <Badge variant="outline">{device.status}</Badge>
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
                
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm">
                    <span className="text-gray-600">Check frequency:</span>{' '}
                    Every {device.plannedFrequency} week{device.plannedFrequency > 1 ? 's' : ''}
                  </p>
                  
                  {device.planComment && (
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="text-gray-800">Note:</span> {device.planComment}
                    </p>
                  )}
                </div>

                {/* Last Check Information */}
                <div className="pt-2 border-t border-gray-100">
                  {device.hasBeenChecked ? (
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-green-700">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        <span>Last checked: {new Date(device.lastCheckedAt!).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-gray-500 ml-6">
                        by {device.lastCheckedBy} • {device.totalChecksCompleted} total checks
                      </p>
                      {/* Calculate and show next scheduled check */}
                      {(() => {
                        const lastCheck = new Date(device.lastCheckedAt!);
                        const nextCheck = new Date(lastCheck);
                        nextCheck.setDate(lastCheck.getDate() + (device.plannedFrequency * 7));
                        return (
                          <div className="flex items-center text-sm text-blue-600 mt-1">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>Next check: {nextCheck.toLocaleDateString()}</span>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="flex items-center text-sm text-orange-600">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <span>Not checked yet</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    Added {new Date(device.createdAt).toLocaleDateString()}
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600">Remove Device?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong>This action cannot be undone!</strong>
                          <br />
                          <br />
                          Removing device "{device.name}" will:
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Permanently delete the device from the system</li>
                            <li>Remove all maintenance check records</li>
                            <li>Delete all planned future checks</li>
                            <li>Remove from all reports and analytics</li>
                          </ul>
                          <br />
                          <strong>Device ID:</strong> {device.identificationNumber}<br />
                          <strong>Location:</strong> {device.location}<br />
                          <strong>Total checks completed:</strong> {device.totalChecksCompleted || 0}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteDevice(device)}
                          disabled={isDeleting}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isDeleting ? 'Removing...' : 'Yes, Remove Device'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}