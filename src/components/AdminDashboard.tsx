import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey, functionsBase } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import {
  Users,
  FileText,
  BarChart3,
  Trash2,
  Shield,
  LogOut,
  Download,
  Settings,
  CheckSquare,
  Clock,
  AlertTriangle,
  Key
} from 'lucide-react';
import { toast } from "sonner";

interface AdminDashboardProps {
  admin: { username: string; isAdmin: boolean };
  onLogout: () => void;
}

export function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearingData, setIsClearingData] = useState(false);
  const [showClearDataConfirmation, setShowClearDataConfirmation] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [clearingUsers, setClearingUsers] = useState(false);
  const [clearingDevices, setClearingDevices] = useState(false);
  const [clearingDocuments, setClearingDocuments] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState<string | null>(null);
  const [showClearUsersConfirmation, setShowClearUsersConfirmation] = useState(false);
  const [showClearDevicesConfirmation, setShowClearDevicesConfirmation] = useState(false);
  const [showClearDocumentsConfirmation, setShowClearDocumentsConfirmation] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Fetch users from admin endpoint
      const usersResponse = await fetch(
        `${functionsBase(projectId)}/admin/users`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Fetch documents
      const documentsResponse = await fetch(
        `${functionsBase(projectId)}/documents`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      // Fetch devices
      const devicesResponse = await fetch(
        `${functionsBase(projectId)}/devices`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      // Fetch delayed checks for analytics
      const delayedResponse = await fetch(
        `${functionsBase(projectId)}/delayed-checks`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData);
      } else {
        console.error('Failed to fetch users:', usersResponse.status);
        // Fallback to regular users endpoint
        const fallbackResponse = await fetch(
          `${functionsBase(projectId)}/users`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setUsers(fallbackData);
        }
      }

      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        setDocuments(documentsData);
      }

      if (devicesResponse.ok) {
        const devicesData = await devicesResponse.json();
        setDevices(devicesData);
      }

      if (delayedResponse.ok) {
        const checksData = await delayedResponse.json();
        setChecks(checksData);
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllData = async () => {
    try {
      setIsClearingData(true);

      const response = await fetch(
        `${functionsBase(projectId)}/clear-all-data`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(`All data cleared successfully! Removed ${result.cleared.users} users, ${result.cleared.devices} devices, ${result.cleared.checks} checks, ${result.cleared.documents} documents.`);

        // Refresh data
        await fetchAllData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to clear all data');
      }
    } catch (error) {
      console.error('Error clearing all data:', error);
      toast.error('Failed to clear all data');
    } finally {
      setIsClearingData(false);
      setShowClearDataConfirmation(false);
    }
  };

  const handleClearUsers = async () => {
    try {
      setClearingUsers(true);

      const response = await fetch(
        `${functionsBase(projectId)}/clear-users`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(`Cleared ${result.cleared} users successfully`);
        await fetchAllData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to clear users');
      }
    } catch (error) {
      console.error('Error clearing users:', error);
      toast.error('Failed to clear users');
    } finally {
      setClearingUsers(false);
      setShowClearUsersConfirmation(false);
    }
  };

  const handleClearDevices = async () => {
    try {
      setClearingDevices(true);

      const response = await fetch(
        `${functionsBase(projectId)}/clear-devices`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(`Cleared ${result.cleared.devices} devices and ${result.cleared.checks} checks successfully`);
        await fetchAllData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to clear devices');
      }
    } catch (error) {
      console.error('Error clearing devices:', error);
      toast.error('Failed to clear devices');
    } finally {
      setClearingDevices(false);
      setShowClearDevicesConfirmation(false);
    }
  };

  const handleClearDocuments = async () => {
    try {
      setClearingDocuments(true);

      const response = await fetch(
        `${functionsBase(projectId)}/clear-documents`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(`Cleared ${result.cleared} documents successfully`);
        await fetchAllData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to clear documents');
      }
    } catch (error) {
      console.error('Error clearing documents:', error);
      toast.error('Failed to clear documents');
    } finally {
      setClearingDocuments(false);
      setShowClearDocumentsConfirmation(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsDeletingUser(true);

      const response = await fetch(
        `${functionsBase(projectId)}/admin/users/${userToDelete.employeeId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        setUsers(prev => prev.filter(user => user.employeeId !== userToDelete.employeeId));
        toast.success(`User ${userToDelete.name} removed successfully`);
        setUserToDelete(null);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Failed to remove user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    try {
      setChangingPassword(true);
      const response = await fetch(
        `${functionsBase(projectId)}/admin/change-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            currentPassword: passwordData.oldPassword,
            newPassword: passwordData.newPassword
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Password change requested. Please update the ADMIN_PASSWORD environment variable.');
        setShowChangePassword(false);
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteDocument = async (document: any) => {
    try {
      setDeletingDocument(document.id);
      const response = await fetch(
        `${functionsBase(projectId)}/documents/${document.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        setDocuments(prev => prev.filter(doc => doc.id !== document.id));

        if (result.fileDeleted) {
          toast.success('Document and file deleted successfully');
        } else if (result.fileError) {
          toast.success(`Document deleted from database, but file deletion failed: ${result.fileError}`);
        } else {
          toast.success('Document deleted successfully');
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    } finally {
      setDeletingDocument(null);
    }
  };

  const handleDownloadDocument = async (document: any) => {
    try {
      const response = await fetch(
        `${functionsBase(projectId)}/documents/${document.id}/download`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        window.open(result.downloadUrl, '_blank');
        toast.success('Document download link opened');
      } else {
        toast.error('Failed to download document');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case 'pending_signature':
        return <Badge className="bg-orange-100 text-orange-800">Pending Signature</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingDocuments = documents.filter(doc => doc.status === 'pending_signature');
  const verifiedDocuments = documents.filter(doc => doc.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <div>
                <h1 className="text-xl sm:text-2xl text-gray-900">Admin Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-500">System Management & Analytics</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChangePassword(true)}
                className="text-xs sm:text-sm"
              >
                <Key className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Change Password</span>
                <span className="sm:hidden">Password</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-xs sm:text-sm"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Analytics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm text-gray-600">Total Users</p>
                  <p className="text-lg sm:text-2xl">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center">
                <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm text-gray-600">Total Devices</p>
                  <p className="text-lg sm:text-2xl">{devices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm text-gray-600">Total Documents</p>
                  <p className="text-lg sm:text-2xl">{documents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm text-gray-600">Delayed Checks</p>
                  <p className="text-lg sm:text-2xl">{checks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">
              <span className="hidden lg:inline">Users ({users.length})</span>
              <span className="lg:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="documents">
              <span className="hidden lg:inline">Documents ({documents.length})</span>
              <span className="lg:hidden">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="analytics">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="system">
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">All Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {users.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No users found</p>
                    </div>
                  ) : (
                    users.map((user) => (
                      <div key={user.employeeId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg gap-3 sm:gap-4">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm sm:text-base truncate">{user.name}</p>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">{user.email}</p>
                            <p className="text-xs text-gray-500">ID: {user.employeeId}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
                          <div className="text-left sm:text-right">
                            <p className="text-xs text-gray-500">
                              {user.notifications?.length || 0} notifications
                            </p>
                            <p className="text-xs text-gray-500">
                              Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                            </p>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setUserToDelete(user)}
                                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline ml-1">Remove</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="mx-4 max-w-md">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-red-600">Remove User?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove user <strong>{user.name}</strong>?
                                  <br /><br />
                                  This will:
                                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                    <li>Delete their account permanently</li>
                                    <li>Remove all their data and activity</li>
                                    <li>Sign them out of all sessions</li>
                                  </ul>
                                  <br />
                                  <strong>This action cannot be undone!</strong>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setUserToDelete(null)}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDeleteUser}
                                  disabled={isDeletingUser}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {isDeletingUser ? 'Removing...' : 'Yes, Remove User'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Pending Signatures ({pendingDocuments.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingDocuments.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No pending documents</p>
                      </div>
                    ) : (
                      pendingDocuments.map((document) => (
                        <div key={document.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg gap-3">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm truncate">{document.fileName}</p>
                              <p className="text-xs text-gray-500">
                                <span className="block sm:inline">By: {document.uploadedBy}</span>
                                <span className="hidden sm:inline"> • </span>
                                <span className="block sm:inline">To: {document.assignedTo}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end space-x-2">
                            {getDocumentStatusBadge(document.status)}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadDocument(document)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteDocument(document)}
                              disabled={deletingDocument === document.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {deletingDocument === document.id ? (
                                'Deleting...'
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Verified Documents ({verifiedDocuments.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {verifiedDocuments.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No verified documents</p>
                      </div>
                    ) : (
                      verifiedDocuments.map((document) => (
                        <div key={document.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg gap-3">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm truncate">{document.fileName}</p>
                              <p className="text-xs text-gray-500">
                                <span className="block sm:inline">By: {document.uploadedBy}</span>
                                <span className="hidden sm:inline"> • </span>
                                <span className="block sm:inline">Signed by: {document.assignedTo}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end space-x-2">
                            {getDocumentStatusBadge(document.status)}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadDocument(document)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteDocument(document)}
                              disabled={deletingDocument === document.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {deletingDocument === document.id ? (
                                'Deleting...'
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">System Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Active Users</span>
                    <span className="text-lg sm:text-xl">{users.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Registered Devices</span>
                    <span className="text-lg sm:text-xl">{devices.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Pending Documents</span>
                    <span className="text-lg sm:text-xl">{pendingDocuments.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Completed Documents</span>
                    <span className="text-lg sm:text-xl">{verifiedDocuments.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Maintenance Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Delayed Checks</span>
                    <span className="text-lg sm:text-xl text-red-600">{checks.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Document Completion Rate</span>
                    <span className="text-lg sm:text-xl">
                      {documents.length > 0 ? Math.round((verifiedDocuments.length / documents.length) * 100) : 0}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl text-red-700">System Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 sm:space-y-6">
                  {/* Clear Users */}
                  <div className="p-3 sm:p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1">
                        <h5 className="text-orange-800 mb-1 text-sm sm:text-base">Clear All Users</h5>
                        <p className="text-xs sm:text-sm text-orange-600">
                          Delete all user accounts and profiles. Currently {users.length} users in system.
                        </p>
                      </div>
                      <AlertDialog open={showClearUsersConfirmation} onOpenChange={setShowClearUsersConfirmation}>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto border-orange-300 text-orange-700 hover:bg-orange-100">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm">Clear Users</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="mx-4 max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-orange-600">Clear All Users?</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                              This will permanently delete <strong>{users.length} user accounts</strong> including:
                              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                                <li>All user profiles and data</li>
                                <li>User notifications and history</li>
                                <li>Authentication sessions</li>
                              </ul>
                              <br />
                              <strong>This cannot be undone!</strong>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                            <AlertDialogCancel onClick={() => setShowClearUsersConfirmation(false)} className="w-full sm:w-auto">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleClearUsers}
                              disabled={clearingUsers}
                              className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
                            >
                              {clearingUsers ? 'Clearing...' : 'Yes, Clear Users'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Clear Devices */}
                  <div className="p-3 sm:p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1">
                        <h5 className="text-blue-800 mb-1 text-sm sm:text-base">Clear All Devices & Checks</h5>
                        <p className="text-xs sm:text-sm text-blue-600">
                          Delete all devices and their associated maintenance checks. Currently {devices.length} devices in system.
                        </p>
                      </div>
                      <AlertDialog open={showClearDevicesConfirmation} onOpenChange={setShowClearDevicesConfirmation}>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto border-blue-300 text-blue-700 hover:bg-blue-100">
                            <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm">Clear Devices</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="mx-4 max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-blue-600">Clear All Devices & Checks?</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                              This will permanently delete <strong>{devices.length} devices</strong> including:
                              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                                <li>All device records and configurations</li>
                                <li>All device checks (pending and completed)</li>
                                <li>Weekly planning data for devices</li>
                                <li>Maintenance history and comments</li>
                              </ul>
                              <br />
                              <strong>This cannot be undone!</strong>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                            <AlertDialogCancel onClick={() => setShowClearDevicesConfirmation(false)} className="w-full sm:w-auto">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleClearDevices}
                              disabled={clearingDevices}
                              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                            >
                              {clearingDevices ? 'Clearing...' : 'Yes, Clear Devices'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Clear Documents */}
                  <div className="p-3 sm:p-4 border border-purple-200 rounded-lg bg-purple-50">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1">
                        <h5 className="text-purple-800 mb-1 text-sm sm:text-base">Clear All Documents</h5>
                        <p className="text-xs sm:text-sm text-purple-600">
                          Delete all documents and signatures. Currently {documents.length} documents in system.
                        </p>
                      </div>
                      <AlertDialog open={showClearDocumentsConfirmation} onOpenChange={setShowClearDocumentsConfirmation}>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto border-purple-300 text-purple-700 hover:bg-purple-100">
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm">Clear Documents</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="mx-4 max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-purple-600">Clear All Documents?</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                              This will permanently delete <strong>{documents.length} documents</strong> including:
                              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                                <li>All uploaded PDF files</li>
                                <li>Document signatures and workflows</li>
                                <li>Document notifications and assignments</li>
                                <li>Files from Supabase storage</li>
                              </ul>
                              <br />
                              <strong>This cannot be undone!</strong>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                            <AlertDialogCancel onClick={() => setShowClearDocumentsConfirmation(false)} className="w-full sm:w-auto">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleClearDocuments}
                              disabled={clearingDocuments}
                              className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
                            >
                              {clearingDocuments ? 'Clearing...' : 'Yes, Clear Documents'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <Separator />

                  {/* Clear All Data */}
                  <div className="p-3 sm:p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1">
                        <h5 className="text-red-800 mb-1 text-sm sm:text-base">Clear ALL Database Data</h5>
                        <p className="text-xs sm:text-sm text-red-600">
                          <strong>DANGER:</strong> This will permanently delete ALL users, devices, checks, and documents from the database.
                        </p>
                      </div>
                      <AlertDialog open={showClearDataConfirmation} onOpenChange={setShowClearDataConfirmation}>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm">Clear All Data</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="mx-4 max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-red-600">Clear ALL Database Data?</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                              <strong>This is extremely destructive!</strong>
                              <br />
                              <br />
                              This action will permanently delete:
                              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                                <li>All user accounts and profiles ({users.length} users)</li>
                                <li>All devices and maintenance records ({devices.length} devices)</li>
                                <li>All device checks and history</li>
                                <li>All documents and signatures ({documents.length} documents)</li>
                                <li>All weekly plans and assignments</li>
                              </ul>
                              <br />
                              <strong>This cannot be undone!</strong> Are you absolutely sure?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                            <AlertDialogCancel onClick={() => setShowClearDataConfirmation(false)} className="w-full sm:w-auto">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleClearAllData}
                              disabled={isClearingData}
                              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                            >
                              {isClearingData ? 'Clearing...' : 'Yes, Clear Everything'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Admin Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordData.oldPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, oldPassword: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                }}
                disabled={changingPassword}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? 'Changing Password...' : 'Change Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}