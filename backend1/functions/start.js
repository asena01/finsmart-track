#!/usr/bin/env node
/**
 * Startup script that imports and runs the main server
 * This ensures proper initialization and error handling
 */

import dotenv from 'dotenv';
dotenv.config();

import('./server.js').then(() => {
  console.log('✅ Server started successfully');
}).catch((error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📉 Gracefully shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n📉 Gracefully shutting down...');
  process.exit(0);
});
