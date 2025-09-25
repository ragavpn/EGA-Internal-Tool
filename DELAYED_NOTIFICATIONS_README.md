# EGA Internal Tool - Automated Delayed Device Notifications

## 🚀 Automated Email System with Vercel Cron + Resend API

This system automatically sends professional HTML emails every Monday at 7:00 AM GST to selected employees when devices have overdue safety checks.

## 📧 Email Features

- **Professional HTML Design**: Styled email with company branding
- **Device Details**: Lists device name, ID, location, check type, and days overdue
- **Smart Content**: Only sends emails when delayed devices exist
- **Tracking**: Uses Resend API tags for analytics
- **Responsive**: Works on all email clients and devices

## ⚙️ Setup Instructions

### 1. Environment Variables

Add these to your Vercel deployment environment variables:

```bash
VITE_SUPABASE_URL=https://ksdrpfxuwavfwnccmrwr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
EDGE_FN_NAME=make-server-354d5d14
RESEND_API_KEY=re_your_resend_api_key
CRON_SECRET=your-secure-cron-secret-key-change-this
```

### 2. Vercel Cron Configuration

The `vercel.json` file is already configured with:

```json
{
  "crons": [
    {
      "path": "/api/cron/delayed-notifications",
      "schedule": "0 3 * * 1"
    }
  ]
}
```

**Schedule Explanation:**
- `0 3 * * 1` = Monday at 3:00 AM UTC
- 3:00 AM UTC = 7:00 AM GST (Gulf Standard Time, GMT+4)

### 3. Resend API Setup

1. Go to [Resend Dashboard](https://resend.com/dashboard)
2. Create a new API key
3. Configure your domain (optional but recommended)
4. Update the "from" email in the code if needed

### 4. Deployment

Deploy to Vercel:

```bash
npm run build
vercel --prod
```

### 5. Testing

**Manual Test (Development):**
```bash
curl http://localhost:3000/api/cron/test-delayed-notifications
```

**Manual Test (Production):**
```bash
curl https://your-app.vercel.app/api/cron/test-delayed-notifications
```

## 🔄 How It Works

1. **Vercel Cron Trigger**: Every Monday at 7:00 AM GST
2. **Employee Check**: Retrieves selected employees from notification settings
3. **Device Check**: Gets all delayed device checks
4. **Smart Filter**: Only proceeds if both employees and delayed devices exist
5. **Email Generation**: Creates professional HTML emails with device details
6. **Resend API**: Sends emails using Resend service
7. **Logging**: Records all email activities for tracking

## 📊 API Endpoints

### Vercel Cron Endpoints
- `POST /api/cron/delayed-notifications` - Weekly automated notifications (called by Vercel)
- `GET /api/cron/test-delayed-notifications` - Manual test trigger

### Supabase Edge Function Endpoints
- `POST /vercel-cron-delayed-notifications` - Core email processing logic
- `GET /delayed-device-notifications` - Get notification settings
- `POST /delayed-device-notifications` - Save notification settings
- `GET /email-notifications` - Get email history

## 🎨 Email Template Features

- **Responsive Design**: Works on desktop and mobile
- **Professional Styling**: Clean, corporate look
- **Warning Colors**: Red highlights for urgent items
- **Device Cards**: Each delayed device in its own styled section
- **Call-to-Action**: Direct link to the EGA Internal Tool
- **Timestamp**: Shows when the email was sent
- **Automated Footer**: Indicates it's an automated system

## 🔒 Security Features

1. **Cron Secret**: Vercel cron jobs use a secret key
2. **Service Role**: Supabase calls use service role authentication
3. **Environment Variables**: All secrets stored securely
4. **Origin Verification**: Only authorized calls accepted

## 📈 Monitoring & Analytics

### Resend Analytics
- Track email opens, clicks, and bounces
- View delivery statistics
- Monitor API usage

### Application Logs
- Vercel function logs show execution details
- Supabase edge function logs track email processing
- Error handling with detailed logging

### Email History
Access `/email-notifications` endpoint to see:
- All sent emails
- Recipients and timestamps
- Success/failure status
- Resend API tracking IDs

## 🚨 Troubleshooting

### Common Issues

1. **No Emails Sent**
   - Check if employees are selected in notification settings
   - Verify delayed devices exist
   - Check Resend API key validity

2. **Cron Not Triggering**
   - Verify Vercel deployment is successful
   - Check cron configuration in `vercel.json`
   - Ensure environment variables are set

3. **Email Delivery Issues**
   - Check Resend dashboard for delivery status
   - Verify sender email domain
   - Check spam folders

### Debug Steps

1. **Test Manual Trigger**: Use `/api/cron/test-delayed-notifications`
2. **Check Logs**: View Vercel function logs
3. **Resend Dashboard**: Monitor API calls and delivery
4. **Email History**: Check stored notification records

## 📅 Schedule Details

- **Frequency**: Weekly (every Monday)
- **Time**: 7:00 AM Gulf Standard Time (GMT+4)
- **UTC Time**: 3:00 AM UTC
- **Condition**: Only sends if delayed devices exist
- **Recipients**: Only selected employees receive emails

## 🔄 Email Content Structure

```
Subject: EGA Weekly Safety Alert: X Delayed Device Check(s)

Content:
- Personalized greeting
- Warning about delayed checks
- Detailed device list with:
  - Device name and ID
  - Location
  - Check type
  - Days overdue
- Call to action
- Automated system footer
- Timestamp
```

## 📝 Notes

- Emails are only sent when there are actual delayed devices
- Empty emails are never sent
- All email activities are logged for audit purposes
- The system is fully automated and requires no manual intervention
- Email design is mobile-responsive and professional