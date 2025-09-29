// Vercel serverless function entry point
const express = require("express");
const app = require("../server");

// Export the app for Vercel
module.exports = app;
