#!/usr/bin/env node

/**
 * SMTP Connection Diagnostic Script
 * Diagnoses SMTP connection issues without sending emails
 */

require('dotenv').config({ path: '.env.production' });
const nodemailer = require('nodemailer');
const net = require('net');

async function diagnoseSMTP() {
  console.log('🔍 SMTP Connection Diagnostic\n');
  
  const config = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  };
  
  console.log('📧 SMTP Configuration:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Secure: ${config.secure}`);
  console.log(`   User: ${config.user || '❌ MISSING'}`);
  console.log(`   Pass: ${config.pass ? '✅ SET' : '❌ MISSING'}\n`);
  
  // Test 1: Basic network connectivity
  console.log('🌐 Test 1: Network Connectivity');
  try {
    await testNetworkConnection(config.host, config.port);
    console.log(`✅ Network connection to ${config.host}:${config.port} successful\n`);
  } catch (error) {
    console.error(`❌ Network connection failed: ${error.message}\n`);
    return;
  }
  
  // Test 2: SMTP transporter creation
  console.log('🔧 Test 2: SMTP Transporter Creation');
  let transporter;
  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      tls: {
        rejectUnauthorized: false,
      },
      debug: true,
      logger: true,
    });
    console.log('✅ SMTP transporter created successfully\n');
  } catch (error) {
    console.error(`❌ SMTP transporter creation failed: ${error.message}\n`);
    return;
  }
  
  // Test 3: SMTP verification
  console.log('🔍 Test 3: SMTP Authentication & Verification');
  try {
    const verified = await transporter.verify();
    console.log('✅ SMTP verification successful\n');
  } catch (error) {
    console.error(`❌ SMTP verification failed: ${error.message}`);
    console.error(`   Error Code: ${error.code || 'UNKNOWN'}`);
    
    if (error.code === 'EAUTH') {
      console.error('💡 Authentication failed - check username/password');
      console.error('   For Gmail: Use App Password instead of regular password');
      console.error('   Enable 2FA and generate App Password at: https://myaccount.google.com/apppasswords');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      console.error('💡 Connection timeout - check network/firewall');
      console.error('   Ensure port 587 is not blocked by firewall');
      console.error('   Try using port 465 with secure: true');
    }
    console.log('');
  }
  
  console.log('🏁 Diagnostic complete');
}

function testNetworkConnection(host, port) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = 10000; // 10 seconds
    
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      resolve();
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`Connection timeout after ${timeout}ms`));
    });
    
    socket.on('error', (error) => {
      socket.destroy();
      reject(error);
    });
    
    socket.connect(port, host);
  });
}

// Run the diagnostic
diagnoseSMTP().catch(console.error);