const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables from both repo root and server/.env (server/.env wins).
// This avoids confusion when running scripts from the repo root.
const rootEnvPath = path.join(__dirname, '../../.env');
const serverEnvPath = path.join(__dirname, '../.env');

if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
}
if (fs.existsSync(serverEnvPath)) {
    dotenv.config({ path: serverEnvPath, override: true });
}

// Smart database configuration - auto-detect Docker vs local environment
const isRunningInDocker = () => {
    // Check if we're running inside a Docker container
    try {
        const fs = require('fs');
        // Docker containers have /.dockerenv file
        if (fs.existsSync('/.dockerenv')) {
            return true;
        }
        // Also check if hostname starts with docker container patterns
        const os = require('os');
        const hostname = os.hostname();
        if (hostname.includes('sms-backend') || hostname.length === 12) {
            return true;
        }
    } catch (error) {
        // If we can't determine, assume local
    }
    return false;
};

const inDocker = isRunningInDocker();
console.log(`🔍 Environment detected: ${inDocker ? 'Docker Container' : 'Local Development'}`);

const sanitizeHost = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return raw;
    if (raw.includes('://')) {
        try {
            const parsed = new URL(raw);
            return String(parsed.hostname || '').trim();
        } catch (_err) {
            // Keep fallback parsing for malformed URLs
        }
    }
    // Handle accidental host values like "user:pass@host:port/db?x=y"
    let host = raw;
    host = host.replace(/^.*@/, ''); // strip credentials if present
    host = host.replace(/\/.*$/, ''); // strip path/query
    host = host.replace(/:\d+$/, ''); // strip port if appended
    return host.trim();
};

