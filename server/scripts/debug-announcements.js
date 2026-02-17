const { pool } = require('../config/database');

/**
 * Debug script to check announcement visibility issues
 */

async function debugAnnouncements() {
    try {
        console.log('🔍 Debugging announcement visibility issues...\n');
        
        const connection = await pool.getConnection();
        
        try {
            // 1. Check if announcements table exists and has data
            console.log('1. Checking announcements table structure...');
            const [tableInfo] = await connection.execute(`
                DESCRIBE announcements
            `);
            
            console.log('   ✅ Announcements table structure:');
            tableInfo.forEach(column => {
                console.log(`     - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? '(NOT NULL)' : ''} ${column.Key ? `(${column.Key})` : ''}`);
            });

            // 2. Check total announcements count
            console.log('\n2. Checking total announcements in database...');
            const [countResult] = await connection.execute(`
                SELECT COUNT(*) as total_count FROM announcements
            `);
            console.log(`   📊 Total announcements: ${countResult[0].total_count}`);

            // 3. Check recent announcements (last 24 hours)
            console.log('\n3. Checking recent announcements (last 24 hours)...');
            const [recentAnnouncements] = await connection.execute(`
                SELECT 
                    id, title, content, priority, target_audience, 
                    class_id, is_active, expires_at, 
                    created_by, created_at, updated_at
                FROM announcements 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY created_at DESC
                LIMIT 10
            `);

            if (recentAnnouncements.length === 0) {
                console.log('   ❌ No announcements created in the last 24 hours');
            } else {
                console.log(`   ✅ Found ${recentAnnouncements.length} recent announcement(s):`);
                recentAnnouncements.forEach((ann, index) => {
                    console.log(`     ${index + 1}. ID: ${ann.id}`);
                    console.log(`        Title: "${ann.title}"`);
                    console.log(`        Content: "${ann.content.substring(0, 100)}${ann.content.length > 100 ? '...' : ''}"`);
                    console.log(`        Priority: ${ann.priority}`);
                    console.log(`        Target: ${ann.target_audience}`);
                    console.log(`        Class ID: ${ann.class_id || 'None'}`);
                    console.log(`        Active: ${ann.is_active ? 'Yes' : 'No'}`);
                    console.log(`        Expires: ${ann.expires_at || 'Never'}`);
                    console.log(`        Created by: ${ann.created_by}`);
                    console.log(`        Created: ${ann.created_at}`);
                    console.log(`        Updated: ${ann.updated_at}`);
                    console.log('');
                });
            }

            // 4. Check active announcements that should be visible
            console.log('4. Checking currently active announcements...');
            const [activeAnnouncements] = await connection.execute(`
                SELECT 
                    a.id, a.title, a.priority, a.target_audience, a.class_id,
                    a.is_active, a.expires_at, a.created_at,
                    u.username as author_name
                FROM announcements a
                LEFT JOIN users u ON a.created_by = u.id
                WHERE a.is_active = TRUE 
                    AND (a.expires_at IS NULL OR a.expires_at > NOW())
                ORDER BY a.created_at DESC
                LIMIT 10
            `);

            if (activeAnnouncements.length === 0) {
                console.log('   ❌ No active announcements found!');
                console.log('   💡 This could be why announcements are not visible');
            } else {
                console.log(`   ✅ Found ${activeAnnouncements.length} active announcement(s):`);
                activeAnnouncements.forEach((ann, index) => {
                    console.log(`     ${index + 1}. "${ann.title}" by ${ann.author_name || 'Unknown'}`);
                    console.log(`        Target: ${ann.target_audience}, Active: ${ann.is_active ? 'Yes' : 'No'}`);
                    console.log(`        Created: ${ann.created_at}`);
                });
            }

            // 5. Check if announcement_reads table exists (for read tracking)
            console.log('\n5. Checking announcement_reads table...');
            try {
                const [readsTableInfo] = await connection.execute(`
                    DESCRIBE announcement_reads
                `);
                console.log('   ✅ Announcement_reads table exists');
                
                // Check if there are any read records
                const [readsCount] = await connection.execute(`
                    SELECT COUNT(*) as reads_count FROM announcement_reads
                `);
                console.log(`   📊 Total read records: ${readsCount[0].reads_count}`);
                
            } catch (error) {
                console.log('   ❌ Announcement_reads table does not exist');
                console.log('   💡 This might cause issues with read/unread status');
            }

            // 6. Check users table for admin accounts
            console.log('\n6. Checking admin users who can create announcements...');
            const [adminUsers] = await connection.execute(`
                SELECT id, username, first_name, last_name, is_active
                FROM users 
                WHERE role = 'admin' AND is_active = TRUE
                ORDER BY id
            `);

            if (adminUsers.length === 0) {
                console.log('   ❌ No active admin users found!');
                console.log('   💡 This could prevent announcement creation');
            } else {
                console.log(`   ✅ Found ${adminUsers.length} active admin user(s):`);
                adminUsers.forEach((user, index) => {
                    console.log(`     ${index + 1}. ${user.username} (${user.first_name} ${user.last_name})`);
                });
            }

            // 7. Check classes table (for class-specific announcements)
            console.log('\n7. Checking classes for class-specific announcements...');
            const [classesCount] = await connection.execute(`
                SELECT COUNT(*) as classes_count FROM classes WHERE is_active = TRUE
            `);
            console.log(`   📊 Active classes: ${classesCount[0].classes_count}`);

        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('❌ Error during debugging:', error);
    }
}

// Additional function to test the API endpoint
async function testAnnouncementAPI() {
    console.log('\n🧪 Testing announcement API endpoint...');
    
    try {
        // This would require making an HTTP request
        console.log('   💡 To test the API endpoint, try these URLs in your browser:');
        console.log('   - http://localhost:5000/api/communication/announcements (requires authentication)');
        console.log('   - Check the browser console for any error messages');
        console.log('   - Check the Network tab to see if API calls are being made');
    } catch (error) {
        console.error('   ❌ API test failed:', error);
    }
}

// Run the debug script
if (require.main === module) {
    debugAnnouncements().then(() => {
        testAnnouncementAPI();
        console.log('\n🏁 Debug analysis completed');
        console.log('\n📝 Summary of things to check:');
        console.log('   1. Are announcements being created in the database?');
        console.log('   2. Are the announcements marked as active (is_active = TRUE)?');
        console.log('   3. Have they expired (expires_at)?');
        console.log('   4. Are you logged in as an admin?');
        console.log('   5. Is the frontend making API calls?');
        console.log('   6. Check browser console for JavaScript errors');
        console.log('   7. Check Network tab for failed API requests');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Debug script failed:', error);
        process.exit(1);
    });
}

module.exports = { debugAnnouncements };
