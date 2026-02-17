require('dotenv').config();
const { pool, testConnection } = require('./server/config/database');

async function testSmartConfig() {
    console.log('🧪 Testing Smart Database Configuration...\n');
    
    // Show current environment detection
    console.log('Environment Variables:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`   DB_HOST (from .env): ${process.env.DB_HOST}`);
    console.log(`   DB_USER (from .env): ${process.env.DB_USER}`);
    console.log('');
    
    // Test database connection
    console.log('Testing database connection...');
    const connected = await testConnection();
    
    if (connected) {
        console.log('✅ Database connection successful!');
        
        // Test admin login
        console.log('\n🔐 Testing admin1 login...');
        try {
            const connection = await pool.getConnection();
            const [result] = await connection.execute(
                'SELECT id, username, email, role FROM users WHERE email = ? AND is_active = 1',
                ['admin1@ubunifusec.com']
            );
            connection.release();
            
            if (result.length > 0) {
                console.log('✅ Admin1 account found and accessible');
                console.log(`   Username: ${result[0].username}`);
                console.log(`   Email: ${result[0].email}`);
                console.log(`   Role: ${result[0].role}`);
                console.log('');
                console.log('🎉 Configuration is working correctly!');
                console.log('');
                console.log('📝 Admin Login Instructions:');
                console.log('• Email: admin1@ubunifusec.com');
                console.log('• Password: admin1@system');
                console.log('• Email: admin2@ubunifusec.com');
                console.log('• Password: admin2@system');
            } else {
                console.log('❌ Admin1 account not found in connected database');
            }
        } catch (error) {
            console.log('❌ Error testing admin account:', error.message);
        }
    } else {
        console.log('❌ Database connection failed');
        console.log('');
        console.log('💡 Troubleshooting:');
        console.log('• Make sure MySQL is running locally for development');
        console.log('• Or use Docker: docker-compose up -d');
    }
    
    process.exit(0);
}

testSmartConfig();