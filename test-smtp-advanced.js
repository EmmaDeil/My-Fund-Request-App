// Enhanced SMTP diagnostic tool
const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });

async function testSMTPConnection() {
  console.log("🔍 SMTP Connection Diagnostics\n");

  // Display current configuration
  console.log("📋 Current Configuration:");
  console.log(`   Host: ${process.env.EMAIL_HOST}`);
  console.log(`   Port: ${process.env.EMAIL_PORT}`);
  console.log(`   Secure: ${process.env.EMAIL_SECURE}`);
  console.log(`   User: ${process.env.EMAIL_USER}`);
  console.log(`   Pass: ${"*".repeat(process.env.EMAIL_PASS?.length || 0)}`);
  console.log("");

  const configs = [
    {
      name: "Standard Gmail SMTP",
      config: {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 20000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
      },
    },
    {
      name: "Gmail SMTP with SSL",
      config: {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 20000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
      },
    },
    {
      name: "Gmail SMTP with TLS explicit",
      config: {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 20000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        tls: {
          ciphers: "SSLv3",
          rejectUnauthorized: false,
        },
      },
    },
  ];

  for (const { name, config } of configs) {
    try {
      console.log(`🧪 Testing: ${name}`);
      const transporter = nodemailer.createTransport(config);

      await transporter.verify();
      console.log(`✅ ${name}: Connection successful!`);

      // Try sending a test email
      console.log(`📧 Sending test email via ${name}...`);
      const info = await transporter.sendMail({
        from: {
          name: "Fund Request Test",
          address: process.env.EMAIL_USER,
        },
        to: process.env.EMAIL_USER,
        subject: `✅ SMTP Test Success - ${name}`,
        html: `
          <h2>🎉 SMTP Connection Test Successful!</h2>
          <p><strong>Configuration:</strong> ${name}</p>
          <p><strong>Host:</strong> ${config.host}</p>
          <p><strong>Port:</strong> ${config.port}</p>
          <p><strong>Secure:</strong> ${config.secure}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p>Your email service is working correctly! ✅</p>
        `,
        text: `SMTP Test Success - ${name}\nConfiguration: ${name}\nHost: ${
          config.host
        }\nPort: ${config.port}\nSecure: ${
          config.secure
        }\nTime: ${new Date().toLocaleString()}\n\nYour email service is working correctly!`,
      });

      console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);
      console.log(`📧 Check your inbox at: ${process.env.EMAIL_USER}\n`);

      // If we got here, this config works - let's update the .env file
      await updateEnvFile(config);
      return true;
    } catch (error) {
      console.log(`❌ ${name}: Failed - ${error.message}\n`);
      continue;
    }
  }

  console.log("❌ All SMTP configurations failed. Please check:");
  console.log("   1. Gmail 2-factor authentication is enabled");
  console.log("   2. App password is correctly generated and set");
  console.log("   3. Network/firewall allows SMTP connections");
  console.log(
    "   4. Gmail account settings allow less secure apps (if needed)"
  );

  return false;
}

async function updateEnvFile(workingConfig) {
  const fs = require("fs").promises;
  const envPath = path.join(__dirname, "backend", ".env");

  try {
    let envContent = await fs.readFile(envPath, "utf-8");

    // Update the EMAIL_PORT and EMAIL_SECURE based on working config
    envContent = envContent.replace(
      /EMAIL_PORT=\d+/,
      `EMAIL_PORT=${workingConfig.port}`
    );
    envContent = envContent.replace(
      /EMAIL_SECURE=(true|false)/,
      `EMAIL_SECURE=${workingConfig.secure}`
    );

    await fs.writeFile(envPath, envContent);
    console.log("🔧 Updated .env file with working configuration");
  } catch (error) {
    console.log("⚠️  Could not update .env file:", error.message);
  }
}

// Run the test
testSMTPConnection();
