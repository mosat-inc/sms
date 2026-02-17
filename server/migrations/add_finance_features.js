const { pool } = require('../config/database');

async function addFinanceFeatures() {
    const connection = await pool.getConnection();
    
    try {
        console.log('🔧 Starting finance features migration...');
        
        // Add missing columns to users table
        console.log('📝 Adding salary and status columns to users table...');
        
        // Check if salary column exists
        const [salaryColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'salary'
        `);
        
        if (salaryColumns.length === 0) {
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN salary DECIMAL(10,2) DEFAULT 5750000
            `);
            console.log('✅ Added salary column to users table');
        } else {
            console.log('ℹ️  Salary column already exists');
        }
        
        // Check if status column exists
        const [statusColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'status'
        `);
        
        if (statusColumns.length === 0) {
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active'
            `);
            console.log('✅ Added status column to users table');
        } else {
            console.log('ℹ️  Status column already exists');
        }
        
        // Add missing columns to fee_payments table
        console.log('📝 Updating fee_payments table structure...');
        
        // Check if term column exists
        const [termColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'fee_payments' 
            AND COLUMN_NAME = 'term'
        `);
        
        if (termColumns.length === 0) {
            await connection.execute(`
                ALTER TABLE fee_payments 
                ADD COLUMN term VARCHAR(20) NOT NULL DEFAULT 'Term 1'
            `);
            console.log('✅ Added term column to fee_payments table');
        } else {
            console.log('ℹ️  Term column already exists in fee_payments table');
        }
        
        // Check if status column exists in fee_payments
        const [feeStatusColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'fee_payments' 
            AND COLUMN_NAME = 'status'
        `);
        
        if (feeStatusColumns.length === 0) {
            await connection.execute(`
                ALTER TABLE fee_payments 
                ADD COLUMN status ENUM('Paid', 'Pending', 'Overdue') DEFAULT 'Paid'
            `);
            console.log('✅ Added status column to fee_payments table');
        } else {
            console.log('ℹ️  Status column already exists in fee_payments table');
        }
        
        // Update existing users with default salary if they don't have one
        console.log('📝 Setting default salaries for existing users...');
        
        await connection.execute(`
            UPDATE users 
            SET salary = CASE 
                WHEN role = 'admin' THEN 8000000 
                WHEN role = 'teacher' THEN 5750000 
                ELSE 3000000 
            END 
            WHERE salary IS NULL OR salary = 0
        `);
        console.log('✅ Default salaries set for existing users');
        
        // Update existing users status to active if not set
        await connection.execute(`
            UPDATE users 
            SET status = 'active' 
            WHERE status IS NULL
        `);
        console.log('✅ Status updated for existing users');
        
        console.log('🎉 Finance features migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        connection.release();
    }
}

// Run migration if called directly
if (require.main === module) {
    addFinanceFeatures()
        .then(() => {
            console.log('Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { addFinanceFeatures };
