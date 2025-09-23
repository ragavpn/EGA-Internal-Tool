import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey, functionsBase } from '../utils/supabase/info';
import { supabase } from '../utils/supabase';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { User, Trash2, CheckSquare, FileText, Settings, Download, Key } from 'lucide-react';
import { toast } from "sonner";
import { AppUser, DeviceCheck } from '../App';

interface ProfileProps {
  user: AppUser;
  onUserLogout: () => void;
  onUserUpdate?: (updatedUser: AppUser) => void;
}

interface UserActivity {
  deviceChecks: (DeviceCheck & { deviceName: string; deviceId: string })[];
  documentsUploaded: any[];
  documentsSigned: any[];
  documentsAssigned: any[];
}

export function Profile({ user, onUserLogout, onUserUpdate }: ProfileProps) {
  const [userActivity, setUserActivity] = useState<UserActivity>({
    deviceChecks: [],
    documentsUploaded: [],
    documentsSigned: [],
    documentsAssigned: []
  });
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSecondConfirmation, setShowSecondConfirmation] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileData, setProfileData] = useState({
    name: user.name,
    employeeId: user.employeeId
  });

  useEffect(() => {
    fetchUserActivity();
  }, [user.employeeId]);

  const fetchUserActivity = async () => {
    try {
      setLoading(true);

      // Fetch user's device checks history
      const checksResponse = await fetch(
        `${functionsBase(projectId)}/user-activity/${user.employeeId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (checksResponse.ok) {
        const activity = await checksResponse.json();
        setUserActivity(activity);
      }
    } catch (error) {
      console.error('Error fetching user activity:', error);
      toast.error('Failed to fetch user activity');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch(
        `${functionsBase(projectId)}/user/${user.employeeId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        toast.success('Account deleted successfully');
        // Sign out the user after deletion
        await supabase.auth.signOut();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    try {
      // Update password in Supabase
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        toast.error('Failed to update password: ' + error.message);
        return;
      }

      toast.success('Password updated successfully');
      setShowChangePassword(false);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profileData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!profileData.employeeId.trim()) {
      toast.error('Employee ID is required');
      return;
    }

    try {
      const response = await fetch(
        `${functionsBase(projectId)}/user/${user.employeeId}/profile`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: profileData.name,
            newEmployeeId: profileData.employeeId !== user.employeeId ? profileData.employeeId : undefined
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success('Profile updated successfully');
        setShowEditProfile(false);

        // Update the user in the parent component
        if (onUserUpdate && result.user) {
          onUserUpdate(result.user);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
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
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = document.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Document downloaded successfully');
      } else {
        toast.error('Failed to download document');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'delayed':
        return <Badge variant="destructive">Delayed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Signed</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800">Pending Signature</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl">Profile</h1>
          <p className="text-gray-600">Manage your account and view your activity history</p>
        </div>
      </div>

      {/* User Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            {(user as any).avatar && (
              <img
                src={(user as any).avatar}
                alt={user.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <div className="space-y-1">
              <h3 className="text-lg">{user.name}</h3>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500">Employee ID: {user.employeeId}</p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Device Checks Completed</p>
                <p className="text-xl">{userActivity.deviceChecks.filter(check => check.status === 'completed').length}</p>
              </div>
              <div>
                <p className="text-gray-500">Documents Signed</p>
                <p className="text-xl">{userActivity.documentsSigned.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Documents Uploaded</p>
                <p className="text-xl">{userActivity.documentsUploaded.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Documents Assigned</p>
                <p className="text-xl">{userActivity.documentsAssigned.length}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Account Settings */}
          <div className="pt-4">
            <h4 className="text-lg mb-3">Account Settings</h4>

            {/* Edit Profile Section */}
            <div className="p-4 border border-green-200 rounded-lg bg-green-50 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="text-green-800 mb-1">Edit Profile</h5>
                  <p className="text-sm text-green-600">
                    Update your name and employee ID.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProfileData({ name: user.name, employeeId: user.employeeId });
                    setShowEditProfile(true);
                  }}
                >
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="text-blue-800 mb-1">Change Password</h5>
                  <p className="text-sm text-blue-600">
                    Update your account password for better security.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChangePassword(true)}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </div>

            <Separator />

            {/* Danger Zone */}
            <h4 className="text-lg text-red-700 mb-3 mt-6">Danger Zone</h4>

            {/* Delete Account Section */}
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="text-red-800 mb-1">Delete Account</h5>
                  <p className="text-sm text-red-600">
                    Once you delete your account, there is no going back. This action cannot be undone.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your account and remove all your data from our servers.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => setShowSecondConfirmation(true)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Yes, I understand
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Second confirmation dialog */}
                <AlertDialog open={showSecondConfirmation} onOpenChange={setShowSecondConfirmation}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-red-600">Final Confirmation</AlertDialogTitle>
                      <AlertDialogDescription>
                        <strong>This is your last chance!</strong>
                        <br />
                        <br />
                        Deleting your account will:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Permanently delete all your data</li>
                          <li>Remove your access to the system</li>
                          <li>Delete your check history and document records</li>
                        </ul>
                        <br />
                        Are you sure you want to proceed?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setShowSecondConfirmation(false)}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete My Account Forever'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity History */}
      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="device-checks" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
              <TabsTrigger value="device-checks">
                Device Checks ({userActivity.deviceChecks.length})
              </TabsTrigger>
              <TabsTrigger value="documents-signed">
                Documents Signed ({userActivity.documentsSigned.length})
              </TabsTrigger>
              <TabsTrigger value="documents-uploaded">
                Documents Uploaded ({userActivity.documentsUploaded.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="device-checks" className="space-y-4">
              {userActivity.deviceChecks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No device checks completed yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userActivity.deviceChecks.map((check) => (
                    <Card key={check.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <Settings className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm">{check.deviceName}</p>
                              <p className="text-xs text-gray-500">
                                Week {check.week}, {check.year} •
                                {check.completedAt && ` Completed: ${new Date(check.completedAt).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                          {check.comment && (
                            <p className="text-xs text-gray-600 mt-2 ml-7">{check.comment}</p>
                          )}
                        </div>
                        {getStatusBadge(check.status)}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents-signed" className="space-y-4">
              {userActivity.documentsSigned.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No documents signed yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userActivity.documentsSigned.map((document) => (
                    <Card key={document.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm">{document.fileName}</p>
                              <p className="text-xs text-gray-500">
                                Uploaded by: {document.uploadedBy} •
                                Signed: {new Date(document.signedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getDocumentStatusBadge(document.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDocument(document)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents-uploaded" className="space-y-4">
              {userActivity.documentsUploaded.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userActivity.documentsUploaded.map((document) => (
                    <Card key={document.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm">{document.fileName}</p>
                              <p className="text-xs text-gray-500">
                                Assigned to: {document.assignedTo} •
                                Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getDocumentStatusBadge(document.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDocument(document)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <AlertDialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Password</AlertDialogTitle>
            <AlertDialogDescription>
              Update your account password below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleChangePassword}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="old-password">Current Password</Label>
                <Input
                  id="old-password"
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-600">
                  Must be at least 8 characters long
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowChangePassword(false);
                setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction type="submit" className="bg-blue-600 hover:bg-blue-700">
                Change Password
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Profile Dialog */}
      <AlertDialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Update your profile information and click Save to apply changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleUpdateProfile}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-employee-id">Employee ID</Label>
                <Input
                  id="profile-employee-id"
                  type="text"
                  value={profileData.employeeId}
                  onChange={(e) => setProfileData({ ...profileData, employeeId: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-600">
                  This must be unique across all employees
                </p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowEditProfile(false);
                setProfileData({ name: '', employeeId: '' });
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="save-profile">
                Save Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}