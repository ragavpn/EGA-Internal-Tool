import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey, functionsBase } from '../utils/supabase/info';
import { supabase } from '../utils/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { toast } from "sonner";
import { Eye, EyeOff } from 'lucide-react';
import { AppUser } from '../App';

interface AuthScreenProps {
  onUserLogin: (user: AppUser) => void;
  onAdminLogin: (admin: { username: string; isAdmin: boolean }) => void;
}

export function AuthScreen({ onUserLogin, onAdminLogin }: AuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [adminFormData, setAdminFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Test server connectivity on component mount
  useEffect(() => {
    const testServerConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(
          `${functionsBase(projectId)}/test`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);
        setServerConnected(response.ok);

        if (!response.ok) {
          console.log('Server responded but with error status:', response.status);
        }
      } catch (error) {
        console.log('Server connection test failed:', error);
        setServerConnected(false);
      }
    };

    testServerConnection();
  }, []);

  useEffect(() => {
    // Check for existing session on component mount
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await handleSocialLoginSuccess(session.user);
      }
    };

    checkSession();

    // Listen for auth changes (handles redirect from social login)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await handleSocialLoginSuccess(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSocialLoginSuccess = async (user: any) => {
    try {
      // Extract user information from social login
      const userData = {
        employeeId: user.user_metadata?.preferred_username || user.email?.split('@')[0] || user.id.substring(0, 8),
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'Social User',
        avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        supabaseUserId: user.id
      };

      // Create or update user in backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${functionsBase(projectId)}/users`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const { user: backendUser } = await response.json();
        onUserLogin({
          ...backendUser,
          notifications: backendUser.notifications || []
        });
        toast.success('Signed in successfully!');
      } else {
        // If user creation fails, still allow login with basic data
        onUserLogin({
          employeeId: userData.employeeId,
          email: userData.email,
          name: userData.name,
          notifications: []
        });
        toast.success('Signed in successfully!');
      }
    } catch (error: any) {
      console.error('Social login error:', error);
      toast.error('Failed to complete social login');
    }
  };

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
    if (!/\d/.test(password)) errors.push('One number');
    if (!/[!@#$%^&*]/.test(password)) errors.push('One special character (!@#$%^&*)');
    return errors;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAdminInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdminFormData({
      ...adminFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.employeeId || !formData.email || !formData.password) {
        toast.error('All fields are required');
        return;
      }

      // Validate password
      const passwordErrors = validatePassword(formData.password);
      if (passwordErrors.length > 0) {
        toast.error(`Password must have: ${passwordErrors.join(', ')}`);
        return;
      }

      // Validate password confirmation
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      // Validate employee email format
      if (!formData.email.includes('@')) {
        toast.error('Please enter a valid email address');
        return;
      }

      // Create user in backend (which will also create Supabase auth user)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const userResponse = await fetch(
        `${functionsBase(projectId)}/signup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            employeeId: formData.employeeId,
            email: formData.email,
            name: formData.name,
            password: formData.password
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        toast.error(errorData.error || 'Failed to create user profile');
        return;
      }

      const userData = await userResponse.json();
      onUserLogin(userData.user);

      toast.success('Account created successfully!');
    } catch (error: any) {
      console.error('Sign up error:', error);
      if (error.name === 'AbortError') {
        toast.error('Request timeout. Please check your connection and try again.');
      } else if (error.message?.includes('Failed to fetch')) {
        toast.error('Unable to connect to server. Please check your connection and try again.');
      } else {
        toast.error(error.message || 'Failed to create account');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google') => {
    setSocialLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        throw error;
      }

      // The actual login handling will be done in the auth state change listener
    } catch (error: any) {
      console.error(`${provider} login error:`, error);
      toast.error(`Failed to sign in with ${provider}. Please try again.`);
      setSocialLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.email || !formData.password) {
        toast.error('Email/Employee ID and password are required');
        return;
      }

      // Check if it's an email or employee ID
      let email = formData.email;
      let employeeId = formData.email;

      if (formData.email.includes('@')) {
        // It's an email
        employeeId = formData.email.split('@')[0];
      } else {
        // It's an employee ID, need to get email from backend first
        try {
          const response = await fetch(
            `${functionsBase(projectId)}/users/${formData.email}`,
            {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (response.ok) {
            const userData = await response.json();
            email = userData.email;
            employeeId = userData.employeeId;
          } else {
            toast.error('Employee ID not found');
            return;
          }
        } catch (fetchError) {
          toast.error('Failed to find user with this Employee ID');
          return;
        }
      }

      // Sign in with Supabase Auth using email
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: formData.password,
      });

      if (error) {
        console.error('Supabase sign in error:', error);
        toast.error('Invalid credentials');
        return;
      }

      if (data.user) {
        // Get user profile from backend
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
          `${functionsBase(projectId)}/users/${employeeId}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const userData = await response.json();
          onUserLogin(userData);
          toast.success('Signed in successfully!');
        } else {
          // For social login, user should already exist in Supabase Auth
          // If profile fetch fails, just use the auth user data directly
          const userData = {
            employeeId: data.user.user_metadata?.employeeId || data.user.email?.split('@')[0] || data.user.id.slice(0, 8),
            email: data.user.email || email,
            name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || 'User',
            avatar: data.user.user_metadata?.avatar || null,
            notifications: data.user.user_metadata?.notifications || [],
            supabaseUserId: data.user.id
          };

          onUserLogin(userData);
          toast.success('Signed in successfully!');
        }
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      if (error.name === 'AbortError') {
        toast.error('Request timeout. Please check your connection and try again.');
      } else if (error.message?.includes('Failed to fetch')) {
        toast.error('Unable to connect to server. Please check your connection and try again.');
      } else {
        toast.error('Failed to sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!adminFormData.username || !adminFormData.password) {
        toast.error('Username and password are required');
        return;
      }

      // Check admin credentials
      if (adminFormData.username === 'admin' && adminFormData.password === 'egainternaltool2025') {
        onAdminLogin({ username: adminFormData.username, isAdmin: true });
        toast.success('Admin signed in successfully!');
      } else {
        toast.error('Invalid admin credentials');
      }
    } catch (error: any) {
      console.error('Admin sign in error:', error);
      toast.error('Failed to sign in as admin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Industrial Device Manager</CardTitle>
          <CardDescription>
            Secure access for industrial device management and auditing
          </CardDescription>
        </CardHeader>

        <CardContent>
          {serverConnected === false && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                ⚠️ Server connection failed. Please check your internet connection and try again.
              </p>
            </div>
          )}

          {serverConnected === true && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">
                ✅ Server connection successful
              </p>
            </div>
          )}

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <div className="space-y-4">
                {/* Social Login Buttons */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full relative"
                    disabled={socialLoading}
                    onClick={() => handleSocialLogin('google')}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {socialLoading ? 'Signing in...' : 'Continue with Google'}
                  </Button>
                </div>

                <div className="relative">
                  <Separator />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-white px-2 text-sm text-gray-500">or</span>
                  </div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Employee Email or ID</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      placeholder="employee@company.com or EMP001"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                        onClick={() => setShowPassword(p => !p)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || socialLoading}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <div className="space-y-4">
                {/* Social Login Buttons */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full relative"
                    disabled={socialLoading}
                    onClick={() => handleSocialLogin('google')}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {socialLoading ? 'Signing up...' : 'Sign up with Google'}
                  </Button>

                  {/* Facebook removed - Google only */}
                </div>

                <div className="relative">
                  <Separator />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-white px-2 text-sm text-gray-500">or</span>
                  </div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      name="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-employeeid">Employee ID</Label>
                    <Input
                      id="signup-employeeid"
                      name="employeeId"
                      placeholder="EMP001"
                      value={formData.employeeId}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Employee Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="employee@company.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                        onClick={() => setShowPassword(p => !p)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">
                      Must contain 8+ characters, uppercase, lowercase, number, and special character
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                        onClick={() => setShowConfirmPassword(p => !p)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || socialLoading}
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="admin">
              <div className="space-y-4">
                <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-600">
                    🔐 Admin access for system management
                  </p>
                </div>

                <form onSubmit={handleAdminSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-username">Username</Label>
                    <Input
                      id="admin-username"
                      name="username"
                      placeholder="Enter admin username"
                      value={adminFormData.username}
                      onChange={handleAdminInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input
                      id="admin-password"
                      name="password"
                      type="password"
                      placeholder="Enter admin password"
                      value={adminFormData.password}
                      onChange={handleAdminInputChange}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing In...' : 'Admin Sign In'}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}