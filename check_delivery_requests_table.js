import { query, pool } from './api/config/db.js';

async function checkTable() {
  try {
    // Test connection
    const connectionTest = await pool.query('SELECT current_database(), current_user');
    console.log('Connected to database:', connectionTest.rows[0].current_database);
    console.log('Connected as user:', connectionTest.rows[0].current_user);
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT 
        table_schema,
        table_name,
        table_type
      FROM information_schema.tables 
      WHERE table_name = 'delivery_requests';
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ Table delivery_requests does NOT exist');
    } else {
      console.log('✅ Table delivery_requests exists:');
      tableCheck.rows.forEach(row => {
        console.log(`   Schema: ${row.table_schema}, Name: ${row.table_name}, Type: ${row.table_type}`);
      });
      
      // Check table structure
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'delivery_requests'
        ORDER BY ordinal_position;
      `);
      
      console.log('\nTable columns:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
    }
    
    // Try a simple query
    try {
      const testQuery = await pool.query('SELECT COUNT(*) as count FROM delivery_requests');
      console.log(`\n✅ Can query table. Current row count: ${testQuery.rows[0].count}`);
    } catch (err) {
      console.log(`\n❌ Cannot query table: ${err.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkTable();

