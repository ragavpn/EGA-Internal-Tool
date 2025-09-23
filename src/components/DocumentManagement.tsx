import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey, functionsBase } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Upload, Download, FileText, PenTool, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from "sonner";
import { AppUser } from '../App';

interface Document {
  id: string;
  fileName: string;
  storagePath: string;
  assignedTo: string;
  uploadedBy: string;
  status: 'pending_signature' | 'completed';
  uploadedAt: string;
  signatures: Array<{
    signedBy: string;
    signedAt: string;
    type: 'initial' | 'secondary';
  }>;
}

interface DocumentManagementProps {
  user: AppUser;
}

export function DocumentManagement({ user }: DocumentManagementProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assignedTo, setAssignedTo] = useState('');
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [selectedDocumentForSigning, setSelectedDocumentForSigning] = useState<Document | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);

  useEffect(() => {
    fetchDocuments();
    fetchUsers();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(
        `${functionsBase(projectId)}/documents`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const documentsData = await response.json();
        setDocuments(documentsData);
      } else {
        console.error('Failed to fetch documents:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
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
        toast.error('Failed to load employees for assignment');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load employees for assignment');
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !assignedTo) {
      toast.error('Please select a file and assign it to someone');
      return;
    }

    if (selectedFile.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('assignedTo', assignedTo);
      formData.append('uploadedBy', user.employeeId);

      const response = await fetch(
        `${functionsBase(projectId)}/documents/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: formData
        }
      );

      if (response.ok) {
        const result = await response.json();
        setDocuments(prev => [...prev, result.document]);
        toast.success('Document uploaded successfully and assigned for signature');
        setSelectedFile(null);
        setAssignedTo('');
        setIsUploadDialogOpen(false);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      const response = await fetch(
        `${functionsBase(projectId)}/documents/${document.id}/download`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        // Open download URL in new tab
        window.open(result.downloadUrl, '_blank');
      } else {
        toast.error('Failed to generate download link');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const handleSignDocument = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signedFile || !selectedDocumentForSigning) {
      toast.error('Please select the signed PDF file');
      return;
    }

    if (signedFile.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    try {
      setSigning(true);

      const formData = new FormData();
      formData.append('file', signedFile);
      formData.append('signedBy', user.employeeId);

      const response = await fetch(
        `${functionsBase(projectId)}/documents/${selectedDocumentForSigning.id}/sign`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: formData
        }
      );

      if (response.ok) {
        const result = await response.json();
        setDocuments(prev =>
          prev.map(doc =>
            doc.id === selectedDocumentForSigning.id ? result.document : doc
          )
        );
        toast.success('Document signed successfully');
        setSignedFile(null);
        setSelectedDocumentForSigning(null);
        setIsSignDialogOpen(false);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to sign document');
      }
    } catch (error) {
      console.error('Error signing document:', error);
      toast.error('Failed to sign document');
    } finally {
      setSigning(false);
    }
  };

  // Filter documents for different tabs
  const pendingSignatures = documents.filter(doc =>
    doc.assignedTo === user.employeeId && doc.status === 'pending_signature'
  );
  const assignedByMe = documents.filter(doc =>
    doc.uploadedBy === user.employeeId
  );
  const completedByMe = documents.filter(doc =>
    doc.status === 'completed' &&
    doc.signatures.some(sig => sig.signedBy === user.employeeId && sig.type === 'secondary')
  );

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
          <h1 className="text-2xl">Document Management</h1>
          <p className="text-gray-600">Upload and manage PDF documents requiring signatures</p>
        </div>

        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload PDF Document</DialogTitle>
              <DialogDescription>
                Upload a PDF document and assign it to an employee for signature
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pdf-file">PDF Document</Label>
                <Input
                  id="pdf-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  required
                />
                <p className="text-xs text-gray-600">Only PDF files are accepted</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assign-to">Assign to Employee</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee for signature" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.employeeId !== user.employeeId).map(user => (
                      <SelectItem key={user.employeeId} value={user.employeeId}>
                        {user.name} ({user.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={uploading} className="flex-1">
                  {uploading ? 'Uploading...' : 'Upload & Assign'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="pending" className="text-xs sm:text-sm px-2 py-2">
            <span className="hidden sm:inline">Pending Signatures</span>
            <span className="sm:hidden">Pending</span>
            <span className="ml-1">({pendingSignatures.length})</span>
          </TabsTrigger>
          <TabsTrigger value="assigned-by-me" className="text-xs sm:text-sm px-2 py-2">
            <span className="hidden sm:inline">Assigned by Me</span>
            <span className="sm:hidden">Assigned</span>
            <span className="ml-1">({assignedByMe.length})</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm px-2 py-2">
            <span className="hidden sm:inline">Documents Signed</span>
            <span className="sm:hidden">Signed</span>
            <span className="ml-1">({completedByMe.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingSignatures.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <PenTool className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg mb-2">No pending signatures</h3>
              <p className="text-gray-600">
                You don't have any documents waiting for your signature.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingSignatures.map((document) => (
                <Card key={document.id} className="border-l-4 border-l-orange-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{document.fileName}</CardTitle>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <p><strong>Uploaded by:</strong> {document.uploadedBy}</p>
                      <p><strong>Uploaded:</strong> {new Date(document.uploadedAt).toLocaleDateString()}</p>
                    </div>

                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-sm text-orange-800">
                        <strong>Action Required:</strong> This document requires your signature
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownloadDocument(document)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => setSelectedDocumentForSigning(document)}
                          >
                            <PenTool className="h-4 w-4 mr-1" />
                            Sign
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Sign Document</DialogTitle>
                            <DialogDescription>
                              Upload the signed version of "{document.fileName}"
                            </DialogDescription>
                          </DialogHeader>

                          <form onSubmit={handleSignDocument} className="space-y-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm">
                                <strong>Document:</strong> {document.fileName}
                              </p>
                              <p className="text-sm text-gray-600">
                                <strong>Uploaded by:</strong> {document.uploadedBy}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="signed-pdf">Signed PDF Document</Label>
                              <Input
                                id="signed-pdf"
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setSignedFile(e.target.files?.[0] || null)}
                                required
                              />
                              <p className="text-xs text-gray-600">
                                Please download the original, add your signature, and upload the signed version
                              </p>
                            </div>

                            <div className="flex gap-2 pt-4">
                              <Button type="submit" disabled={signing} className="flex-1">
                                {signing ? 'Uploading...' : 'Upload Signed Document'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setIsSignDialogOpen(false);
                                  setSelectedDocumentForSigning(null);
                                  setSignedFile(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assigned-by-me" className="space-y-4">
          {assignedByMe.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg mb-2">No documents assigned</h3>
              <p className="text-gray-600">
                You haven't uploaded any documents for others to sign yet.
              </p>
              <Button onClick={() => setIsUploadDialogOpen(true)} className="mt-4">
                <Upload className="h-4 w-4 mr-2" />
                Upload First Document
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedByMe.map((document) => renderDocumentCard(document))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedByMe.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg mb-2">No documents signed</h3>
              <p className="text-gray-600">
                You haven't signed any documents yet.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedByMe.map((document) => renderDocumentCard(document))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  function renderDocumentCard(document: Document) {
    const getStatusBadge = () => {
      if (document.status === 'completed') {
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      } else {
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      }
    };

    return (
      <Card key={document.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{document.fileName}</CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="text-sm text-gray-600">
            <p><strong>Uploaded by:</strong> {document.uploadedBy}</p>
            <p><strong>Assigned to:</strong> {document.assignedTo}</p>
            <p><strong>Uploaded:</strong> {new Date(document.uploadedAt).toLocaleDateString()}</p>
          </div>

          {document.signatures.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 mb-2"><strong>Signatures:</strong></p>
              {document.signatures.map((sig, index) => (
                <p key={index} className="text-xs text-blue-700">
                  {sig.signedBy} ({sig.type}) - {new Date(sig.signedAt).toLocaleDateString()}
                </p>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => handleDownloadDocument(document)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </CardContent>
      </Card>
    );
  }
}