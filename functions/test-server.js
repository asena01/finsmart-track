#!/usr/bin/env node

// Import and run the actual server
import('./server.js').catch((error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});
