const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Basic health check
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check database connectivity
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT 1 as healthy');
    connection.release();
    
    const dbLatency = Date.now() - startTime;
    
    // System health metrics
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      },
      database: {
        status: rows[0].healthy === 1 ? 'connected' : 'error',
        latency: dbLatency + 'ms'
      },
      services: {
        api: 'operational',
        auth: 'operational',
        database: 'operational'
      }
    };
    
    res.status(200).json(healthData);
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      error: 'Database connection failed',
      services: {
        api: 'operational',
        auth: 'operational',
        database: 'failed'
      }
    });
  }
});

// Detailed health check with more metrics
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Database health
    const connection = await pool.getConnection();
    const [dbRows] = await connection.execute('SELECT COUNT(*) as user_count FROM users');
    const [dbStatus] = await connection.execute('SHOW STATUS LIKE "Threads_connected"');
    connection.release();
    
    const dbLatency = Date.now() - startTime;
    
    // System metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: {
        seconds: Math.floor(process.uptime()),
        human: formatUptime(process.uptime())
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid
      },
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      database: {
        status: 'connected',
        latency: dbLatency + 'ms',
        userCount: dbRows[0].user_count,
        connections: dbStatus[0]?.Value || 'unknown'
      },
      services: {
        api: 'operational',
        auth: 'operational',
        database: 'operational',
        fileUpload: 'operational',
        logging: 'operational'
      }
    };
    
    res.status(200).json(detailedHealth);
    
  } catch (error) {
    console.error('Detailed health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        api: 'operational',
        database: 'failed'
      }
    });
  }
});

// Ready check for load balancers
router.get('/ready', async (req, res) => {
  try {
    // Quick database connectivity check
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();
    
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

// Live check for Kubernetes-style probes
router.get('/live', (req, res) => {
  // Simple liveness check - if the server is responding, it's alive
  res.status(200).json({ status: 'alive' });
});

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

module.exports = router;
