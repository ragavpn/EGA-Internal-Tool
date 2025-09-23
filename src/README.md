# Industrial Device Management System

A mobile-responsive web application for managing device maintenance records and auditor compliance.

## Authentication

This application uses Supabase authentication with support for:

- **Email/Password Sign Up & Sign In**: Traditional authentication with password validation
- **Google OAuth**: Social login with Google
 - **Google OAuth**: Social login with Google

### Important Setup Required for Social Login

**IMPORTANT**: To enable Google authentication, you must complete the setup at:
- **Google**: https://supabase.com/docs/guides/auth/social-login/auth-google

Without completing this setup in your Supabase dashboard, you will receive a "provider is not enabled" error when users try to sign in with Google.

## Features

- Device registration and management
- Location-based filtering
- Weekly maintenance planning
- Device checking workflows
- Delayed device tracking
- PDF document signing workflows
- User notifications
- Annual report generation with Excel export
- Responsive design for desktop, tablet, and mobile

## Authentication Flow

1. **Sign Up**: Users can create accounts with email/password or via social login
2. **Sign In**: Existing users can authenticate using any enabled method
3. **Session Persistence**: Users remain logged in across browser sessions
4. **Profile Management**: User profiles are automatically created and managed

The authentication system automatically handles:
- New user registration via social login
- Existing user sign-in
- Session management
- User profile creation and updates