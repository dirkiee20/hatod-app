import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter
const createTransporter = () => {
  // Use environment variables for email configuration
  // For Gmail: use app password, not regular password
  // For other services: adjust accordingly
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  return transporter;
};

/**
 * Send email verification email
 * @param {string} to - Recipient email address
 * @param {string} name - Recipient name
 * @param {string} verificationToken - Verification token
 * @returns {Promise<void>}
 */
export const sendVerificationEmail = async (to, name, verificationToken) => {
  try {
    const transporter = createTransporter();
    
    // Get base URL from environment or use default
    // For mobile apps, use the Railway backend URL (where verify-email.html is hosted)
    const baseUrl = process.env.APP_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:4000';
    const verificationUrl = `${baseUrl}/verify-email.html?token=${verificationToken}`;

    const mailOptions = {
      from: `"HATOD" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Verify Your Email Address - HATOD',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
                <h1 style="color: #2563eb; margin: 0;">HATOD</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 20px; background-color: #f4f4f4;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 40px;">
                  <tr>
                    <td>
                      <h2 style="color: #1f2937; margin-top: 0;">Hello ${name}!</h2>
                      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                        Thank you for signing up for HATOD. Please verify your email address by clicking the button below:
                      </p>
                      <table role="presentation" style="margin: 30px 0;">
                        <tr>
                          <td style="text-align: center;">
                            <a href="${verificationUrl}" 
                               style="display: inline-block; padding: 12px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
                              Verify Email Address
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                        Or copy and paste this link into your browser:
                      </p>
                      <p style="color: #2563eb; font-size: 14px; word-break: break-all;">
                        ${verificationUrl}
                      </p>
                      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                        This link will expire in 24 hours. If you didn't create an account with HATOD, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px; text-align: center; background-color: #ffffff;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} HATOD. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
        Hello ${name}!
        
        Thank you for signing up for HATOD. Please verify your email address by visiting:
        
        ${verificationUrl}
        
        This link will expire in 24 hours. If you didn't create an account with HATOD, you can safely ignore this email.
        
        © ${new Date().getFullYear()} HATOD. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${to}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    // Don't throw error - we don't want to block registration if email fails
    // Log it for monitoring
    throw new Error('Failed to send verification email');
  }
};

/**
 * Test email configuration
 * @returns {Promise<boolean>}
 */
export const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email server is ready');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};