const parseDatabaseUrl = (value) => {
    try {
        const parsed = new URL(String(value || '').trim());
        const dbName = (parsed.pathname || '').replace(/^\//, '').trim();
        return {
            host: sanitizeHost(parsed.hostname),
            port: parsed.port ? Number(parsed.port) : 3306,
            user: decodeURIComponent(parsed.username || ''),
            password: decodeURIComponent(parsed.password || ''),
            database: dbName || undefined,
            sslMode: parsed.searchParams.get('ssl-mode') || parsed.searchParams.get('sslmode') || ''
        };
    } catch (_err) {
        return null;
    }
};

// Database configuration with smart defaults that override .env when needed
let dbHost;
let dbUser;
let dbPort = process.env.DB_PORT || 3306;
let dbPassword = process.env.DB_PASSWORD || 'allahuma';
let dbName = process.env.DB_NAME || 'sms_database';

const urlConfig = process.env.DATABASE_URL ? parseDatabaseUrl(process.env.DATABASE_URL) : null;

if (urlConfig?.host) {
    dbHost = urlConfig.host;
    dbUser = process.env.DB_USER || urlConfig.user || (inDocker ? 'sms_user' : 'root');
    dbPort = process.env.DB_PORT || urlConfig.port || 3306;
    dbPassword = process.env.DB_PASSWORD || urlConfig.password || dbPassword;
    dbName = process.env.DB_NAME || urlConfig.database || dbName;
} else if (inDocker) {
    // Running in Docker container - use Docker settings
    dbHost = sanitizeHost(process.env.DB_HOST || 'db');
    dbUser = process.env.DB_USER || 'sms_user';
} else {
    // Running locally - prefer env, fallback to localhost/root
    dbHost = sanitizeHost(process.env.DB_HOST || 'localhost');
    dbUser = process.env.DB_USER || 'root';
}

const isTruthy = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
const sslEnabled = isTruthy(process.env.DB_SSL);
const sslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
const sslCa = process.env.DB_SSL_CA ? process.env.DB_SSL_CA.replace(/\\n/g, '\n') : undefined;

const dbConfig = {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

if (sslEnabled) {
    dbConfig.ssl = {
        rejectUnauthorized: sslRejectUnauthorized
    };

    if (sslCa) {
        dbConfig.ssl.ca = sslCa;
    }
}

console.log(`📊 Database config: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

// Create connection pool
const pool = mysql.createPool(dbConfig);

const RETRYABLE_DB_ERROR_CODES = new Set([
    'ENOTFOUND',
    'EAI_AGAIN',
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'PROTOCOL_CONNECTION_LOST'
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withDbRetry = async (fn) => {
    const maxAttempts = Math.max(1, Number(process.env.DB_RETRY_ATTEMPTS || 3));
    let attempt = 0;
    while (attempt < maxAttempts) {
        try {
            return await fn();
        } catch (error) {
            attempt += 1;
            const code = error?.code || '';
            const retryable = RETRYABLE_DB_ERROR_CODES.has(code);
            if (!retryable || attempt >= maxAttempts) {
                throw error;
            }
            const waitMs = 250 * attempt;
            console.warn(`⚠️  DB transient error (${code}), retrying ${attempt}/${maxAttempts} in ${waitMs}ms`);
            await sleep(waitMs);
        }
    }
};

// Add retry wrappers for transient DNS/network errors used by routes.
const rawPoolExecute = pool.execute.bind(pool);
pool.execute = (...args) => withDbRetry(() => rawPoolExecute(...args));
const rawPoolQuery = pool.query.bind(pool);
pool.query = (...args) => withDbRetry(() => rawPoolQuery(...args));
const rawGetConnection = pool.getConnection.bind(pool);
pool.getConnection = () => withDbRetry(() => rawGetConnection());

// Test database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.code || error.name || 'UNKNOWN', error.message || '');
        return false;
    }
};

	// Initialize database schema (create tables if they don't exist)
	const initializeDatabase = async () => {
	    try {
        // First create a connection without specifying the database
        const tempConfig = { ...dbConfig };
        delete tempConfig.database;
        const tempPool = mysql.createPool(tempConfig);
        const tempConnection = await tempPool.getConnection();
        
        // Create database if it doesn't exist (managed DBs may block this permission)
        try {
            await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        } catch (error) {
            if (['ER_DBACCESS_DENIED_ERROR', 'ER_ACCESS_DENIED_ERROR', 'ER_SPECIFIC_ACCESS_DENIED_ERROR'].includes(error.code)) {
                console.warn(`⚠️  Skipping CREATE DATABASE for managed DB user: ${error.code}`);
            } else {
                throw error;
            }
        }
        tempConnection.release();
        await tempPool.end();
        
	        // Now use the main pool with the database
	        const connection = await pool.getConnection();

	        // Multi-school support (used by Auth.login). Safe to run repeatedly.
	        await connection.execute(`
	            CREATE TABLE IF NOT EXISTS schools (
	                id INT PRIMARY KEY AUTO_INCREMENT,
	                school_code VARCHAR(20) UNIQUE NOT NULL,
	                name VARCHAR(255) NOT NULL,
	                is_active BOOLEAN DEFAULT TRUE,
	                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
	            )
	        `);
	        
	        // Create users table
	        await connection.execute(`
	            CREATE TABLE IF NOT EXISTS users (
	                id INT PRIMARY KEY AUTO_INCREMENT,
	                username VARCHAR(50) UNIQUE NOT NULL,
	                email VARCHAR(100) UNIQUE NOT NULL,
	                password VARCHAR(255) NOT NULL,
	                role ENUM('admin', 'teacher', 'parent', 'student') NOT NULL DEFAULT 'teacher',
	                first_name VARCHAR(50) NOT NULL,
	                last_name VARCHAR(255) NOT NULL,
	                firstName VARCHAR(255) NOT NULL,
	                lastName VARCHAR(255) NOT NULL,
	                phone VARCHAR(20),
                address TEXT,
                profile_image VARCHAR(255),
                qualification VARCHAR(255),
                experience VARCHAR(100),
                department VARCHAR(100),
                position VARCHAR(100),
                bio TEXT,
                employee_id VARCHAR(50),
                specialization VARCHAR(100),
                experience_years INT DEFAULT 0,
                joining_date DATE,
                subjects_taught JSON,
                classes_assigned JSON,
                salary DECIMAL(10,2) DEFAULT 5750000,
                status ENUM('active', 'inactive') DEFAULT 'active',
                is_active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP NULL,
                temp_password VARCHAR(255) NULL,
                must_change_password BOOLEAN DEFAULT FALSE,
                password_reset_at TIMESTAMP NULL,
                password_reset_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (password_reset_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        
        // Create OTP codes table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS otp_codes (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT,
                code VARCHAR(6) NOT NULL,
                type ENUM('login', 'password_reset', 'registration') NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Create classes table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS classes (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(10) NOT NULL UNIQUE,
                level INT NOT NULL,
                capacity INT DEFAULT 40,
                class_teacher_id INT,
                academic_year VARCHAR(9) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (class_teacher_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        
        // Create students table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS students (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT UNIQUE,
                student_id VARCHAR(20) UNIQUE NOT NULL,
                class_id INT,
                admission_number VARCHAR(20) UNIQUE,
                date_of_birth DATE NOT NULL,
                gender ENUM('Male', 'Female') NOT NULL,
                blood_group VARCHAR(5),
                nationality VARCHAR(50) DEFAULT 'Tanzanian',
                religion VARCHAR(50),
                admission_date DATE NOT NULL,
                graduation_date DATE NULL,
                year_of_study INT DEFAULT 2025,
                status ENUM('active', 'graduated', 'transferred', 'suspended') DEFAULT 'active',
                emergency_contact VARCHAR(20),
                medical_conditions TEXT,
                tutor_group VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
            )
        `);
        
        // Create subjects table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS subjects (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL UNIQUE,
                code VARCHAR(10) NOT NULL UNIQUE,
                description TEXT,
                department VARCHAR(50),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
	            )
	        `);

	        // Ensure users.role supports student accounts (used by student admission).
	        try {
	            await connection.execute(
	                `ALTER TABLE users MODIFY COLUMN role ENUM('admin','teacher','parent','student') NOT NULL DEFAULT 'teacher'`
	            );
	        } catch (error) {
	            // If we don't have permissions or the column differs in an incompatible way, surface it.
	            // Most environments should allow this; ignoring could cause runtime failures on student admission.
	            if (!['ER_TRUNCATED_WRONG_VALUE', 'ER_ACCESS_DENIED_ERROR'].includes(error.code)) {
	                // For other errors, keep initialization going but log for visibility.
	                console.warn('⚠️  Could not update users.role enum:', error.code, error.message);
	            } else {
	                throw error;
	            }
	        }

	        // Ensure users table has school_id for multi-school join queries.
	        try {
	            await connection.execute(`ALTER TABLE users ADD COLUMN school_id INT NULL`);
	        } catch (error) {
	            // Ignore if column already exists
	            if (error.code !== 'ER_DUP_FIELDNAME') {
	                throw error;
	            }
	        }

	        // Permission flag: allow non-admin users to access student admission when explicitly granted by admin.
	        try {
	            await connection.execute(`ALTER TABLE users ADD COLUMN can_student_admission BOOLEAN NOT NULL DEFAULT FALSE`);
	        } catch (error) {
	            if (error.code !== 'ER_DUP_FIELDNAME') {
	                throw error;
	            }
	        }

	        // Add FK if possible (ignore if already exists or cannot be created).
	        try {
	            await connection.execute(
	                `ALTER TABLE users ADD CONSTRAINT fk_users_school_id FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL`
	            );
	        } catch (error) {
	            // ER_DUP_KEYNAME / ER_CANT_CREATE_TABLE / ER_NO_REFERENCED_ROW_2 etc: ignore, schema still usable
	        }
	        
	        // Create teacher_profiles table for extended teacher information
	        await connection.execute(`
	            CREATE TABLE IF NOT EXISTS teacher_profiles (
	                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT UNIQUE,
                employee_id VARCHAR(20) UNIQUE,
                department VARCHAR(50),
                position VARCHAR(50),
                qualification VARCHAR(255),
                specialization VARCHAR(100),
                experience_years INT DEFAULT 0,
                joining_date DATE,
                salary DECIMAL(10,2),
                bio TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Create teacher_subject_assignments table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                teacher_id INT,
                subject_id INT,
                class_id INT,
                academic_year VARCHAR(9) NOT NULL,
                is_primary_teacher BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                UNIQUE KEY unique_assignment (teacher_id, subject_id, class_id, academic_year)
            )
        `);
        
        // Create supervisors/guardians table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS supervisors (
                id INT PRIMARY KEY AUTO_INCREMENT,
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                relationship ENUM('Father', 'Mother', 'Guardian', 'Uncle', 'Aunt', 'Grandparent', 'Other') NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100),
                address TEXT,
                occupation VARCHAR(100),
                workplace VARCHAR(100),
                is_primary_contact BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        // Create student_supervisors table for many-to-many relationship
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS student_supervisors (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id INT,
                supervisor_id INT,
                is_primary_supervisor BOOLEAN DEFAULT FALSE,
                emergency_contact BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (supervisor_id) REFERENCES supervisors(id) ON DELETE CASCADE,
                UNIQUE KEY unique_student_supervisor (student_id, supervisor_id)
            )
        `);
        
        // Create academic_years table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS academic_years (
                id INT PRIMARY KEY AUTO_INCREMENT,
                year_name VARCHAR(9) NOT NULL UNIQUE,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                is_current BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        // Create student_academic_history table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS student_academic_history (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id INT,
                academic_year VARCHAR(9) NOT NULL,
                class_id INT,
                previous_class_id INT NULL,
                enrollment_date DATE NOT NULL,
                completion_date DATE NULL,
                status ENUM('enrolled', 'promoted', 'repeated', 'transferred', 'dropped') DEFAULT 'enrolled',
                average_grade DECIMAL(4,2) NULL,
                position_in_class INT NULL,
                total_students_in_class INT NULL,
                remarks TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
                FOREIGN KEY (previous_class_id) REFERENCES classes(id) ON DELETE SET NULL,
                UNIQUE KEY unique_student_year (student_id, academic_year)
            )
        `);
        
        // Create student_financial_records table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS student_financial_records (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id INT,
                academic_year VARCHAR(9) NOT NULL,
                total_fees_required DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                total_fees_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                outstanding_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                last_payment_date DATE NULL,
                payment_plan ENUM('full', 'installments', 'scholarship') DEFAULT 'full',
                scholarship_percentage DECIMAL(5,2) DEFAULT 0.00,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                UNIQUE KEY unique_student_financial_year (student_id, academic_year)
            )
        `);
        
        // Create fee_payments table with simplified structure for frontend compatibility
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS fee_payments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                payment_date DATE NOT NULL,
                term VARCHAR(20) NOT NULL,
                status ENUM('Paid', 'Pending', 'Overdue') DEFAULT 'Paid',
                payment_method ENUM('cash', 'bank_transfer', 'mobile_money', 'cheque') DEFAULT 'cash',
                reference_number VARCHAR(50) NULL,
                receipt_number VARCHAR(50) NULL,
                academic_year VARCHAR(9) DEFAULT '2024-2025',
                payment_for ENUM('tuition', 'registration', 'examination', 'activities', 'transport', 'uniform', 'other') DEFAULT 'tuition',
                notes TEXT NULL,
                recorded_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // Create school_contribution_payments table (food, guards, etc.)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS school_contribution_payments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id INT NOT NULL,
                category ENUM('food', 'guards', 'emergency', 'graduation', 'sports_trips', 'fare', 'condolence') NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                payment_date DATE NOT NULL,
                status ENUM('Paid', 'Pending', 'Overdue') DEFAULT 'Paid',
                payment_method ENUM('cash', 'bank_transfer', 'mobile_money', 'cheque', 'paypal') DEFAULT 'cash',
                reference_number VARCHAR(50) NULL,
                receipt_number VARCHAR(50) NULL,
                academic_year VARCHAR(9) DEFAULT '2024-2025',
                notes TEXT NULL,
                recorded_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_contrib_student_year (student_id, academic_year),
                INDEX idx_contrib_category_year (category, academic_year)
            )
        `);

        // Create student_pocket_money ledger (deposit/withdraw) and compute balance on demand
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS student_pocket_money (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id INT NOT NULL,
                txn_type ENUM('deposit', 'withdrawal') NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                txn_date DATE NOT NULL,
                payment_method ENUM('cash', 'bank_transfer', 'mobile_money', 'cheque', 'paypal') DEFAULT 'cash',
                reference_number VARCHAR(50) NULL,
                academic_year VARCHAR(9) DEFAULT '2024-2025',
                notes TEXT NULL,
                recorded_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_pocket_student_year (student_id, academic_year),
                INDEX idx_pocket_txn_date (txn_date)
            )
        `);
        
        // Create student_documents table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS student_documents (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id INT,
                document_type ENUM('birth_certificate', 'medical_report', 'transfer_letter', 'photo', 'parent_id', 'other') NOT NULL,
                document_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NULL,
                uploaded_date DATE NOT NULL,
                uploaded_by INT,
                file_size INT NULL,
                mime_type VARCHAR(100) NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                verified_by INT NULL,
                verification_date DATE NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        
        // Insert default admin user if not exists
        const [adminExists] = await connection.execute(
            'SELECT id FROM users WHERE username = ? LIMIT 1',
            ['admin']
        );
        
        if (adminExists.length === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            await connection.execute(`
                INSERT INTO users (username, email, password, role, first_name, last_name, firstName, lastName, phone, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'admin',
                'admin@ubunifusec.com',
                hashedPassword,
                'admin',
                'System',
                'Administrator',
                'System',
                'Administrator',
                '+255123456789',
                true
            ]);
            
            console.log('✅ Default admin user created (username: admin, password: admin123)');
        }
        
        // Insert sample classes if not exist
        const [classExists] = await connection.execute('SELECT id FROM classes LIMIT 1');
        if (classExists.length === 0) {
            const classes = [
                // Form 1 classes
                ['Form 1A', 1, '2024-2025'],
                ['Form 1B', 1, '2024-2025'],
                ['Form 1C', 1, '2024-2025'],
                ['Form 1D', 1, '2024-2025'],
                
                // Form 2 classes
                ['Form 2A', 2, '2024-2025'],
                ['Form 2B', 2, '2024-2025'],
                ['Form 2C', 2, '2024-2025'],
                ['Form 2D', 2, '2024-2025'],
                
                // Form 3 classes
                ['Form 3A', 3, '2024-2025'],
                ['Form 3B', 3, '2024-2025'],
                ['Form 3C', 3, '2024-2025'],
                ['Form 3D', 3, '2024-2025'],
                
                // Form 4 classes
                ['Form 4A', 4, '2024-2025'],
                ['Form 4B', 4, '2024-2025'],
                ['Form 4C', 4, '2024-2025'],
                ['Form 4D', 4, '2024-2025']
            ];
            
            for (const [name, level, year] of classes) {
                await connection.execute(
                    'INSERT INTO classes (name, level, academic_year) VALUES (?, ?, ?)',
                    [name, level, year]
                );
            }
            
            console.log('✅ Sample classes created (Form 1-4 with subdivisions A-D)');
        }
        
        // Insert sample subjects if not exist
        const [subjectExists] = await connection.execute('SELECT id FROM subjects LIMIT 1');
        if (subjectExists.length === 0) {
            const subjects = [
                ['Mathematics', 'MATH', 'Mathematics and Statistics', 'Science Department'],
                ['Physics', 'PHYS', 'Physics and Applied Mathematics', 'Science Department'],
                ['Chemistry', 'CHEM', 'Chemistry and Laboratory Sciences', 'Science Department'],
                ['Biology', 'BIO', 'Biology and Life Sciences', 'Science Department'],
                ['English', 'ENG', 'English Language and Literature', 'Arts Department'],
                ['Kiswahili', 'KIS', 'Kiswahili Language and Literature', 'Arts Department'],
                ['History', 'HIST', 'History and Government', 'Arts Department'],
                ['Geography', 'GEO', 'Geography and Environmental Studies', 'Arts Department'],
                ['Computer Science', 'CS', 'Computer Studies and ICT', 'Technical Department'],
                ['Business Studies', 'BUS', 'Business Studies and Entrepreneurship', 'Commercial Department'],
                ['Book Keeping', 'BK', 'Book Keeping and Accounting', 'Commercial Department'],
                ['Physical Education', 'PE', 'Physical Education and Sports', 'General Department']
            ];
            
            for (const [name, code, description, department] of subjects) {
                await connection.execute(
                    'INSERT INTO subjects (name, code, description, department) VALUES (?, ?, ?, ?)',
                    [name, code, description, department]
                );
            }
            
            console.log('✅ Sample subjects created');
        }
        
        // Create attendance table with dual session support
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS attendance (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id INT,
                class_id INT,
                date DATE NOT NULL,
                session ENUM('morning', 'afternoon') NOT NULL,
                status ENUM('present', 'absent', 'late', 'excused') NOT NULL DEFAULT 'present',
                notes TEXT,
                marked_by INT,
                marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_editable BOOLEAN DEFAULT TRUE,
                admin_locked BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
                UNIQUE KEY unique_student_date_session (student_id, date, session)
            )
        `);
        
        // Create attendance alerts table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS attendance_alerts (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id INT,
                class_id INT,
                alert_type ENUM('consecutive_absence', 'frequent_lateness', 'pattern_concern') NOT NULL,
                alert_message TEXT NOT NULL,
                alert_data JSON,
                is_resolved BOOLEAN DEFAULT FALSE,
                resolved_by INT,
                resolved_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // Create subject_attendance table (per-subject/period attendance)
        // NOTE: This does not replace session attendance; it complements it.
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS subject_attendance (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id INT NOT NULL,
                class_id INT NOT NULL,
                subject_id INT NOT NULL,
                date DATE NOT NULL,
                period_label VARCHAR(50) NOT NULL,
                start_time TIME NULL,
                end_time TIME NULL,
                status ENUM('present', 'absent', 'late', 'excused') NOT NULL DEFAULT 'present',
                notes TEXT NULL,
                marked_by INT NULL,
                marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
                UNIQUE KEY uniq_subject_att (student_id, subject_id, date, period_label),
                INDEX idx_subject_date (class_id, subject_id, date)
            )
        `);

        // Create staff_attendance table (teacher/staff check-in/out)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS staff_attendance (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                date DATE NOT NULL,
                session ENUM('morning', 'afternoon') NOT NULL,
                status ENUM('present', 'late', 'absent') NOT NULL DEFAULT 'present',
                check_in_at TIMESTAMP NULL,
                check_out_at TIMESTAMP NULL,
                notes TEXT NULL,
                ip_address VARCHAR(64) NULL,
                user_agent VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY uniq_staff_date_session (user_id, date, session),
                INDEX idx_staff_date (date, session, status)
            )
        `);

        // Create discipline incidents tables
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS discipline_incidents (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id INT NOT NULL,
                class_id INT NULL,
                occurred_at TIMESTAMP NOT NULL,
                category VARCHAR(80) NOT NULL,
                severity ENUM('minor', 'moderate', 'severe') NOT NULL DEFAULT 'minor',
                description TEXT NOT NULL,
                witnesses TEXT NULL,
                status ENUM('open', 'under_review', 'resolved') NOT NULL DEFAULT 'open',
                reported_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
                FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_incident_student (student_id, occurred_at),
                INDEX idx_incident_class (class_id, occurred_at),
                INDEX idx_incident_status (status, severity)
            )
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS discipline_actions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                incident_id INT NOT NULL,
                action_type VARCHAR(80) NOT NULL,
                action_notes TEXT NULL,
                action_by INT NULL,
                action_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (incident_id) REFERENCES discipline_incidents(id) ON DELETE CASCADE,
                FOREIGN KEY (action_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_action_incident (incident_id, action_at)
            )
        `);

        // Targeted in-app notifications (not announcements)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_notifications (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NULL,
                student_id INT NULL,
                type ENUM('attendance','fee','exam','discipline','system') NOT NULL DEFAULT 'system',
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
                data JSON NULL,
                is_read BOOLEAN DEFAULT FALSE,
                read_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                INDEX idx_user_unread (user_id, is_read, created_at),
                INDEX idx_student_unread (student_id, is_read, created_at),
                INDEX idx_user_type (user_id, type, created_at),
                INDEX idx_student_type (student_id, type, created_at)
            )
        `);
        
        // Create assignments table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS assignments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                class_id INT,
                teacher_id INT,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                due_date DATE,
                max_points INT DEFAULT 100,
                assignment_type ENUM('homework', 'project', 'quiz', 'exam', 'other') DEFAULT 'homework',
                status ENUM('draft', 'published', 'closed') DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Create assignment submissions table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS assignment_submissions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                assignment_id INT,
                student_id INT,
                submission_text TEXT,
                file_path VARCHAR(500),
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                points_earned INT,
                feedback TEXT,
                graded_by INT,
                graded_at TIMESTAMP NULL,
                status ENUM('submitted', 'graded', 'late', 'missing') DEFAULT 'submitted',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
                UNIQUE KEY unique_assignment_student (assignment_id, student_id)
            )
        `);
        
        // Create enhanced announcements table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS announcements (
                id INT PRIMARY KEY AUTO_INCREMENT,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
                target_audience ENUM('all', 'students', 'teachers', 'parents', 'specific_class') DEFAULT 'all',
                class_id INT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                expires_at TIMESTAMP NULL,
                created_by INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_priority (priority),
                INDEX idx_target_audience (target_audience),
                INDEX idx_active_expires (is_active, expires_at),
                INDEX idx_created_at (created_at)
            )
        `);
        
        // Create announcement_reads table for tracking read status
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS announcement_reads (
                id INT PRIMARY KEY AUTO_INCREMENT,
                announcement_id INT NOT NULL,
                user_id INT NOT NULL,
                read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_announcement_user (announcement_id, user_id),
                INDEX idx_user_read (user_id, read_at)
            )
        `);
        
        // Create timetable table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS timetable (
                id INT PRIMARY KEY AUTO_INCREMENT,
                class_id INT,
                subject_id INT,
                teacher_id INT,
                day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
                period_number INT NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                room VARCHAR(50),
                academic_year VARCHAR(9) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_class_day_period (class_id, day_of_week, period_number, academic_year)
            )
        `);

        // Create teaching materials table for subject resources
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS teaching_materials (
                id INT PRIMARY KEY AUTO_INCREMENT,
                school_id INT NULL,
                teacher_id INT NOT NULL,
                uploaded_by INT NULL,
                subject_id INT,
                class_id INT,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                file_name VARCHAR(255) NOT NULL,
                original_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NULL,
                object_key VARCHAR(700) NULL,
                file_url VARCHAR(1024) NULL,
                file_type VARCHAR(100) NOT NULL,
                file_size INT NOT NULL,
                size_bytes BIGINT NULL,
                mime_type VARCHAR(100) NOT NULL,
                category ENUM('lesson_plan', 'teaching_material', 'syllabus', 'worksheet', 'assessment', 'other') DEFAULT 'teaching_material',
                class_level INT,
                is_public BOOLEAN DEFAULT FALSE,
                visibility_scope ENUM('private', 'school', 'public') DEFAULT 'private',
                access_role VARCHAR(50) DEFAULT 'teacher',
                upload_status ENUM('pending', 'ready', 'failed') DEFAULT 'ready',
                storage_provider ENUM('local', 'r2') DEFAULT 'local',
                download_count INT DEFAULT 0,
                tags JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
                INDEX idx_teacher_subject (teacher_id, subject_id),
                INDEX idx_category_level (category, class_level),
                INDEX idx_materials_school_visibility (school_id, visibility_scope),
                INDEX idx_materials_object_key (object_key(255))
            )
        `);

        // Keep the legacy table backward compatible while enabling R2 metadata storage.
        const teachingMaterialColumns = [
            [`ALTER TABLE teaching_materials ADD COLUMN school_id INT NULL`, 'ER_DUP_FIELDNAME'],
            [`ALTER TABLE teaching_materials ADD COLUMN uploaded_by INT NULL`, 'ER_DUP_FIELDNAME'],
            [`ALTER TABLE teaching_materials ADD COLUMN class_id INT NULL`, 'ER_DUP_FIELDNAME'],
            [`ALTER TABLE teaching_materials MODIFY COLUMN file_path VARCHAR(500) NULL`, 'ER_BAD_NULL_ERROR'],
            [`ALTER TABLE teaching_materials ADD COLUMN object_key VARCHAR(700) NULL`, 'ER_DUP_FIELDNAME'],
            [`ALTER TABLE teaching_materials ADD COLUMN file_url VARCHAR(1024) NULL`, 'ER_DUP_FIELDNAME'],
            [`ALTER TABLE teaching_materials ADD COLUMN size_bytes BIGINT NULL`, 'ER_DUP_FIELDNAME'],
            [`ALTER TABLE teaching_materials ADD COLUMN visibility_scope ENUM('private', 'school', 'public') DEFAULT 'private'`, 'ER_DUP_FIELDNAME'],
            [`ALTER TABLE teaching_materials ADD COLUMN access_role VARCHAR(50) DEFAULT 'teacher'`, 'ER_DUP_FIELDNAME'],
            [`ALTER TABLE teaching_materials ADD COLUMN upload_status ENUM('pending', 'ready', 'failed') DEFAULT 'ready'`, 'ER_DUP_FIELDNAME'],
            [`ALTER TABLE teaching_materials ADD COLUMN storage_provider ENUM('local', 'r2') DEFAULT 'local'`, 'ER_DUP_FIELDNAME']
        ];

        for (const [sql, duplicateCode] of teachingMaterialColumns) {
            try {
                await connection.execute(sql);
            } catch (error) {
                if (!duplicateCode || error.code !== duplicateCode) {
                    console.warn(`⚠️  teaching_materials schema update skipped: ${error.code || error.message}`);
                }
            }
        }

        try {
            await connection.execute(`ALTER TABLE teaching_materials ADD CONSTRAINT fk_teaching_materials_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL`);
        } catch (error) {
            if (!['ER_DUP_KEYNAME', 'ER_FK_DUP_NAME', 'ER_CANT_CREATE_TABLE'].includes(error.code)) {
                console.warn(`⚠️  teaching_materials school FK skipped: ${error.code || error.message}`);
            }
        }

        try {
            await connection.execute(`ALTER TABLE teaching_materials ADD CONSTRAINT fk_teaching_materials_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL`);
        } catch (error) {
            if (!['ER_DUP_KEYNAME', 'ER_FK_DUP_NAME', 'ER_CANT_CREATE_TABLE'].includes(error.code)) {
                console.warn(`⚠️  teaching_materials uploaded_by FK skipped: ${error.code || error.message}`);
            }
        }

        try {
            await connection.execute(`ALTER TABLE teaching_materials ADD CONSTRAINT fk_teaching_materials_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL`);
        } catch (error) {
            if (!['ER_DUP_KEYNAME', 'ER_FK_DUP_NAME', 'ER_CANT_CREATE_TABLE'].includes(error.code)) {
                console.warn(`⚠️  teaching_materials class FK skipped: ${error.code || error.message}`);
            }
        }
        
        // Create curriculum topics table for subject progress tracking
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS curriculum_topics (
                id INT PRIMARY KEY AUTO_INCREMENT,
                subject_id INT NOT NULL,
                teacher_id INT NOT NULL,
                class_id INT,
                topic_title VARCHAR(255) NOT NULL,
                topic_description TEXT,
                estimated_hours DECIMAL(4,2) DEFAULT 1.0,
                difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate',
                prerequisites JSON,
                learning_objectives TEXT,
                resources_needed TEXT,
                assessment_methods TEXT,
                order_index INT DEFAULT 0,
                is_mandatory BOOLEAN DEFAULT TRUE,
                academic_year VARCHAR(9) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
                INDEX idx_subject_class (subject_id, class_id),
                INDEX idx_teacher_year (teacher_id, academic_year)
            )
        `);
        
        // Create topic progress table for tracking completion
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS topic_progress (
                id INT PRIMARY KEY AUTO_INCREMENT,
                topic_id INT NOT NULL,
                teacher_id INT NOT NULL,
                class_id INT,
                status ENUM('pending', 'in_progress', 'completed', 'skipped') DEFAULT 'pending',
                start_date DATE,
                completion_date DATE,
                actual_hours DECIMAL(4,2),
                notes TEXT,
                student_feedback TEXT,
                assessment_score DECIMAL(5,2),
                challenges_faced TEXT,
                improvements_needed TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (topic_id) REFERENCES curriculum_topics(id) ON DELETE CASCADE,
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
                UNIQUE KEY unique_topic_teacher_class (topic_id, teacher_id, class_id),
                INDEX idx_status_date (status, completion_date)
            )
        `);
        
        // Create subject statistics table for performance tracking
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS subject_statistics (
                id INT PRIMARY KEY AUTO_INCREMENT,
                teacher_id INT NOT NULL,
                subject_id INT NOT NULL,
                class_id INT,
                academic_year VARCHAR(9) NOT NULL,
                total_topics INT DEFAULT 0,
                completed_topics INT DEFAULT 0,
                pending_topics INT DEFAULT 0,
                total_materials INT DEFAULT 0,
                total_hours_planned DECIMAL(6,2) DEFAULT 0.0,
                total_hours_completed DECIMAL(6,2) DEFAULT 0.0,
                average_completion_rate DECIMAL(5,2) DEFAULT 0.0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
                UNIQUE KEY unique_teacher_subject_class_year (teacher_id, subject_id, class_id, academic_year),
                INDEX idx_teacher_year (teacher_id, academic_year)
            )
        `);
        
        // Create material access logs for tracking usage
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS material_access_logs (
                id INT PRIMARY KEY AUTO_INCREMENT,
                material_id INT NOT NULL,
                accessed_by INT NOT NULL,
                access_type ENUM('view', 'download', 'share') NOT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (material_id) REFERENCES teaching_materials(id) ON DELETE CASCADE,
                FOREIGN KEY (accessed_by) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_material_date (material_id, created_at),
                INDEX idx_user_date (accessed_by, created_at)
            )
        `);
        
        // Create assessments table for teacher examinations
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS assessments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                teacher_id INT NOT NULL,
                class_id INT NOT NULL,
                subject_id INT NOT NULL,
                assessment_name VARCHAR(255) NOT NULL,
                exam_type ENUM('quiz', 'test', 'assignment', 'project', 'homework', 'mid-term exams', 'terminal exams', 'annual exams', 'mock exams', 'practical', 'oral', 'presentation', 'lab_work', 'field_work', 'research', 'other') NOT NULL,
                academic_year VARCHAR(9) NOT NULL,
                assessment_date DATE NOT NULL,
                max_marks INT DEFAULT 100,
                pass_marks INT DEFAULT 40,
                total_marks INT DEFAULT 100,
                description TEXT,
                duration_minutes INT DEFAULT 120,
                status ENUM('draft', 'published', 'completed', 'closed') DEFAULT 'draft',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                INDEX idx_teacher_class_subject (teacher_id, class_id, subject_id),
                INDEX idx_academic_year (academic_year),
                INDEX idx_exam_type (exam_type),
                INDEX idx_assessment_date (assessment_date)
            )
        `);
        
        // Create assessment_marks table for individual student marks
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS assessment_marks (
                id INT PRIMARY KEY AUTO_INCREMENT,
                assessment_id INT NOT NULL,
                student_id INT NOT NULL,
                marks_obtained DECIMAL(5,2) DEFAULT 0.00,
                grade VARCHAR(2),
                remarks TEXT,
                is_present BOOLEAN DEFAULT TRUE,
                marked_by INT NOT NULL,
                marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_assessment_student (assessment_id, student_id),
                INDEX idx_assessment_marks (assessment_id),
                INDEX idx_student_marks (student_id),
                INDEX idx_grade (grade)
            )
        `);
        
        // Insert sample academic years if not exist
        const [yearExists] = await connection.execute('SELECT id FROM academic_years LIMIT 1');
        if (yearExists.length === 0) {
            const academicYears = [
                ['2023-2024', '2023-09-01', '2024-06-30', false, true],
                ['2024-2025', '2024-09-01', '2025-06-30', true, true],
                ['2025-2026', '2025-09-01', '2026-06-30', false, true]
            ];
            
            for (const [yearName, startDate, endDate, isCurrent, isActive] of academicYears) {
                await connection.execute(
                    'INSERT INTO academic_years (year_name, start_date, end_date, is_current, is_active) VALUES (?, ?, ?, ?, ?)',
                    [yearName, startDate, endDate, isCurrent, isActive]
                );
            }
            
            console.log('✅ Sample academic years created');
        }
        
        // Insert sample teacher and subject assignments if they don't exist
        const [teacherExists] = await connection.execute(
            'SELECT id FROM users WHERE role = ? LIMIT 1',
            ['teacher']
        );
        
        if (teacherExists.length === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('teacher123', 12);
            
            // Insert sample teacher
            const [teacherResult] = await connection.execute(`
                INSERT INTO users (username, email, password, role, first_name, last_name, firstName, lastName, phone, department, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'teacher1',
                'teacher1@ubunifusec.com',
                hashedPassword,
                'teacher',
                'John',
                'Mwalimu',
                'John',
                'Mwalimu',
                '+255123456780',
                'Science Department',
                true
            ]);
            
            const teacherId = teacherResult.insertId;
            
            // Assign subjects to teacher
            const subjectAssignments = [
                [teacherId, 1, 1, '2024-2025', true], // Mathematics to Form 1A
                [teacherId, 1, 2, '2024-2025', false], // Mathematics to Form 1B
                [teacherId, 2, 9, '2024-2025', true], // Physics to Form 3A
                [teacherId, 2, 10, '2024-2025', false], // Physics to Form 3B
            ];
            
            for (const [tId, sId, cId, year, isPrimary] of subjectAssignments) {
                await connection.execute(
                    'INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id, academic_year, is_primary_teacher) VALUES (?, ?, ?, ?, ?)',
                    [tId, sId, cId, year, isPrimary]
                );
            }
            
            // Insert sample curriculum topics
            const topics = [
                [1, teacherId, 1, 'Introduction to Algebra', 'Basic algebraic concepts and operations', 3.0, 'beginner', null, 'Understand basic algebraic expressions and equations', 'Textbook, calculator', 'Quiz and homework', 1, true, '2024-2025'],
                [1, teacherId, 1, 'Linear Equations', 'Solving linear equations in one and two variables', 4.0, 'intermediate', '["Introduction to Algebra"]', 'Solve linear equations and systems', 'Textbook, graphing paper', 'Test and assignments', 2, true, '2024-2025'],
                [1, teacherId, 1, 'Quadratic Equations', 'Quadratic equations and their solutions', 5.0, 'intermediate', '["Linear Equations"]', 'Solve quadratic equations using various methods', 'Textbook, calculator', 'Exam and projects', 3, true, '2024-2025'],
                [2, teacherId, 9, 'Mechanics Fundamentals', 'Basic concepts of motion and forces', 4.0, 'beginner', null, 'Understand Newton\'s laws of motion', 'Lab equipment, textbook', 'Lab reports and tests', 1, true, '2024-2025'],
                [2, teacherId, 9, 'Energy and Work', 'Concepts of kinetic and potential energy', 3.5, 'intermediate', '["Mechanics Fundamentals"]', 'Calculate work and energy in physical systems', 'Lab equipment, calculator', 'Lab work and quiz', 2, true, '2024-2025'],
            ];
            
            for (const [subjectId, tId, cId, title, desc, hours, level, prereq, objectives, resources, assessment, orderIdx, mandatory, year] of topics) {
                await connection.execute(
                    'INSERT INTO curriculum_topics (subject_id, teacher_id, class_id, topic_title, topic_description, estimated_hours, difficulty_level, prerequisites, learning_objectives, resources_needed, assessment_methods, order_index, is_mandatory, academic_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [subjectId, tId, cId, title, desc, hours, level, prereq, objectives, resources, assessment, orderIdx, mandatory, year]
                );
            }
            
            console.log('✅ Sample teacher and curriculum data created');
        }
        
        // Note: Students are managed as records only, not user accounts
        // Sample student records would be created through teacher management interfaces
        
        connection.release();
        
        // Initialize grades management schema
        const { initializeGradesSchema } = require('./grades-schema');
        await initializeGradesSchema();
        
        console.log('✅ Database initialized successfully');
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
};

module.exports = {
    pool,
    testConnection,
    initializeDatabase
};
