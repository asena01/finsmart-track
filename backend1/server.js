#!/usr/bin/env node
/**
 * Backend Server Wrapper
 * Imports and runs the main server from functions/server.js
 */

import('./functions/server.js').catch((error) => {
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
