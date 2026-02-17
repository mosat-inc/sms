require('dotenv').config();
const Auth = require('./server/utils/auth');

async function debugRealLogin() {
    console.log('🔍 Debugging REAL login failure for admin1...\n');
    
    // Test the exact same flow as the application
    const testEmail = 'admin1@ubunifusec.com';
    const testPassword = 'admin1@system';
    
    console.log(`Testing: ${testEmail} with password: ${testPassword}`);
    console.log('Using the exact same Auth.login method as the application\n');
    
    try {
        // This is exactly what the application does
        const result = await Auth.login(testEmail, testPassword);
        
        console.log('Auth.login result:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('\n✅ LOGIN SUCCESSFUL!');
            console.log('User details:');
            console.log(`   ID: ${result.user.id}`);
            console.log(`   Username: ${result.user.username}`);
            console.log(`   Email: ${result.user.email}`);
            console.log(`   Role: ${result.user.role}`);
            console.log(`   Token: ${result.token ? 'Generated' : 'Missing'}`);
        } else {
            console.log('\n❌ LOGIN FAILED!');
            console.log(`Error message: ${result.message}`);
            
            console.log('\n🔍 Let me check what might be wrong...');
            
            // Check if it's a database connection issue
            if (result.message.includes('ENOTFOUND') || result.message.includes('connect')) {
                console.log('💡 This looks like a database connection issue');
                console.log('   The application might be trying to connect to Docker database');
                console.log('   but Docker is not running, or wrong host is being used');
            }
            
            // Check if it's a password issue
            if (result.message.includes('Invalid email or password')) {
                console.log('💡 This looks like an authentication issue');
                console.log('   Either the email is not found or password is wrong');
            }
        }
        
    } catch (error) {
        console.error('\n❌ AUTH ERROR:', error.message);
        console.error('Stack:', error.stack);
    }
    
    // Let's also test the database connection directly
    console.log('\n🔍 Testing database connection directly...');
    try {
        const { testConnection } = require('./server/config/database');
        const isConnected = await testConnection();
        
        if (isConnected) {
            console.log('✅ Database connection is working');
        } else {
            console.log('❌ Database connection failed');
            console.log('💡 This is likely the root cause of login failure');
        }
    } catch (dbError) {
        console.error('❌ Database connection error:', dbError.message);
    }
    
    // Show current environment configuration
    console.log('\n📊 Current Environment Configuration:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`   DB_HOST: ${process.env.DB_HOST || 'undefined'}`);
    console.log(`   DB_USER: ${process.env.DB_USER || 'undefined'}`);
    console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '[SET]' : 'undefined'}`);
    
    process.exit(0);
}

debugRealLogin();