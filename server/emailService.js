const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }
  
  initializeTransporter() {
    // Use environment variables or fallback to console logging
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER || 'test@example.com',
        pass: process.env.SMTP_PASS || 'test-password'
      }
    };
    
    // If no real SMTP credentials, use a test account
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('Using test email service - emails will be logged to console');
      this.transporter = {
        sendMail: (options) => {
          console.log('=== EMAIL SENT ===');
          console.log('To:', options.to);
          console.log('Subject:', options.subject);
          console.log('Body:', options.text);
          if (options.attachments) {
            console.log('Attachments:', options.attachments.length);
          }
          console.log('==================');
          return Promise.resolve({ messageId: 'test-message-id' });
        }
      };
    } else {
      this.transporter = nodemailer.createTransporter(smtpConfig);
    }
  }
  
  async sendBarrierReport(barrier) {
    const cityEmail = process.env.CITY_EMAIL || 'accessibility@halifax.ca';
    
    const severityEmoji = {
      low: '🟢',
      medium: '🟡', 
      high: '🔴'
    };
    
    const typeLabels = {
      steps: 'Steps/Stairs',
      construction: 'Construction',
      curb: 'Blocked Curb',
      icy: 'Icy Surface',
      other: 'Other'
    };
    
    const emailContent = {
      to: cityEmail,
      subject: `New Accessibility Barrier Reported - ${severityEmoji[barrier.severity]} ${typeLabels[barrier.type]}`,
      text: `
New Accessibility Barrier Report

Type: ${typeLabels[barrier.type]}
Severity: ${barrier.severity.toUpperCase()}
Location: ${barrier.lat}, ${barrier.lng}

Notes: ${barrier.notes || 'No additional notes provided'}

Contact Information:
${barrier.contact?.name ? `Name: ${barrier.contact.name}` : 'Name: Not provided'}
${barrier.contact?.email ? `Email: ${barrier.contact.email}` : 'Email: Not provided'}

Report ID: ${barrier.id}
Reported: ${new Date().toLocaleString()}

View on map: https://maps.google.com/?q=${barrier.lat},${barrier.lng}
      `.trim(),
      html: `
        <h2>New Accessibility Barrier Report</h2>
        <p><strong>Type:</strong> ${typeLabels[barrier.type]}</p>
        <p><strong>Severity:</strong> ${severityEmoji[barrier.severity]} ${barrier.severity.toUpperCase()}</p>
        <p><strong>Location:</strong> ${barrier.lat}, ${barrier.lng}</p>
        <p><strong>Notes:</strong> ${barrier.notes || 'No additional notes provided'}</p>
        
        <h3>Contact Information:</h3>
        <p><strong>Name:</strong> ${barrier.contact?.name || 'Not provided'}</p>
        <p><strong>Email:</strong> ${barrier.contact?.email || 'Not provided'}</p>
        
        <p><strong>Report ID:</strong> ${barrier.id}</p>
        <p><strong>Reported:</strong> ${new Date().toLocaleString()}</p>
        
        <p><a href="https://maps.google.com/?q=${barrier.lat},${barrier.lng}">View on Google Maps</a></p>
      `
    };
    
    // Add photo attachment if provided
    if (barrier.photoUrl) {
      emailContent.attachments = [{
        filename: `barrier-${barrier.id}.jpg`,
        path: barrier.photoUrl
      }];
    }
    
    try {
      const result = await this.transporter.sendMail(emailContent);
      console.log('Barrier report email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending barrier report email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
