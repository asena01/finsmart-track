#!/usr/bin/env node
/**
 * Start backend on port 5002 to avoid conflicts with test server
 */

process.env.PORT = '5002';
process.env.NODE_ENV = 'development';

// Load the main server
import('./server.js').catch((error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});
