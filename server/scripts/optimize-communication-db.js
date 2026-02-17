const { pool } = require('../config/database');
const logger = require('../utils/logger');

async function optimizeCommunicationDatabase() {
  const connection = await pool.getConnection();
  
  try {
    logger.info('🔧 Starting database optimization for communication module...');
    
    // List of indexes to create for better performance
    const indexes = [
      {
        name: 'idx_announcements_active_expires',
        table: 'announcements',
        columns: 'is_active, expires_at',
        description: 'Optimize filtering by active status and expiration'
      },
      {
        name: 'idx_announcements_created_updated',
        table: 'announcements',
        columns: 'created_at, updated_at',
        description: 'Optimize timestamp-based filtering (since parameter)'
      },
      {
        name: 'idx_announcements_target_audience',
        table: 'announcements',
        columns: 'target_audience, class_id',
        description: 'Optimize filtering by target audience and class'
      },
      {
        name: 'idx_announcements_priority',
        table: 'announcements',
        columns: 'priority',
        description: 'Optimize sorting by priority'
      },
      {
        name: 'idx_announcement_reads_user_announcement',
        table: 'announcement_reads',
        columns: 'user_id, announcement_id',
        description: 'Optimize read status joins'
      },
      {
        name: 'idx_students_user_class',
        table: 'students',
        columns: 'user_id, class_id',
        description: 'Optimize class-based filtering for students'
      }
    ];

    // Check existing indexes first
    logger.info('📊 Checking existing indexes...');
    const [existingIndexes] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        INDEX_NAME,
        GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as COLUMNS
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('announcements', 'announcement_reads', 'students')
        AND INDEX_NAME != 'PRIMARY'
      GROUP BY TABLE_NAME, INDEX_NAME
      ORDER BY TABLE_NAME, INDEX_NAME
    `);

    const existingIndexMap = new Map();
    existingIndexes.forEach(idx => {
      existingIndexMap.set(`${idx.TABLE_NAME}.${idx.INDEX_NAME}`, idx.COLUMNS);
    });

    // Create missing indexes
    for (const idx of indexes) {
      const key = `${idx.table}.${idx.name}`;
      if (!existingIndexMap.has(key)) {
        try {
          logger.info(`➕ Creating index ${idx.name} on ${idx.table} (${idx.columns}) - ${idx.description}`);
          await connection.execute(`CREATE INDEX ${idx.name} ON ${idx.table} (${idx.columns})`);
        } catch (err) {
          // Ignore if already exists or other benign errors
          logger.warn(`⚠️  Could not create index ${idx.name}: ${err.message}`);
        }
      } else {
        logger.info(`✔️  Index ${idx.name} already exists on ${idx.table}`);
      }
    }

    logger.info('✅ Database optimization for communication module completed.');
  } catch (error) {
    logger.error('❌ Database optimization failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  optimizeCommunicationDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { optimizeCommunicationDatabase };
