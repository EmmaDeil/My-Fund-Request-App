// Detailed SMTP diagnostic test
const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });

async function diagnoseSMTP() {
  console.log("🔍 SMTP Diagnostic Test\n");

  // Show configuration
  console.log("📋 Current Configuration:");
  console.log(`   Host: ${process.env.EMAIL_HOST}`);
  console.log(`   Port: ${process.env.EMAIL_PORT}`);
  console.log(`   Secure: ${process.env.EMAIL_SECURE}`);
  console.log(`   User: ${process.env.EMAIL_USER}`);
  console.log(
    `   Pass: ${process.env.EMAIL_PASS ? "***configured***" : "NOT SET"}`
  );
  console.log("");

  // Test different configurations
  const configs = [
    {
      name: "Gmail Standard (587 + STARTTLS)",
      config: {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      },
    },
    {
      name: "Gmail SSL (465)",
      config: {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      },
    },
    {
      name: "Gmail with timeout settings",
      config: {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      },
    },
  ];

  for (const { name, config } of configs) {
    console.log(`🧪 Testing: ${name}`);
    const transporter = nodemailer.createTransport(config);

    try {
      await transporter.verify();
      console.log(`✅ ${name}: Connection successful!`);

      // If this config works, try sending a test email
      console.log("📧 Attempting to send test email...");
      const result = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Send to yourself
        subject: "SMTP Test - Fund Request App",
        text: `This is a test email from your Fund Request app.\nConfiguration: ${name}\nTime: ${new Date().toISOString()}`,
        html: `
          <h2>✅ SMTP Test Successful</h2>
          <p>This is a test email from your Fund Request application.</p>
          <ul>
            <li><strong>Configuration:</strong> ${name}</li>
            <li><strong>Time:</strong> ${new Date().toISOString()}</li>
            <li><strong>From:</strong> ${process.env.EMAIL_USER}</li>
          </ul>
          <p>🎉 Your email service is working correctly!</p>
        `,
      });

      console.log(
        `📨 Test email sent successfully! Message ID: ${result.messageId}`
      );
      console.log(`📬 Check your inbox at: ${process.env.EMAIL_USER}\n`);
      break; // Stop testing once we find a working configuration
    } catch (error) {
      console.log(`❌ ${name}: Failed`);
      console.log(`   Error: ${error.message}`);
      console.log("");
    }
  }

  console.log("🔧 Troubleshooting Tips:");
  console.log(
    "1. Make sure 2-Factor Authentication is enabled on your Gmail account"
  );
  console.log(
    '2. Use an "App Password" instead of your regular Gmail password'
  );
  console.log(
    "3. Generate app password at: https://myaccount.google.com/apppasswords"
  );
  console.log("4. App password should be 16 characters without spaces");
  console.log(
    '5. Check that "Less secure app access" is not needed (deprecated)'
  );
}

diagnoseSMTP().catch(console.error);
