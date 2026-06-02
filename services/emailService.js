import nodemailer from 'nodemailer';

// Create reusable transporter using environment variables for security
const createTransporter = () => {
  const user = process.env.EMAIL_USER || 'hotelmanagement546@gmail.com';
  const pass = process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('Email service is not configured. Set EMAIL_USER and EMAIL_PASSWORD or GMAIL_APP_PASSWORD in the backend environment.');
  }

  return nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Generate HTML email template for smart lock PIN code
 */
const generateSmartLockEmailTemplate = (data) => {
  const {
    guestName = 'Guest',
    hotelName,
    roomNumber,
    accessToken,
    backupPin,
    qrCodeUrl,
    checkInDate,
    checkOutDate,
    unlockPageUrl
  } = data;

  const checkInFormatted = new Date(checkInDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const checkOutFormatted = new Date(checkOutDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Smart Room Unlock Access</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        }
        .header p {
          margin: 10px 0 0 0;
          opacity: 0.9;
          font-size: 14px;
        }
        .content {
          padding: 30px 20px;
        }
        .booking-details {
          background: #f9fafb;
          border-left: 4px solid #667eea;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #666;
          font-size: 13px;
        }
        .detail-value {
          font-weight: 500;
          color: #333;
        }
        .unlock-methods {
          margin: 30px 0;
        }
        .method {
          background: #f0f4ff;
          border: 2px solid #e0e7ff;
          border-radius: 8px;
          padding: 20px;
          margin: 15px 0;
        }
        .method-title {
          font-weight: 600;
          color: #667eea;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .qr-code {
          text-align: center;
          margin: 15px 0;
        }
        .qr-code img {
          max-width: 200px;
          height: auto;
          border-radius: 8px;
        }
        .token-box {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 12px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          word-break: break-all;
          color: #666;
          margin: 10px 0;
        }
        .pin-display {
          background: #fff8e1;
          border: 2px solid #ffd54f;
          border-radius: 8px;
          padding: 30px;
          text-align: center;
          margin: 20px 0;
        }
        .pin-label {
          font-size: 12px;
          color: #f57c00;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .pin-code {
          font-size: 48px;
          font-weight: bold;
          color: #f57c00;
          letter-spacing: 12px;
          font-family: 'Courier New', monospace;
        }
        .button {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 15px 0;
          text-align: center;
        }
        .button:hover {
          background: #5568d3;
        }
        .security-features {
          background: #e8f5e9;
          border-left: 4px solid #4caf50;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .security-features h3 {
          margin: 0 0 10px 0;
          color: #2e7d32;
          font-size: 14px;
        }
        .security-features ul {
          margin: 0;
          padding-left: 20px;
        }
        .security-features li {
          margin: 5px 0;
          color: #2e7d32;
          font-size: 13px;
        }
        .expiry-warning {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          color: #856404;
          font-size: 13px;
        }
        .footer {
          background: #f9fafb;
          padding: 20px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #666;
        }
        @media (max-width: 600px) {
          .container {
            margin: 0;
            border-radius: 0;
          }
          .pin-code {
            font-size: 36px;
            letter-spacing: 8px;
          }
          .detail-row {
            flex-direction: column;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>🔑 Smart Room Unlock</h1>
          <p>Your secure access codes for hassle-free check-in</p>
        </div>

        <!-- Content -->
        <div class="content">
          <!-- Welcome -->
          <p>Hi ${guestName},</p>
          <p>We're excited to welcome you to <strong>${hotelName}</strong>! We've generated secure access codes for your room to make your check-in effortless and convenient.</p>

          <!-- Booking Details -->
          <div class="booking-details">
            <div class="detail-row">
              <span class="detail-label">🏨 Room</span>
              <span class="detail-value">${roomNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📅 Check-In</span>
              <span class="detail-value">${checkInFormatted}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📅 Check-Out</span>
              <span class="detail-value">${checkOutFormatted}</span>
            </div>
          </div>

          <!-- Unlock Methods -->
          <h2 style="color: #333; margin: 30px 0 15px 0;">How to Unlock Your Room</h2>
          
          <div class="unlock-methods">
            <!-- Method 1: QR Code -->
            <div class="method">
              <div class="method-title">📱 Method 1: Scan QR Code (Recommended)</div>
              <p>The easiest way! Scan this QR code with your smartphone to unlock your room instantly.</p>
              ${qrCodeUrl ? `
                <div class="qr-code">
                  <img src="${qrCodeUrl}" alt="Room unlock QR code" />
                </div>
                <p style="text-align: center; margin: 10px 0;">Scan to unlock</p>
              ` : ''}
            </div>

            <!-- Method 2: Access Token -->
            <div class="method">
              <div class="method-title">🔐 Method 2: Use Access Token</div>
              <p>If QR code scanning doesn't work, copy and paste this token on our unlock page:</p>
              <div class="token-box">${accessToken}</div>
              <p style="text-align: center;">
                <a href="${unlockPageUrl}" class="button">Open Unlock Page</a>
              </p>
            </div>

            <!-- Method 3: Backup PIN -->
            <div class="method">
              <div class="method-title">🔑 Method 3: Backup PIN Code (Emergency)</div>
              <p>If digital unlock isn't available, use this PIN code on the smart lock keypad:</p>
              <div class="pin-display">
                <div class="pin-label">Your PIN Code</div>
                <div class="pin-code">${backupPin}</div>
              </div>
              <p style="text-align: center; font-size: 12px; color: #f57c00;">
                <strong>⚠️ Keep this PIN safe and don't share it with anyone except authorized guests.</strong>
              </p>
            </div>
          </div>

          <!-- Security Features -->
          <div class="security-features">
            <h3>🔒 Security Features</h3>
            <ul>
              <li>✓ Unique access codes for your booking only</li>
              <li>✓ Automatic expiration at check-out time</li>
              <li>✓ Multiple backup methods for reliability</li>
              <li>✓ All access attempts logged for your safety</li>
              <li>✓ No need to carry a physical key card</li>
              <li>✓ Works seamlessly with our smart lock system</li>
            </ul>
          </div>

          <!-- Expiry Notice -->
          <div class="expiry-warning">
            <strong>⏰ Access Valid Period:</strong> Your access codes are valid from your check-in time (${checkInFormatted}) and will automatically expire at your check-out time (${checkOutFormatted}).
          </div>

          <!-- Support -->
          <p style="margin-top: 30px; font-size: 14px;">
            <strong>Need Help?</strong> If you have any issues unlocking your room, please contact our front desk immediately. We're here 24/7 to assist you.
          </p>

          <p style="margin-top: 20px;">
            Looking forward to welcoming you!<br/>
            <strong>- The ${hotelName} Team</strong>
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>For support, contact: support@${hotelName.toLowerCase().replace(/\s+/g, '')}.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Send smart lock PIN code email to guest
 */
export const sendSmartLockAccessEmail = async (email, data) => {
  try {
    const transporter = createTransporter();

    const htmlContent = generateSmartLockEmailTemplate(data);

    const mailOptions = {
      from: process.env.EMAIL_USER || 'hotelmanagement546@gmail.com',
      to: email,
      subject: `🔑 Smart Room Unlock Access - ${data.hotelName}`,
      html: htmlContent,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Smart lock access email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send smart lock access email:', error);
    throw new Error(`Email send failed: ${error.message}`);
  }
};

/**
 * Send booking confirmation email (original)
 */
export const sendEmailBooking = async (email, booking) => {
  try {
    const transporter = createTransporter();

    const {
      bookingNumber,
      hotelName,
      roomType,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      totalPrice,
      currency = '₦',
      bookingStatus = 'confirmed'
    } = booking;

    const isCancelled = bookingStatus?.toLowerCase().includes('cancelled');
    const isConfirmed = bookingStatus?.toLowerCase().includes('confirmed');

    const headerColor = isCancelled ? '#dc2626' : '#1e40af';
    const titleText = isCancelled ? 'Booking Cancelled ❌' : 'Booking Confirmation 🏨';
    const subjectText = isCancelled
      ? `❌ Booking Cancelled - ${hotelName}`
      : `🏨 Booking Confirmation - ${hotelName}`;

    let htmlMessage = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <div style="margin-top: 30px; padding: 15px; background-color: #f9fafb; border-left: 4px solid ${headerColor};">
          <h3 style="margin: 0; color: ${headerColor};">${titleText}</h3>
          ${
            isCancelled
              ? `
              <p style="margin: 10px 0;">We're sorry to inform you that your booking at <strong>${hotelName}</strong> has been cancelled.</p>
              <p style="margin: 10px 0;">If this was a mistake, please contact us to rebook your stay. We hope to welcome you another time.</p>
            `
              : `
              <p style="margin: 10px 0;">We're thrilled to have you stay with us at <strong>${hotelName}</strong>!</p>
              <p style="margin: 10px 0;">Below are the details of your confirmed reservation:</p>
            `
          }
        </div>
      `;

    htmlMessage += `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr style="background-color: #f3f4f6;">
          <th style="text-align: left; padding: 10px; border-bottom: 1px solid #ddd;">Detail</th>
          <th style="text-align: left; padding: 10px; border-bottom: 1px solid #ddd;">Information</th>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">Booking Number</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${bookingNumber}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">Hotel</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${hotelName}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">Room Type</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${roomType}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">Check-in</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(checkInDate).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">Check-out</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(checkOutDate).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">Guests</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${numberOfGuests}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">Total Price</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${currency} ${totalPrice}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">Status</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${bookingStatus}</td>
        </tr>
      </table>
    `;

    htmlMessage += `
      <p style="margin-top: 20px;">
        ${isCancelled ? 'We hope to serve you in the future.' : 'We look forward to making your stay comfortable and enjoyable.'}
      </p>
      <p style="margin-top: 20px;"><strong>- The Hotel Team</strong></p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'hotelmanagement546@gmail.com',
      to: email,
      subject: subjectText,
      html: htmlMessage,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Booking email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send booking email:', error);
    throw new Error(`Email send failed: ${error.message}`);
  }
};

const formatReportPeriodLabel = (report) => {
  if (!report) return 'Income Report';

  const startDate = new Date(report.startDate);
  if (report.period === 'monthly') {
    return startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  return startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2
}).format(amount || 0);

const generateIncomeReportEmailTemplate = ({ hotelName, report }) => {
  const entries = Array.isArray(report?.entries) ? report.entries : [];
  const highlightedEntries = entries.slice(0, 10);

  const entryRows = highlightedEntries.length > 0
    ? highlightedEntries.map((entry) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${new Date(entry.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${entry.category || '-'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${entry.label || '-'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; white-space: nowrap;">${formatCurrency(entry.amount || 0)}</td>
      </tr>
    `).join('')
    : `
      <tr>
        <td colspan="4" style="padding: 16px 12px; color: #64748b; text-align: center;">No income entries found for this period.</td>
      </tr>
    `;

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Hotel Income Report</title>
      </head>
      <body style="margin: 0; padding: 24px; background: #f8fafc; font-family: Arial, sans-serif; color: #0f172a;">
        <div style="max-width: 760px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden;">
          <div style="padding: 28px 32px; background: linear-gradient(135deg, #0f172a, #1d4ed8); color: #ffffff;">
            <div style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.8;">Income Report</div>
            <h1 style="margin: 10px 0 6px; font-size: 28px;">${hotelName || 'Hotel'} Revenue Summary</h1>
            <p style="margin: 0; font-size: 14px; opacity: 0.88;">Reporting period: ${formatReportPeriodLabel(report)}</p>
          </div>

          <div style="padding: 28px 32px;">
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px;">
              <div style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 14px; background: #f8fafc;">
                <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Total Income</div>
                <div style="margin-top: 8px; font-size: 24px; font-weight: 700;">${formatCurrency(report?.summary?.totalIncome || 0)}</div>
              </div>
              <div style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 14px; background: #f8fafc;">
                <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Generated</div>
                <div style="margin-top: 8px; font-size: 16px; font-weight: 700;">${new Date(report?.generatedAt || Date.now()).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;">
                <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Room Bookings</div>
                <div style="margin-top: 8px; font-size: 20px; font-weight: 700;">${formatCurrency(report?.summary?.roomBookings || 0)}</div>
              </div>
              <div style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;">
                <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Food and Drinks</div>
                <div style="margin-top: 8px; font-size: 20px; font-weight: 700;">${formatCurrency(report?.summary?.foodAndDrinks || 0)}</div>
              </div>
            </div>

            <div style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff; margin-bottom: 24px;">
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Inhouse Services</div>
              <div style="margin-top: 8px; font-size: 20px; font-weight: 700;">${formatCurrency(report?.summary?.inhouseServices || 0)}</div>
            </div>

            <h2 style="margin: 0 0 12px; font-size: 18px;">Recent entries</h2>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden;">
              <thead>
                <tr style="background: #eff6ff;">
                  <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569;">Date</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569;">Category</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569;">Description</th>
                  <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569;">Amount</th>
                </tr>
              </thead>
              <tbody>${entryRows}</tbody>
            </table>

            ${entries.length > 10 ? `<p style="margin: 14px 0 0; font-size: 13px; color: #64748b;">Showing 10 of ${entries.length} entries from the report preview.</p>` : ''}
          </div>
        </div>
      </body>
    </html>
  `;
};

export const sendIncomeReportEmail = async (email, payload) => {
  try {
    const transporter = createTransporter();
    const subject = `Hotel Income Report - ${formatReportPeriodLabel(payload.report)}`;
    const html = generateIncomeReportEmailTemplate(payload);

    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER || 'hotelmanagement546@gmail.com',
      to: email,
      subject,
      html,
    });

    console.log('✅ Income report email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send income report email:', error);
    throw new Error(`Email send failed: ${error.message}`);
  }
};

const generateStayReviewReminderEmailTemplate = ({
  guestName = 'Guest',
  hotelName = 'Hotel',
  roomLabel = 'your room',
  checkOutDate,
  reviewUrl = 'https://www.smarttrackbookings.live/customer-dashboard'
}) => {
  const formattedCheckOut = checkOutDate
    ? new Date(checkOutDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'today';

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>How was your stay at ${hotelName}?</title>
      </head>
      <body style="margin: 0; padding: 24px; background: #f8fafc; font-family: Arial, sans-serif; color: #0f172a;">
        <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden;">
          <div style="padding: 28px 32px; background: linear-gradient(135deg, #0f172a, #2563eb); color: #ffffff;">
            <div style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.82;">Stay Feedback</div>
            <h1 style="margin: 10px 0 6px; font-size: 28px;">How was your stay?</h1>
            <p style="margin: 0; font-size: 14px; opacity: 0.88;">${hotelName}</p>
          </div>

          <div style="padding: 28px 32px;">
            <p style="margin-top: 0;">Hi ${guestName},</p>
            <p>Thanks for staying with <strong>${hotelName}</strong>. Your stay for <strong>${roomLabel}</strong> checked out on <strong>${formattedCheckOut}</strong>.</p>
            <p>If you have a minute, please leave a rating and short review. Your feedback helps the hotel improve and helps future guests book with confidence.</p>

            <div style="margin: 24px 0; padding: 18px; border: 1px solid #dbeafe; border-radius: 14px; background: #eff6ff;">
              <div style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.08em;">Where to review</div>
              <div style="margin-top: 8px; font-size: 16px; font-weight: 700;">Customer Dashboard → My Stays → Review Stay</div>
            </div>

            <div style="margin-top: 24px;">
              <a
                href="${reviewUrl}"
                style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 700;"
              >
                Open Dashboard
              </a>
              <p style="margin: 14px 0 0; font-size: 13px; color: #475569;">
                Direct link:
                <a href="${reviewUrl}" style="color: #2563eb; word-break: break-all;">${reviewUrl}</a>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const sendStayReviewReminderEmail = async (email, payload) => {
  try {
    const transporter = createTransporter();
    const html = generateStayReviewReminderEmailTemplate(payload);

    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER || 'hotelmanagement546@gmail.com',
      to: email,
      subject: `How was your stay at ${payload.hotelName || 'our hotel'}?`,
      html,
    });

    console.log('✅ Stay review reminder email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send stay review reminder email:', error);
    throw new Error(`Email send failed: ${error.message}`);
  }
};

const generateStaffWelcomeEmailTemplate = ({
  staffName = 'Team Member',
  hotelName = 'Hotel',
  position = 'Staff',
  email,
  temporaryPassword
}) => {
  const loginUrl = 'https://www.smarttrackbookings.live/staff-login';

  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Welcome to ${hotelName}</title>
    </head>
    <body style="margin: 0; padding: 24px; background: #f8fafc; font-family: Arial, sans-serif; color: #0f172a;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden;">
        <div style="padding: 28px 32px; background: linear-gradient(135deg, #0f172a, #1d4ed8); color: #ffffff;">
          <div style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.82;">Staff Access</div>
          <h1 style="margin: 10px 0 6px; font-size: 28px;">Your staff account is ready</h1>
          <p style="margin: 0; font-size: 14px; opacity: 0.88;">${hotelName}</p>
        </div>

        <div style="padding: 28px 32px;">
          <p style="margin-top: 0;">Hi ${staffName},</p>
          <p>You have been added as <strong>${position}</strong> at <strong>${hotelName}</strong>. Use the credentials below to sign in to the staff dashboard.</p>

          <div style="margin: 24px 0; padding: 20px; border: 1px solid #dbeafe; border-radius: 14px; background: #eff6ff;">
            <div style="margin-bottom: 12px;">
              <div style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.08em;">Login email</div>
              <div style="margin-top: 6px; font-size: 16px; font-weight: 700;">${email}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.08em;">Temporary password</div>
              <div style="margin-top: 6px; font-size: 18px; font-weight: 700; letter-spacing: 0.06em;">${temporaryPassword}</div>
            </div>
          </div>

          <div style="padding: 16px 18px; border-left: 4px solid #f59e0b; background: #fffbeb; border-radius: 8px; color: #92400e; font-size: 14px;">
            You will be asked to change this password after your first login.
          </div>

          <div style="margin: 24px 0 0;">
            <a
              href="${loginUrl}"
              style="display: inline-block; background: #1d4ed8; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 700;"
            >
              Open Staff Login
            </a>
            <p style="margin: 14px 0 0; font-size: 13px; color: #475569;">
              Direct login link:
              <a href="${loginUrl}" style="color: #1d4ed8; word-break: break-all;">${loginUrl}</a>
            </p>
          </div>

          <p style="margin: 24px 0 0;">If you were not expecting this account, contact your hotel administrator.</p>
        </div>
      </div>
    </body>
  </html>
`;
};

export const sendStaffWelcomeEmail = async (email, payload) => {
  try {
    const transporter = createTransporter();
    const html = generateStaffWelcomeEmailTemplate(payload);

    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER || 'hotelmanagement546@gmail.com',
      to: email,
      subject: `Staff account created - ${payload.hotelName || 'Hotel'}`,
      html,
    });

    console.log('✅ Staff welcome email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send staff welcome email:', error);
    throw new Error(`Email send failed: ${error.message}`);
  }
};

const generateGuestWelcomeEmailTemplate = ({
  guestName = 'Guest',
  hotelName = 'Hotel',
}) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to ${hotelName}</title>
      </head>
      <body style="margin: 0; padding: 24px; background: #f8fafc; font-family: Arial, sans-serif; color: #0f172a;">
        <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden;">
          <div style="padding: 28px 32px; background: linear-gradient(135deg, #0f172a, #2563eb); color: #ffffff;">
            <div style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.82;">Welcome</div>
            <h1 style="margin: 10px 0 6px; font-size: 28px;">Welcome to ${hotelName}!</h1>
          </div>

          <div style="padding: 28px 32px;">
            <p style="margin-top: 0;">Hi ${guestName},</p>
            <p>Thank you for booking with us. Use your mobile phone to access hotel services, order food and drinks, and track your delivery in real time all from the comfort of your room.</p>
            <p>Enjoy your stay!</p>

            <div style="margin-top: 24px;">
              <a
                href="https://www.smarttrackbookings.live/customer-dashboard"
                style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 700;"
              >
                Access Guest Services
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const sendGuestWelcomeEmail = async (email, payload) => {
  try {
    const transporter = createTransporter();
    const html = generateGuestWelcomeEmailTemplate(payload);

    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER || 'hotelmanagement546@gmail.com',
      to: email,
      subject: `Welcome to ${payload.hotelName || 'our hotel'}!`,
      html,
    });

    console.log('✅ Guest welcome email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send guest welcome email:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendSmartLockAccessEmail,
  sendEmailBooking,
  sendIncomeReportEmail,
  sendStayReviewReminderEmail,
  sendStaffWelcomeEmail,
  sendGuestWelcomeEmail,
  createTransporter,
  generateSmartLockEmailTemplate
};
