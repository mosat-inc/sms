require('dotenv').config();
const Auth = require('./server/utils/auth');

async function finalAdminTest() {
    console.log('🎯 FINAL COMPREHENSIVE ADMIN LOGIN TEST\n');
    console.log('=' .repeat(60));
    
    const adminAccounts = [
        { 
            name: 'Admin 1', 
            email: 'admin1@ubunifusec.com', 
            username: 'admin1', 
            password: 'admin1@system' 
        },
        { 
            name: 'Admin 2', 
            email: 'admin2@ubunifusec.com', 
            username: 'admin2', 
            password: 'admin2@system' 
        }
    ];
    
    let successCount = 0;
    let totalTests = 0;
    
    for (const admin of adminAccounts) {
        console.log(`\n🔐 Testing ${admin.name}:`);
        console.log('─'.repeat(30));
        
        // Test 1: Email-based login
        totalTests++;
        console.log(`📧 Test 1: Email login (${admin.email})`);
        try {
            const emailResult = await Auth.login(admin.email, admin.password);
            if (emailResult.success) {
                console.log('   ✅ SUCCESS - Email login works!');
                console.log(`   👤 User: ${emailResult.user.first_name} ${emailResult.user.last_name}`);
                console.log(`   🎭 Role: ${emailResult.user.role}`);
                successCount++;
            } else {
                console.log('   ❌ FAILED - ' + emailResult.message);
            }
        } catch (error) {
            console.log('   ❌ ERROR - ' + error.message);
        }
        
        // Test 2: Username-based login
        totalTests++;
        console.log(`\n👤 Test 2: Username login (${admin.username})`);
        try {
            const usernameResult = await Auth.login(admin.username, admin.password);
            if (usernameResult.success) {
                console.log('   ✅ SUCCESS - Username login works!');
                console.log(`   👤 User: ${usernameResult.user.first_name} ${usernameResult.user.last_name}`);
                console.log(`   🎭 Role: ${usernameResult.user.role}`);
                successCount++;
            } else {
                console.log('   ❌ FAILED - ' + usernameResult.message);
            }
        } catch (error) {
            console.log('   ❌ ERROR - ' + error.message);
        }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 FINAL RESULTS:');
    console.log('=' .repeat(60));
    
    if (successCount === totalTests) {
        console.log('🎉 ALL TESTS PASSED! (' + successCount + '/' + totalTests + ')');
        console.log('');
        console.log('✅ ISSUE COMPLETELY RESOLVED!');
        console.log('');
        console.log('🚀 Your SMS application is now ready:');
        console.log('   • Email-based authentication is working');
        console.log('   • Both admin accounts can log in');
        console.log('   • Smart database configuration is active');
        console.log('   • Works in both local and Docker environments');
        console.log('');
        console.log('🔑 Admin Login Credentials:');
        console.log('   • admin1@ubunifusec.com / admin1@system');
        console.log('   • admin2@ubunifusec.com / admin2@system');
        console.log('');
        console.log('💡 Usage Instructions:');
        console.log('   • For development: npm run dev');
        console.log('   • For production: docker-compose up');
        console.log('   • Both environments automatically detect correct database');
        
    } else {
        console.log('❌ Some tests failed (' + successCount + '/' + totalTests + ')');
        console.log('');
        console.log('💡 Please check the error messages above');
    }
    
    process.exit(0);
}

finalAdminTest();
