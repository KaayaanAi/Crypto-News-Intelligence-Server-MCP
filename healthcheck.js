#!/usr/bin/env node

// CNiS-MCP Server Health Check
// This script validates that the server is running properly

import http from 'http';
import process from 'process';

// Configuration
const HEALTH_CHECK_PORT = process.env.PORT || 3000;
const HEALTH_CHECK_HOST = process.env.HOST || 'localhost';
const HEALTH_CHECK_TIMEOUT = 2000; // 2 seconds

async function performHealthCheck() {
  try {
    // Check if we're in HTTP mode
    const isHttpMode = process.env.HTTP_MODE === 'true' ||
                      process.env.FULL_MODE === 'true' ||
                      process.env.MCP_MODE === 'http' ||
                      process.env.MCP_MODE === 'full';

    if (isHttpMode) {
      // HTTP mode - check the health endpoint
      await checkHttpHealth();
    } else {
      // STDIO mode - check if process is responsive
      await checkStdioHealth();
    }

    console.log('✅ Health check passed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
}

function checkHttpHealth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HEALTH_CHECK_HOST,
      port: HEALTH_CHECK_PORT,
      path: '/health',
      method: 'GET',
      timeout: HEALTH_CHECK_TIMEOUT
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const healthData = JSON.parse(data);
            if (healthData.status === 'healthy') {
              resolve(healthData);
            } else {
              reject(new Error(`Server reports unhealthy status: ${healthData.status}`));
            }
          } catch (parseError) {
            reject(new Error(`Invalid health response: ${parseError.message}`));
          }
        } else {
          reject(new Error(`Health endpoint returned status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`HTTP health check failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Health check timed out after ${HEALTH_CHECK_TIMEOUT}ms`));
    });

    req.setTimeout(HEALTH_CHECK_TIMEOUT);
    req.end();
  });
}

function checkStdioHealth() {
  return new Promise((resolve, reject) => {
    // For STDIO mode, we check if the process is still responsive
    // by testing basic Node.js functionality and memory usage

    try {
      // Check memory usage
      const memUsage = process.memoryUsage();
      const memUsageMB = memUsage.rss / 1024 / 1024;

      // Alert if memory usage is very high (>500MB for this application)
      if (memUsageMB > 500) {
        console.warn(`⚠️ High memory usage: ${memUsageMB.toFixed(2)}MB`);
      }

      // Check if process has been running for some time (basic liveness check)
      const uptimeSeconds = process.uptime();

      if (uptimeSeconds < 1) {
        reject(new Error('Process just started, not yet ready'));
        return;
      }

      // Test basic async operation
      setImmediate(() => {
        // If we get here, the event loop is working
        resolve({
          status: 'healthy',
          mode: 'stdio',
          uptime: uptimeSeconds,
          memoryMB: memUsageMB.toFixed(2),
          pid: process.pid
        });
      });

    } catch (error) {
      reject(new Error(`STDIO health check failed: ${error.message}`));
    }
  });
}

// Run the health check
performHealthCheck();