import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createClient } from '@supabase/supabase-js';
import * as kv from './kv_store';

// Helper to get env vars in either Deno or Node environments.
const getEnv = (key: string): string | undefined => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyGlobal: any = typeof globalThis !== 'undefined' ? globalThis : undefined;
  if (anyGlobal && typeof anyGlobal.Deno !== 'undefined' && anyGlobal.Deno?.env?.get) {
    return anyGlobal.Deno.env.get(key);
  }
  return process?.env?.[key];
};

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use('*', logger(console.log));

// Initialize Supabase client for storage with proper typing
const supabase = createClient(
  getEnv('SUPABASE_URL') ?? '',
  getEnv('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Get environment-based configuration
const KV_TABLE_NAME = getEnv('KV_TABLE_NAME') || 'kv_store_354d5d14';
const EDGE_FN_NAME = getEnv('EDGE_FN_NAME') || 'make-server-354d5d14';
const BUCKET_NAME = `${EDGE_FN_NAME.replace(/[^a-z0-9]/gi, '-')}-pdfs`;

// Helper function to get ISO week number
function getWeekNumber(date: Date): number {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// Create storage bucket on startup
async function initializeStorage() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        allowedMimeTypes: ['application/pdf'],
        fileSizeLimit: 10485760 // 10MB
      });
      if (error) {
        console.log('Error creating bucket:', error);
      } else {
        console.log('PDF storage bucket created successfully');
      }
    }
  } catch (error) {
    console.log('Error initializing storage:', error);
  }
}

// Initialize storage on startup
initializeStorage();

// Base path for all routes - must include the function name for Supabase Edge Functions
// Even though the external URL is /functions/v1/<function-name>, the internal routes
// need to include the function name prefix for proper routing.
const BASE_PATH = `/${EDGE_FN_NAME}`;

// Health check
app.get(`${BASE_PATH}/health`, (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple test endpoint
app.get(`${BASE_PATH}/test`, (c) => {
  console.log('Test endpoint hit');
  return c.json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

// Handle CORS preflight requests
app.options('*', (c) => {
  // Use a standard Response with 204 status to avoid type overload issues
  return new Response('', { status: 204 });
});

// User signup route (for email/password registration)
app.post(`${BASE_PATH}/signup`, async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, employeeId } = body;

    console.log('Signup request received:', { email, employeeId, name });

    // Validate required fields
    if (!email || !password || !name || !employeeId) {
      console.log('Missing required fields:', { email: !!email, password: !!password, name: !!name, employeeId: !!employeeId });
      return c.json({ error: 'All fields are required' }, 400);
    }

    // Check if user already exists in Supabase Auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some((u: any) =>
      u.email === email || u.user_metadata?.employeeId === employeeId
    );

    if (userExists) {
      console.log('User already exists:', employeeId);
      return c.json({ error: 'User with this email or employee ID already exists' }, 409);
    }

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: {
        name: name,
        employeeId: employeeId,
        avatar: null,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        loginMethod: 'email',
        notifications: []
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log('Supabase signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    console.log('User created successfully:', employeeId);
    return c.json({
      success: true,
      user: {
        employeeId,
        email,
        name,
        avatar: null,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        loginMethod: 'email',
        notifications: [],
        supabaseUserId: data.user?.id || null
      }
    });
  } catch (error) {
    console.log('Error creating user:', error);
    return c.json({ error: 'Failed to create user: ' + String(error) }, 500);
  }
});

// Admin authentication endpoint
app.post(`${BASE_PATH}/admin/auth`, async (c) => {
  try {
    const { username, password } = await c.req.json();

    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }

    // Get admin credentials from environment variables
    const adminUsername = getEnv('ADMIN_USERNAME') || 'admin';
    const adminPassword = getEnv('ADMIN_PASSWORD') || 'egainternaltool2025';

    if (username === adminUsername && password === adminPassword) {
      return c.json({
        success: true,
        admin: {
          username: adminUsername,
          isAdmin: true,
          authenticatedAt: new Date().toISOString()
        }
      });
    } else {
      return c.json({ error: 'Invalid admin credentials' }, 401);
    }
  } catch (error) {
    console.log('Admin authentication error:', error);
    return c.json({ error: 'Failed to authenticate admin' }, 500);
  }
});

// Admin password change endpoint
app.post(`${BASE_PATH}/admin/change-password`, async (c) => {
  try {
    const { currentPassword, newPassword } = await c.req.json();

    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Current and new passwords are required' }, 400);
    }

    // Get current admin password from environment
    const adminPassword = getEnv('ADMIN_PASSWORD') || 'egainternaltool2025';

    if (currentPassword !== adminPassword) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }

    // Note: In a real implementation, you would update the password in your environment
    // For now, this is a placeholder that always succeeds
    console.log('Admin password change requested - would update ADMIN_PASSWORD secret');

    return c.json({
      success: true,
      message: 'Password change request received. Please update ADMIN_PASSWORD environment variable manually.'
    });
  } catch (error) {
    console.log('Admin password change error:', error);
    return c.json({ error: 'Failed to change admin password' }, 500);
  }
});

