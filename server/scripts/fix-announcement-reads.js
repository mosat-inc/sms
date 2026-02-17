const { pool } = require('../config/database');

/**
 * Script to check and fix announcement_reads table
 */

async function fixAnnouncementReads() {
    try {
        console.log('🔧 Checking announcement_reads table...\n');
        
        const connection = await pool.getConnection();
        
        try {
            // 1. Check if announcement_reads table exists
            console.log('1. Checking if announcement_reads table exists...');
            try {
                const [tableInfo] = await connection.execute(`
                    DESCRIBE announcement_reads
                `);
                console.log('   ✅ announcement_reads table exists');
                console.log('   📋 Table structure:');
                tableInfo.forEach(column => {
                    console.log(`     - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? '(NOT NULL)' : ''} ${column.Key ? `(${column.Key})` : ''}`);
                });
            } catch (error) {
                console.log('   ❌ announcement_reads table does not exist');
                console.log('   🔧 Creating announcement_reads table...');
                
                await connection.execute(`
                    CREATE TABLE announcement_reads (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        announcement_id INT NOT NULL,
                        user_id INT NOT NULL,
                        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        UNIQUE KEY unique_announcement_user (announcement_id, user_id),
                        INDEX idx_announcement_id (announcement_id),
                        INDEX idx_user_id (user_id)
                    )
                `);
                console.log('   ✅ announcement_reads table created');
            }

            // 2. Check current read records
            console.log('\n2. Checking current read records...');
            const [readCount] = await connection.execute(`
                SELECT COUNT(*) as total_reads FROM announcement_reads
            `);
            console.log(`   📊 Total read records: ${readCount[0].total_reads}`);

            // 3. Test the unread count query for admin users
            console.log('\n3. Testing unread count for admin users...');
            const [adminUsers] = await connection.execute(`
                SELECT id, username FROM users WHERE role = 'admin' AND is_active = TRUE LIMIT 3
            `);
            
            for (const admin of adminUsers) {
                const [unreadResult] = await connection.execute(`
                    SELECT COUNT(*) as unread_count
                    FROM announcements a
                    LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = ?
                    WHERE a.is_active = TRUE
                        AND (a.expires_at IS NULL OR a.expires_at > NOW())
                        AND ar.read_at IS NULL
                `, [admin.id]);
                
                console.log(`   📋 ${admin.username}: ${unreadResult[0].unread_count} unread announcements`);
            }

            // 4. Check active announcements
            console.log('\n4. Checking active announcements...');
            const [activeAnnouncements] = await connection.execute(`
                SELECT COUNT(*) as active_count
                FROM announcements
                WHERE is_active = TRUE
                    AND (expires_at IS NULL OR expires_at > NOW())
            `);
            console.log(`   📊 Active announcements: ${activeAnnouncements[0].active_count}`);

            // 5. Test marking an announcement as read for admin1
            console.log('\n5. Testing mark-as-read functionality...');
            const [testAnnouncement] = await connection.execute(`
                SELECT id, title FROM announcements 
                WHERE is_active = TRUE 
                    AND (expires_at IS NULL OR expires_at > NOW())
                LIMIT 1
            `);
            
            if (testAnnouncement.length > 0) {
                const announcementId = testAnnouncement[0].id;
                const admin1 = adminUsers.find(u => u.username === 'admin1');
                
                if (admin1) {
                    console.log(`   🧪 Testing mark-as-read for announcement "${testAnnouncement[0].title}" (ID: ${announcementId})`);
                    
                    // Mark as read
                    await connection.execute(`
                        INSERT INTO announcement_reads (announcement_id, user_id, read_at) 
                        VALUES (?, ?, NOW()) 
                        ON DUPLICATE KEY UPDATE read_at = NOW()
                    `, [announcementId, admin1.id]);
                    
                    // Check unread count again
                    const [newUnreadResult] = await connection.execute(`
                        SELECT COUNT(*) as unread_count
                        FROM announcements a
                        LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = ?
                        WHERE a.is_active = TRUE
                            AND (a.expires_at IS NULL OR a.expires_at > NOW())
                            AND ar.read_at IS NULL
                    `, [admin1.id]);
                    
                    console.log(`   ✅ After marking as read: ${admin1.username} now has ${newUnreadResult[0].unread_count} unread announcements`);
                }
            } else {
                console.log('   ❌ No active announcements to test with');
            }

        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('❌ Error fixing announcement reads:', error);
    }
}

// Run the fix script
if (require.main === module) {
    fixAnnouncementReads().then(() => {
        console.log('\n🎉 Announcement reads check/fix completed!');
        console.log('\n💡 If notifications still don\'t update in real-time:');
        console.log('   1. Check browser console for JavaScript errors');
        console.log('   2. Check Network tab in browser for API call failures');
        console.log('   3. Make sure you\'re logged in with the correct account');
        console.log('   4. Try refreshing the page and testing again');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Fix script failed:', error);
        process.exit(1);
    });
}

module.exports = { fixAnnouncementReads };
