module.exports = {
  apps: [
    {
      name: 'ubunifu-sms',
      script: 'server/server.js',
      cwd: __dirname,
      
      // Production environment
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      
      // Process management
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      
      // Auto-restart configuration
      watch: false, // Disable in production
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.git'
      ],
      
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      // Logging
      log_file: 'logs/pm2-combined.log',
      out_file: 'logs/pm2-out.log',
      error_file: 'logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Advanced settings
      kill_timeout: 3000,
      wait_ready: true,
      listen_timeout: 3000,
      
      // Environment variables for production
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        
        // Security
        JWT_SECRET: process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION',
        BCRYPT_ROUNDS: 12,
        
        // Database
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || 3306,
        DB_NAME: process.env.DB_NAME || 'sms_database',
        DB_USER: process.env.DB_USER || 'root',
        DB_PASSWORD: process.env.DB_PASSWORD || '',
        
        // Logging
        LOG_LEVEL: 'info',
        
        // Rate limiting
        RATE_LIMIT_WINDOW: 15,
        RATE_LIMIT_MAX_REQUESTS: 1000,
        
        // Session
        SESSION_TIMEOUT: 3600,
        OTP_EXPIRY_TIME: 300,
        
        // Application
        FRONTEND_URL: process.env.FRONTEND_URL || 'https://your-domain.com'
      }
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/ubunifu-sms.git',
      path: '/var/www/ubunifu-sms',
      
      // Pre-deploy commands
      'pre-deploy': 'git fetch --all',
      
      // Deploy commands
      'post-deploy': [
        'npm install --production',
        'cd client && npm install --production',
        'cd client && npm run build',
        'pm2 reload ecosystem.config.js --env production',
        'pm2 save'
      ].join(' && '),
      
      // Rollback commands
      'pre-setup': 'apt update && apt install git -y'
    }
  }
};