// User profile update route (for social login updates)
app.post(`${BASE_PATH}/users/profile`, async (c) => {
  try {
    const { supabaseUserId, name, avatar } = await c.req.json();

    if (!supabaseUserId) {
      return c.json({ error: 'Supabase user ID is required' }, 400);
    }

    // Update user metadata in Supabase Auth
    const { data, error } = await supabase.auth.admin.updateUserById(supabaseUserId, {
      user_metadata: {
        name: name,
        avatar: avatar,
        lastLoginAt: new Date().toISOString()
      }
    });

    if (error) {
      console.log('Error updating user profile:', error);
      return c.json({ error: 'Failed to update user profile' }, 500);
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log('Error updating user profile:', error);
    return c.json({ error: 'Failed to update user profile' }, 500);
  }
});

app.get(`${BASE_PATH}/users/:employeeId`, async (c) => {
  try {
    const employeeId = c.req.param('employeeId');

    // Get user from Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.log('Error fetching auth users:', authError);
      return c.json({ error: 'Failed to fetch user' }, 500);
    }

    const authUser = authData?.users?.find((u: any) =>
      u.user_metadata?.employeeId === employeeId ||
      (u.email && u.email.split('@')[0] === employeeId)
    );

    if (!authUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Return user data from auth with consistent format
    const userData = {
      employeeId: authUser.user_metadata?.employeeId || authUser.email?.split('@')[0] || authUser.id.slice(0, 8),
      email: authUser.email || '',
      name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || 'User',
      avatar: authUser.user_metadata?.avatar || null,
      createdAt: authUser.user_metadata?.createdAt || authUser.created_at,
      lastLoginAt: authUser.user_metadata?.lastLoginAt || authUser.last_sign_in_at,
      loginMethod: authUser.user_metadata?.loginMethod || 'unknown',
      notifications: authUser.user_metadata?.notifications || [],
      supabaseUserId: authUser.id
    };

    return c.json(userData);
  } catch (error) {
    console.log('Error fetching user:', error);
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

// Get all users endpoint for assignments and selections
app.get(`${BASE_PATH}/users`, async (c) => {
  try {
    // Get all auth users from Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.log('Error listing auth users:', authError);
      return c.json({ error: 'Failed to fetch users' }, 500);
    }

    const usersArray: any[] = Array.isArray(authData) ? authData : (authData?.users ?? []);

    // Return users with minimal information for assignments
    const userList = usersArray.map((u: any) => ({
      employeeId: u.user_metadata?.employeeId || (u.email ? u.email.split('@')[0] : u.id.slice(0, 8)),
      name: u.user_metadata?.name || u.user_metadata?.full_name || u.email || 'User',
      email: u.email || '',
      notifications: u.user_metadata?.notifications || []
    }));

    return c.json(userList);
  } catch (error) {
    console.log('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// Admin get all users with full details
app.get(`${BASE_PATH}/admin/users`, async (c) => {
  try {
    // Get all auth users from Supabase (admin API)
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.log('Error listing auth users:', authError);
      return c.json({ error: 'Failed to list auth users' }, 500);
    }

    const usersArray: any[] = Array.isArray(authData) ? authData : (authData?.users ?? []);

    const users = (usersArray || []).map((u: any) => ({
      employeeId: u.user_metadata?.employeeId || (u.email ? u.email.split('@')[0] : u.id.slice(0, 8)),
      name: u.user_metadata?.name || u.user_metadata?.full_name || u.email || 'User',
      email: u.email || '',
      createdAt: u.user_metadata?.createdAt || u.created_at || null,
      lastLoginAt: u.user_metadata?.lastLoginAt || u.last_sign_in_at || null,
      notifications: u.user_metadata?.notifications || [],
      supabaseUserId: u.id
    }));

    return c.json(users);
  } catch (error) {
    console.log('Error fetching admin users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// Admin delete user
app.delete(`${BASE_PATH}/admin/users/:employeeId`, async (c) => {
  try {
    const employeeId = c.req.param('employeeId');

    // Find user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.log('Error fetching auth users:', authError);
      return c.json({ error: 'Failed to fetch users' }, 500);
    }

    const authUser = authData?.users?.find((u: any) =>
      u.user_metadata?.employeeId === employeeId ||
      (u.email && u.email.split('@')[0] === employeeId)
    );

    if (!authUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Delete user from Supabase Auth
    const { error } = await supabase.auth.admin.deleteUser(authUser.id);
    if (error) {
      console.log('Error deleting user from Supabase Auth:', error);
      return c.json({ error: 'Failed to delete user' }, 500);
    }

    console.log(`Admin deleted user: ${employeeId}`);
    return c.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.log('Error deleting user:', error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

// Self-delete user endpoint (for profile deletion)
app.delete(`${BASE_PATH}/user/:employeeId`, async (c) => {
  try {
    const employeeId = c.req.param('employeeId');

    // Find user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.log('Error fetching auth users:', authError);
      return c.json({ error: 'Failed to fetch users' }, 500);
    }

    const authUser = authData?.users?.find((u: any) =>
      u.user_metadata?.employeeId === employeeId ||
      (u.email && u.email.split('@')[0] === employeeId)
    );

    if (!authUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Delete user from Supabase Auth
    const { error } = await supabase.auth.admin.deleteUser(authUser.id);
    if (error) {
      console.log('Error deleting user from Supabase Auth:', error);
      return c.json({ error: 'Failed to delete user' }, 500);
    }

    console.log(`User deleted their account: ${employeeId}`);
    return c.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.log('Error deleting user:', error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

// Profile update endpoint
app.put(`${BASE_PATH}/user/:employeeId/profile`, async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    const { name, newEmployeeId, avatar } = await c.req.json();

    // Find user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.log('Error fetching auth users:', authError);
      return c.json({ error: 'Failed to fetch users' }, 500);
    }

    const authUser = authData?.users?.find((u: any) =>
      u.user_metadata?.employeeId === employeeId ||
      (u.email && u.email.split('@')[0] === employeeId)
    );

    if (!authUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if new employee ID is already taken (if provided)
    if (newEmployeeId && newEmployeeId !== employeeId) {
      const existingUser = authData?.users?.find((u: any) =>
        u.user_metadata?.employeeId === newEmployeeId ||
        (u.email && u.email.split('@')[0] === newEmployeeId)
      );

      if (existingUser) {
        return c.json({ error: 'Employee ID already taken' }, 409);
      }
    }

    // Update user metadata
    const updatedMetadata = {
      ...authUser.user_metadata,
      name: name || authUser.user_metadata?.name,
      employeeId: newEmployeeId || authUser.user_metadata?.employeeId,
      avatar: avatar !== undefined ? avatar : authUser.user_metadata?.avatar
    };

    const { data, error } = await supabase.auth.admin.updateUserById(authUser.id, {
      user_metadata: updatedMetadata
    });

    if (error) {
      console.log('Error updating user profile:', error);
      return c.json({ error: 'Failed to update profile' }, 500);
    }

    // Return updated user data
    const userData = {
      employeeId: updatedMetadata.employeeId,
      email: authUser.email || '',
      name: updatedMetadata.name,
      avatar: updatedMetadata.avatar || null,
      createdAt: authUser.user_metadata?.createdAt || authUser.created_at,
      lastLoginAt: authUser.user_metadata?.lastLoginAt || authUser.last_sign_in_at,
      loginMethod: authUser.user_metadata?.loginMethod || 'unknown',
      notifications: authUser.user_metadata?.notifications || [],
      supabaseUserId: authUser.id
    };

    console.log(`User updated profile: ${employeeId} -> ${updatedMetadata.employeeId}`);
    return c.json({ success: true, user: userData });
  } catch (error) {
    console.log('Error updating user profile:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// Clear users only
app.delete(`${BASE_PATH}/clear-users`, async (c) => {
  try {
    console.log('Clearing all users from database...');

    // Get all auth users from Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.log('Error fetching auth users:', authError);
      return c.json({ error: 'Failed to fetch users' }, 500);
    }

    const usersArray: any[] = Array.isArray(authData) ? authData : (authData?.users ?? []);
    console.log(`Found ${usersArray.length} users`);

    let deletedCount = 0;
    for (const user of usersArray) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        if (error) {
          console.log('Error deleting auth user:', error);
        } else {
          deletedCount++;
        }
      } catch (err) {
        console.log('Failed to delete auth user:', err);
      }
    }

    console.log('All users cleared successfully');
    return c.json({
      success: true,
      message: 'All users cleared successfully',
      cleared: deletedCount
    });
  } catch (error) {
    console.log('Error clearing users:', error);
    return c.json({ error: 'Failed to clear users' }, 500);
  }
});

// Annual reports endpoint - aggregate completed checks by device location
app.get(`${BASE_PATH}/reports/annual/:year`, async (c) => {
  try {
    const yearParam = c.req.param('year');
    const year = parseInt(yearParam, 10);
    if (isNaN(year)) return c.json({});

    const allChecks = await kv.getByPrefix('check:');
    const completedChecks = (allChecks || []).filter((ch: any) => ch.status === 'completed' && ch.completedAt && new Date(ch.completedAt).getFullYear() === year);

    const result: Record<string, any[]> = {};

    for (const ch of completedChecks) {
      // Attempt to fetch device info
      const device = await kv.get(ch.deviceId) || { name: ch.deviceId, location: 'Unknown' };
      const location = device.location || 'Unknown';
      if (!result[location]) result[location] = [];
      result[location].push({
        deviceName: device.name || device.deviceName || 'Unknown Device',
        deviceId: ch.deviceId,
        week: ch.week,
        completedAt: ch.completedAt,
        completedBy: ch.completedBy,
        comment: ch.comment || ''
      });
    }

    return c.json(result);
  } catch (error) {
    console.log('Error generating annual report:', error);
    return c.json({}, 500);
  }
});

// Clear devices and checks
app.delete(`${BASE_PATH}/clear-devices`, async (c) => {
  try {
    console.log('Clearing all devices and checks from database...');

    const allDevicesWithKeys = await kv.getByPrefixWithKeys('device:');
    const allChecksWithKeys = await kv.getByPrefixWithKeys('check:');
    const allPlansWithKeys = await kv.getByPrefixWithKeys('plan:');

    console.log(`Found ${allDevicesWithKeys.length} devices, ${allChecksWithKeys.length} checks, ${allPlansWithKeys.length} plans`);

    // Delete all devices
    for (const row of allDevicesWithKeys) {
      await kv.del(row.key);
    }

    // Delete all checks
    for (const row of allChecksWithKeys) {
      await kv.del(row.key);
    }

    // Delete all plans
    for (const row of allPlansWithKeys) {
      await kv.del(row.key);
    }

    console.log('All devices and checks cleared successfully');
    return c.json({
      success: true,
      message: 'All devices and checks cleared successfully',
      cleared: {
        devices: allDevicesWithKeys.length,
        checks: allChecksWithKeys.length,
        plans: allPlansWithKeys.length
      }
    });
  } catch (error) {
    console.log('Error clearing devices:', error);
    return c.json({ error: 'Failed to clear devices and checks' }, 500);
  }
});

// Clear documents only
app.delete(`${BASE_PATH}/clear-documents`, async (c) => {
  try {
    console.log('Clearing all documents from database and storage...');

    const allDocumentsWithKeys = await kv.getByPrefixWithKeys('doc:');
    console.log(`Found ${allDocumentsWithKeys.length} documents`);

    let deletedFiles = 0;
    let failedFiles = 0;

    // Delete physical files from storage and database records
    for (const row of allDocumentsWithKeys) {
      const document = row.value;

      // Delete physical file from storage if storagePath exists
      if (document?.storagePath) {
        try {
          const { error: storageError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([document.storagePath]);

          if (storageError) {
            console.log(`Failed to delete file ${document.storagePath}:`, storageError);
            failedFiles++;
          } else {
            deletedFiles++;
            console.log(`Deleted file: ${document.storagePath}`);
          }
        } catch (err) {
          console.log(`Error deleting file ${document.storagePath}:`, err);
          failedFiles++;
        }
      }

      // Delete database record
      await kv.del(row.key);
    }

    console.log(`All documents cleared successfully. Files deleted: ${deletedFiles}, Failed: ${failedFiles}`);
    return c.json({
      success: true,
      message: `All documents cleared successfully. Files deleted: ${deletedFiles}, Failed: ${failedFiles}`,
      cleared: allDocumentsWithKeys.length,
      filesDeleted: deletedFiles,
      filesFailed: failedFiles
    });
  } catch (error) {
    console.log('Error clearing documents:', error);
    return c.json({ error: 'Failed to clear documents' }, 500);
  }
});

// Get all documents endpoint
app.get(`${BASE_PATH}/documents`, async (c) => {
  try {
    const documents = await kv.getByPrefix('doc:');
    return c.json(documents);
  } catch (error) {
    console.log('Error fetching documents:', error);
    return c.json({ error: 'Failed to fetch documents' }, 500);
  }
});

// Delete individual document with physical file removal
app.delete(`${BASE_PATH}/documents/:documentId`, async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const document = await kv.get(documentId);

    if (!document) {
      return c.json({ error: 'Document not found' }, 404);
    }

    // Delete physical file from storage if it exists
    let fileDeleted = false;
    let fileError = null;

    if (document.storagePath) {
      try {
        const { error: storageError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([document.storagePath]);

        if (storageError) {
          console.log(`Failed to delete file ${document.storagePath}:`, storageError);
          fileError = storageError.message;
        } else {
          fileDeleted = true;
          console.log(`Deleted file: ${document.storagePath}`);
        }
      } catch (err) {
        console.log(`Error deleting file ${document.storagePath}:`, err);
        fileError = String(err);
      }
    }

    // Delete database record
    await kv.del(documentId);

    console.log(`Document ${documentId} deleted successfully. File deleted: ${fileDeleted}`);
    return c.json({
      success: true,
      message: 'Document deleted successfully',
      fileDeleted,
      fileError: fileError || undefined
    });
  } catch (error) {
    console.log('Error deleting document:', error);
    return c.json({ error: 'Failed to delete document' }, 500);
  }
});

// Device management routes
app.post(`${BASE_PATH}/devices`, async (c) => {
  try {
    const deviceData = await c.req.json();
    const deviceId = `device:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;

    const device = {
      id: deviceId,
      ...deviceData,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    await kv.set(deviceId, device);
    return c.json({ success: true, device });
  } catch (error) {
    console.log('Error creating device:', error);
    return c.json({ error: 'Failed to create device' }, 500);
  }
});

app.get(`${BASE_PATH}/devices`, async (c) => {
  try {
    const devices = await kv.getByPrefix('device:');
    return c.json(devices);
  } catch (error) {
    console.log('Error fetching devices:', error);
    return c.json({ error: 'Failed to fetch devices' }, 500);
  }
});

app.delete(`${BASE_PATH}/devices/:deviceId`, async (c) => {
  try {
    const deviceId = c.req.param('deviceId');
    const device = await kv.get(deviceId);

    if (!device) {
      return c.json({ error: 'Device not found' }, 404);
    }

    // Delete all associated checks for this device
    const allChecks = await kv.getByPrefix('check:');
    const deviceChecks = allChecks.filter(check => check.deviceId === deviceId);

    for (const check of deviceChecks) {
      await kv.del(check.id);
    }

    // Delete the device
    await kv.del(deviceId);

    console.log(`Deleted device ${deviceId} and ${deviceChecks.length} associated checks`);
    return c.json({ success: true, message: 'Device and associated records deleted successfully' });
  } catch (error) {
    console.log('Error deleting device:', error);
    return c.json({ error: 'Failed to delete device' }, 500);
  }
});

app.get(`${BASE_PATH}/devices/by-location/:location`, async (c) => {
  try {
    const location = c.req.param('location');
    const allDevices = await kv.getByPrefix('device:');
    const filteredDevices = allDevices.filter(device =>
      device.location.toLowerCase().includes(location.toLowerCase())
    );
    return c.json(filteredDevices);
  } catch (error) {
    console.log('Error fetching devices by location:', error);
    return c.json({ error: 'Failed to fetch devices by location' }, 500);
  }
});

// Get device with last check information
app.get(`${BASE_PATH}/devices/:deviceId/last-check`, async (c) => {
  try {
    const deviceId = c.req.param('deviceId');
    const device = await kv.get(deviceId);

    if (!device) {
      return c.json({ error: 'Device not found' }, 404);
    }

    // Get all completed checks for this device to find the most recent one
    const allChecks = await kv.getByPrefix('check:');
    const deviceChecks = allChecks
      .filter(check => check.deviceId === deviceId && check.status === 'completed')
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    const lastCheck = deviceChecks.length > 0 ? deviceChecks[0] : null;

    return c.json({
      device,
      lastCheck,
      hasBeenChecked: !!lastCheck,
      totalChecksCompleted: deviceChecks.length
    });
  } catch (error) {
    console.log('Error fetching device last check:', error);
    return c.json({ error: 'Failed to fetch device last check information' }, 500);
  }
});

// Weekly planning routes
app.post(`${BASE_PATH}/weekly-plans`, async (c) => {
  try {
    const { week, year, deviceIds, assignedBy } = await c.req.json();
    const planId = `plan:${year}:${week}`;

    const plan = {
      id: planId,
      week,
      year,
      deviceIds,
      assignedBy,
      createdAt: new Date().toISOString(),
      status: 'planned'
    };

    await kv.set(planId, plan);

    // Create individual device checks
    for (const deviceId of deviceIds) {
      const checkId = `check:${year}:${week}:${deviceId}`;
      const check = {
        id: checkId,
        deviceId,
        week,
        year,
        status: 'pending',
        assignedAt: new Date().toISOString(),
        assignedBy
      };
      await kv.set(checkId, check);
    }

    return c.json({ success: true, plan });
  } catch (error) {
    console.log('Error creating weekly plan:', error);
    return c.json({ error: 'Failed to create weekly plan' }, 500);
  }
});

app.get(`${BASE_PATH}/weekly-plans/:year/:week`, async (c) => {
  try {
    const year = c.req.param('year');
    const week = c.req.param('week');
    const checks = await kv.getByPrefix(`check:${year}:${week}:`);
    return c.json(checks);
  } catch (error) {
    console.log('Error fetching weekly plan:', error);
    return c.json({ error: 'Failed to fetch weekly plan' }, 500);
  }
});

// Device check completion with automatic next check scheduling
app.put(`${BASE_PATH}/checks/:checkId/complete`, async (c) => {
  try {
    const checkId = c.req.param('checkId');
    const { completedBy, comment } = await c.req.json();

    const check = await kv.get(checkId);
    if (!check) {
      return c.json({ error: 'Check not found' }, 404);
    }

    // Get device details to determine next check frequency
    const device = await kv.get(check.deviceId);
    if (!device) {
      return c.json({ error: 'Device not found' }, 404);
    }

    const completedAt = new Date().toISOString();

    // Update the current check as completed
    const updatedCheck = {
      ...check,
      status: 'completed',
      completedBy,
      completedAt,
      comment: comment || ''
    };

    await kv.set(checkId, updatedCheck);

    // Update device with last check information
    const updatedDevice = {
      ...device,
      lastCheckedAt: completedAt,
      lastCheckedBy: completedBy
    };
    await kv.set(check.deviceId, updatedDevice);

    // Calculate next check week based on device's planned frequency
    const currentDate = new Date();
    const nextCheckDate = new Date(currentDate);
    nextCheckDate.setDate(currentDate.getDate() + (device.plannedFrequency * 7));

    const nextYear = nextCheckDate.getFullYear();
    const nextWeek = getWeekNumber(nextCheckDate);

    // Create next check automatically
    const nextCheckId = `check:${nextYear}:${nextWeek}:${check.deviceId}`;
    const nextCheck = {
      id: nextCheckId,
      deviceId: check.deviceId,
      week: nextWeek.toString(),
      year: nextYear.toString(),
      status: 'pending',
      assignedAt: completedAt,
      assignedBy: 'system' // Automatically assigned by system
    };

    await kv.set(nextCheckId, nextCheck);

    return c.json({
      success: true,
      check: updatedCheck,
      nextCheckScheduled: {
        checkId: nextCheckId,
        week: nextWeek,
        year: nextYear,
        scheduledFor: nextCheckDate.toISOString()
      }
    });
  } catch (error) {
    console.log('Error completing check:', error);
    return c.json({ error: 'Failed to complete check' }, 500);
  }
});

// Delayed devices
app.get(`${BASE_PATH}/delayed-checks`, async (c) => {
  try {
    const allChecks = await kv.getByPrefix('check:');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentWeek = getWeekNumber(currentDate);

    const delayedChecks = allChecks.filter(check => {
      if (check.status !== 'pending') return false;

      const checkYear = parseInt(check.year);
      const checkWeek = parseInt(check.week);

      // If check is from previous week or earlier
      return checkYear < currentYear ||
        (checkYear === currentYear && checkWeek < currentWeek);
    });

    return c.json(delayedChecks);
  } catch (error) {
    console.log('Error fetching delayed checks:', error);
    return c.json({ error: 'Failed to fetch delayed checks' }, 500);
  }
});

// PDF document management
app.post(`${BASE_PATH}/documents/upload`, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const assignedTo = formData.get('assignedTo') as string;
    const uploadedBy = formData.get('uploadedBy') as string;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const fileName = `${Date.now()}-${file.name}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file);

    if (error) {
      console.log('Error uploading file:', error);
      return c.json({ error: 'Failed to upload file' }, 500);
    }

    // Create document record
    const documentId = `doc:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const document = {
      id: documentId,
      fileName: file.name,
      storagePath: data.path,
      assignedTo,
      uploadedBy,
      status: 'pending_signature',
      uploadedAt: new Date().toISOString(),
      signatures: [
        {
          signedBy: uploadedBy,
          signedAt: new Date().toISOString(),
          type: 'initial'
        }
      ]
    };

    await kv.set(documentId, document);

    // Add notification for assigned user
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (!authError && authData?.users) {
      const assignedUser = authData.users.find((u: any) =>
        u.user_metadata?.employeeId === assignedTo ||
        (u.email && u.email.split('@')[0] === assignedTo)
      );

      if (assignedUser) {
        const notification = {
          id: `notif:${Date.now()}`,
          type: 'document_signature_required',
          documentId,
          message: `Document "${file.name}" requires your signature`,
          createdAt: new Date().toISOString(),
          read: false
        };

        const existingNotifications = assignedUser.user_metadata?.notifications || [];

        await supabase.auth.admin.updateUserById(assignedUser.id, {
          user_metadata: {
            ...assignedUser.user_metadata,
            notifications: [...existingNotifications, notification]
          }
        });
      }
    }

    return c.json({ success: true, document });
  } catch (error) {
    console.log('Error uploading document:', error);
    return c.json({ error: 'Failed to upload document' }, 500);
  }
});

app.get(`${BASE_PATH}/documents/:documentId/download`, async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const document = await kv.get(documentId);

    if (!document) {
      return c.json({ error: 'Document not found' }, 404);
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(document.storagePath, 3600); // 1 hour expiry

    if (error) {
      console.log('Error creating signed URL:', error);
      return c.json({ error: 'Failed to generate download URL' }, 500);
    }

    return c.json({ downloadUrl: data.signedUrl });
  } catch (error) {
    console.log('Error downloading document:', error);
    return c.json({ error: 'Failed to download document' }, 500);
  }
});

app.post(`${BASE_PATH}/documents/:documentId/sign`, async (c) => {
  try {
    const documentId = c.req.param('documentId');
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const signedBy = formData.get('signedBy') as string;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const document = await kv.get(documentId);
    if (!document) {
      return c.json({ error: 'Document not found' }, 404);
    }

    // Upload signed version
    const fileName = `signed-${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file);

    if (error) {
      console.log('Error uploading signed file:', error);
      return c.json({ error: 'Failed to upload signed file' }, 500);
    }

    // Update document record
    const updatedDocument = {
      ...document,
      storagePath: data.path,
      status: 'completed',
      signatures: [
        ...document.signatures,
        {
          signedBy,
          signedAt: new Date().toISOString(),
          type: 'secondary'
        }
      ]
    };

    await kv.set(documentId, updatedDocument);
    return c.json({ success: true, document: updatedDocument });
  } catch (error) {
    console.log('Error signing document:', error);
    return c.json({ error: 'Failed to sign document' }, 500);
  }
});

// Notifications
app.get(`${BASE_PATH}/notifications/:employeeId`, async (c) => {
  try {
    const employeeId = c.req.param('employeeId');

    // Get user from Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.log('Error fetching auth users:', authError);
      return c.json({ error: 'Failed to fetch user' }, 500);
    }

    const authUser = authData?.users?.find((u: any) =>
      u.user_metadata?.employeeId === employeeId ||
      (u.email && u.email.split('@')[0] === employeeId)
    );

    if (!authUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(authUser.user_metadata?.notifications || []);
  } catch (error) {
    console.log('Error fetching notifications:', error);
    return c.json({ error: 'Failed to fetch notifications' }, 500);
  }
});

app.put(`${BASE_PATH}/notifications/:notificationId/read`, async (c) => {
  try {
    const notificationId = c.req.param('notificationId');

    // Find user with this notification
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      return c.json({ error: 'Failed to fetch users' }, 500);
    }

    let targetUser = null;
    for (const user of authData?.users || []) {
      const notifications = user.user_metadata?.notifications || [];
      if (notifications.some((n: any) => n.id === notificationId)) {
        targetUser = user;
        break;
      }
    }

    if (!targetUser) {
      return c.json({ error: 'Notification not found' }, 404);
    }

    // Mark notification as read
    const updatedNotifications = (targetUser.user_metadata?.notifications || []).map((n: any) =>
      n.id === notificationId ? { ...n, read: true } : n
    );

    const { error } = await supabase.auth.admin.updateUserById(targetUser.id, {
      user_metadata: {
        ...targetUser.user_metadata,
        notifications: updatedNotifications
      }
    });

    if (error) {
      console.log('Error updating notifications:', error);
      return c.json({ error: 'Failed to mark notification as read' }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Error marking notification as read:', error);
    return c.json({ error: 'Failed to mark notification as read' }, 500);
  }
});

app.put(`${BASE_PATH}/notifications/:employeeId/read-all`, async (c) => {
  try {
    const employeeId = c.req.param('employeeId');

    // Get user from Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      return c.json({ error: 'Failed to fetch users' }, 500);
    }

    const authUser = authData?.users?.find((u: any) =>
      u.user_metadata?.employeeId === employeeId ||
      (u.email && u.email.split('@')[0] === employeeId)
    );

    if (!authUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Mark all notifications as read
    const updatedNotifications = (authUser.user_metadata?.notifications || []).map((n: any) => ({ ...n, read: true }));

    const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
      user_metadata: {
        ...authUser.user_metadata,
        notifications: updatedNotifications
      }
    });

    if (error) {
      console.log('Error updating notifications:', error);
      return c.json({ error: 'Failed to mark all notifications as read' }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Error marking all notifications as read:', error);
    return c.json({ error: 'Failed to mark all notifications as read' }, 500);
  }
});

// Clear all notifications for a user
app.delete(`${BASE_PATH}/notifications/:employeeId/clear`, async (c) => {
  try {
    const employeeId = c.req.param('employeeId');

    // Get user from Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      return c.json({ error: 'Failed to fetch users' }, 500);
    }

    const authUser = authData?.users?.find((u: any) =>
      u.user_metadata?.employeeId === employeeId ||
      (u.email && u.email.split('@')[0] === employeeId)
    );

    if (!authUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
      user_metadata: {
        ...authUser.user_metadata,
        notifications: []
      }
    });

    if (error) {
      console.log('Error clearing notifications:', error);
      return c.json({ error: 'Failed to clear notifications' }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Error clearing notifications:', error);
    return c.json({ error: 'Failed to clear notifications' }, 500);
  }
});

// Clear all data endpoint (for fresh start)
app.delete(`${BASE_PATH}/clear-all-data`, async (c) => {
  try {
    console.log('Clearing all data from database...');

    // Get all data from the database
    const allDevices = await kv.getByPrefix('device:');
    const allChecks = await kv.getByPrefix('check:');
    const allDocuments = await kv.getByPrefix('doc:');
    const allPlans = await kv.getByPrefix('plan:');

    // Get users from Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    const allUsers = authError ? [] : (authData?.users || []);

    console.log(`Found ${allUsers.length} users, ${allDevices.length} devices, ${allChecks.length} checks, ${allDocuments.length} documents, ${allPlans.length} plans`);

    // Delete all users from Supabase Auth
    let deletedUsers = 0;
    for (const user of allUsers) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        if (!error) deletedUsers++;
      } catch (err) {
        console.log('Failed to delete auth user:', err);
      }
    }

    // Delete all devices
    for (const device of allDevices) {
      await kv.del(device.id);
    }

    // Delete all checks
    for (const check of allChecks) {
      await kv.del(check.id);
    }

    // Delete all documents and their physical files
    let deletedFiles = 0;
    let failedFiles = 0;

    for (const document of allDocuments) {
      // Delete physical file from storage if it exists
      if (document.storagePath) {
        try {
          const { error: storageError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([document.storagePath]);

          if (storageError) {
            console.log(`Failed to delete file ${document.storagePath}:`, storageError);
            failedFiles++;
          } else {
            deletedFiles++;
          }
        } catch (err) {
          console.log(`Error deleting file ${document.storagePath}:`, err);
          failedFiles++;
        }
      }

      // Delete database record
      await kv.del(document.id);
    }

    // Delete all plans
    for (const plan of allPlans) {
      await kv.del(plan.id);
    }

    console.log(`All data cleared successfully. Document files deleted: ${deletedFiles}, Failed: ${failedFiles}`);
    return c.json({
      success: true,
      message: `All data cleared successfully. Document files deleted: ${deletedFiles}, Failed: ${failedFiles}`,
      cleared: {
        users: deletedUsers,
        devices: allDevices.length,
        checks: allChecks.length,
        documents: allDocuments.length,
        plans: allPlans.length,
        filesDeleted: deletedFiles,
        filesFailed: failedFiles
      }
    });
  } catch (error) {
    console.log('Error clearing all data:', error);
    return c.json({ error: 'Failed to clear all data' }, 500);
  }
});

// Cleanup sample data endpoint (admin-only utility)
// Call with: DELETE /cleanup-sample-data?confirm=true
// This will remove sample user profiles (employeeId like EMP00x), sample devices
// with known identificationNumbers, and associated checks/plans/docs.
app.delete(`${BASE_PATH}/cleanup-sample-data`, async (c) => {
  try {
    const confirm = c.req.query('confirm');
    if (confirm !== 'true') {
      return c.json({ error: 'Operation not confirmed. Add ?confirm=true to execute.' }, 400);
    }

    const deleted: Record<string, any[]> = {
      users: [],
      devices: [],
      checks: [],
      plans: [],
      documents: []
    };

    // Known sample employeeId pattern and sample device identification numbers
    const sampleEmployeePattern = /^EMP0\d+$/i;
    const sampleDeviceIds = new Set(['HP-001', 'CBS-002', 'CNC-003', 'COMP-004', 'WS-005']);

    // Cleanup users from Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (!authError && authData?.users) {
      for (const user of authData.users) {
        const employeeId = user.user_metadata?.employeeId || (user.email ? user.email.split('@')[0] : '');
        if (employeeId && sampleEmployeePattern.test(employeeId)) {
          try {
            await supabase.auth.admin.deleteUser(user.id);
            deleted.users.push(user.id);
          } catch (e) {
            console.log('Error deleting sample auth user', e);
          }
        }
      }
    }

    // Cleanup devices and collect their ids to remove related checks/plans/docs
    const devicesWithKeys = await kv.getByPrefixWithKeys('device:');
    const removedDeviceIds = new Set<string>();
    for (const row of devicesWithKeys) {
      const device = row.value;
      if (device?.identificationNumber && sampleDeviceIds.has(device.identificationNumber)) {
        removedDeviceIds.add(row.value.id || row.key);
        await kv.del(row.key);
        deleted.devices.push(row.key);
      }
    }

    // Cleanup checks linked to removed devices
    const checksWithKeys = await kv.getByPrefixWithKeys('check:');
    for (const row of checksWithKeys) {
      const check = row.value;
      if (check?.deviceId && removedDeviceIds.has(check.deviceId)) {
        await kv.del(row.key);
        deleted.checks.push(row.key);
      }
    }

    // Cleanup plans linked to removed devices
    const plansWithKeys = await kv.getByPrefixWithKeys('plan:');
    for (const row of plansWithKeys) {
      const plan = row.value;
      if (plan?.deviceIds && Array.isArray(plan.deviceIds)) {
        const intersects = plan.deviceIds.some((id: string) => removedDeviceIds.has(id));
        if (intersects) {
          await kv.del(row.key);
          deleted.plans.push(row.key);
        }
      }
    }

    // Cleanup documents associated with removed devices (if document has device references)
    const docsWithKeys = await kv.getByPrefixWithKeys('doc:');
    for (const row of docsWithKeys) {
      const doc = row.value;
      if (doc?.deviceId && removedDeviceIds.has(doc.deviceId)) {
        await kv.del(row.key);
        deleted.documents.push(row.key);
      }
    }

    return c.json({ success: true, deleted });
  } catch (error) {
    console.log('Error cleaning sample data:', error);
    return c.json({ error: 'Failed to cleanup sample data' }, 500);
  }
});

// Start the server
// In Deno deploy environments (e.g., Supabase Edge Functions) use Deno.serve.
// In other environments (local dev, Node) export the app so it can be used
// by a different runner. This keeps the file free of unresolved global
// references in TypeScript while remaining deployable under Deno.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyGlobal: any = typeof globalThis !== 'undefined' ? globalThis : undefined;
if (anyGlobal && anyGlobal.Deno && typeof anyGlobal.Deno.serve === 'function') {
  anyGlobal.Deno.serve(app.fetch);
}

// Export the app for usage by non-Deno runners (Node-based adapters/tests).
export default app;