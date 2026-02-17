const { initializeDatabase } = require('./server/config/database');

console.log('🚀 Starting database initialization...');
console.log('═══════════════════════════════════════════════');

initializeDatabase()
    .then(() => {
        console.log('✅ Database initialization completed successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 Summary:');
        console.log('   • Database: sms_database created');
        console.log('   • All tables created successfully');
        console.log('   • Default admin user created');
        console.log('   • Sample classes and subjects added');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 Your SMS system is now ready to use!');
        console.log('');
        console.log('📝 Default Login Credentials:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('');
        console.log('🌐 You can now register teachers and students!');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Database initialization failed:', error.message);
        console.error('');
        console.error('🔧 Troubleshooting:');
        console.error('   1. Make sure MySQL is running');
        console.error('   2. Check your .env file database credentials');
        console.error('   3. Ensure MySQL user has sufficient privileges');
        console.error('');
        console.error('📋 Current .env settings:');
        console.error(`   DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
        console.error(`   DB_PORT: ${process.env.DB_PORT || '3306'}`);
        console.error(`   DB_NAME: ${process.env.DB_NAME || 'sms_database'}`);
        console.error(`   DB_USER: ${process.env.DB_USER || 'root'}`);
        process.exit(1);
    });
