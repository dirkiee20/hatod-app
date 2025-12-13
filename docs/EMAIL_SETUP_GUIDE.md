# Email Setup Guide for HATOD

This guide will help you set up SMTP email configuration for email verification.

## Option 1: Gmail (Recommended for Testing)

### Step 1: Enable 2-Step Verification
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **2-Step Verification**
3. Follow the prompts to enable it (you'll need your phone)

### Step 2: Generate App Password
1. Go back to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **App passwords**
3. Select app: **Mail**
4. Select device: **Other (Custom name)** → Type "HATOD API"
5. Click **Generate**
6. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

### Step 3: Add to `.env` file
Add these to your `api/.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false   
SMTP_USER=dirkpepitolabiaga20@gmail.com
SMTP_PASSWORD=gmmpclxcxsgvdfat
APP_BASE_URL=https://hatod-app-production.up.railway.app/
```

**Important:** 
- Use the 16-character App Password (not your regular Gmail password)
- Remove spaces from the password when pasting: `abcdefghijklmnop`

---

## Option 2: Outlook/Hotmail

### Step 1: Enable App Password
1. Go to [Microsoft Account Security](https://account.microsoft.com/security)
2. Click **Advanced security options**
3. Under "App passwords", click **Create a new app password**
4. Name it "HATOD API"
5. Copy the generated password

### Step 2: Add to `.env` file
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-app-password
APP_BASE_URL=http://localhost:3000
```

---

## Option 3: SendGrid (Recommended for Production)

### Step 1: Create SendGrid Account
1. Go to [SendGrid](https://sendgrid.com/)
2. Sign up for a free account (100 emails/day free)
3. Verify your email address

### Step 2: Create API Key
1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it "HATOD Email Verification"
4. Select **Full Access** or **Restricted Access** (Mail Send permission)
5. Copy the API key (you'll only see it once!)

### Step 3: Add to `.env` file
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key-here
APP_BASE_URL=http://localhost:3000
```

**Note:** For SendGrid, `SMTP_USER` is always `apikey`, and `SMTP_PASSWORD` is your API key.

---

## Option 4: Mailgun (Good for Production)

### Step 1: Create Mailgun Account
1. Go to [Mailgun](https://www.mailgun.com/)
2. Sign up (free tier: 5,000 emails/month)
3. Verify your account

### Step 2: Get SMTP Credentials
1. Go to **Sending** → **Domain Settings**
2. Click on your domain
3. Go to **SMTP credentials** tab
4. Copy your SMTP username and password

### Step 3: Add to `.env` file
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-smtp-username
SMTP_PASSWORD=your-mailgun-smtp-password
APP_BASE_URL=http://localhost:3000
```

---

## Option 5: AWS SES (For High Volume)

### Step 1: Set up AWS SES
1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Verify your email address or domain
3. Move out of sandbox mode (request production access)

### Step 2: Create SMTP Credentials
1. Go to **SMTP Settings**
2. Click **Create SMTP Credentials**
3. Download the credentials file

### Step 3: Add to `.env` file
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-aws-ses-smtp-username
SMTP_PASSWORD=your-aws-ses-smtp-password
APP_BASE_URL=http://localhost:3000
```

**Note:** Replace `us-east-1` with your AWS region.

---

## Setting APP_BASE_URL

The `APP_BASE_URL` is where users will be redirected when they click the verification link in their email.

### For Local Development:
```env
APP_BASE_URL=http://localhost:3000
```

### For Production (Railway):
```env
APP_BASE_URL=https://hatod-app-production.up.railway.app
```

### For Production (Custom Domain):
```env
APP_BASE_URL=https://yourdomain.com
```

---

## Testing Your Email Configuration

After setting up, test if emails are working:

1. Start your API server:
   ```bash
   cd api
   npm run dev
   ```

2. Register a new user account

3. Check the email inbox for the verification email

4. If you see errors in the console, check:
   - SMTP credentials are correct
   - App password is valid (for Gmail)
   - Firewall isn't blocking port 587
   - Email provider allows SMTP access

---

## Troubleshooting

### Gmail: "Invalid credentials"
- Make sure you're using an App Password, not your regular password
- Ensure 2-Step Verification is enabled
- Remove spaces from the App Password

### "Connection timeout"
- Check if port 587 is blocked by firewall
- Try port 465 with `SMTP_SECURE=true`
- Check if your network allows SMTP connections

### "Authentication failed"
- Double-check username and password
- For Gmail: Make sure it's an App Password
- For SendGrid: Make sure `SMTP_USER=apikey`

### Emails not received
- Check spam folder
- Verify sender email is correct
- Check email provider's sending limits
- Look at API server logs for errors

---

## Recommended Setup by Environment

### Development:
- **Gmail** (easiest to set up)
- Free, 500 emails/day limit

### Production (Low Volume):
- **SendGrid** (100 emails/day free)
- **Mailgun** (5,000 emails/month free)

### Production (High Volume):
- **AWS SES** (very cheap, $0.10 per 1,000 emails)
- **SendGrid** (paid plans)

---

## Security Notes

⚠️ **Never commit your `.env` file to Git!**
- It's already in `.gitignore`
- Keep your SMTP passwords secret
- Use different credentials for development and production
- Rotate passwords regularly

---

## Quick Reference

| Provider | SMTP Host | Port | Secure | User | Password |
|----------|-----------|------|--------|------|----------|
| Gmail | smtp.gmail.com | 587 | false | your-email@gmail.com | App Password |
| Outlook | smtp-mail.outlook.com | 587 | false | your-email@outlook.com | App Password |
| SendGrid | smtp.sendgrid.net | 587 | false | apikey | API Key |
| Mailgun | smtp.mailgun.org | 587 | false | SMTP Username | SMTP Password |
| AWS SES | email-smtp.region.amazonaws.com | 587 | false | SMTP Username | SMTP Password |

