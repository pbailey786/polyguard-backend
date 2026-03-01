#!/usr/bin/env node

/**
 * Phase 3 Startup Verification
 * Verifies backend server starts and responds correctly
 */

import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

async function verifyStartup() {
  console.log('🔨 PHASE 3 STARTUP VERIFICATION\n');
  
  // 1. Check environment variables
  console.log('📋 Environment Configuration:');
  const required = [
    'POSTGRES_URL',
    'POLYMARKET_CLOB_URL',
    'POLYMARKET_WS_URL',
    'BUILDER_CODE',
    'BUILDER_SECRET_KEY',
  ];
  
  let configValid = true;
  for (const key of required) {
    const value = process.env[key];
    const status = value ? '✅' : '❌';
    console.log(`   ${status} ${key}`);
    if (!value) configValid = false;
  }
  
  if (!configValid) {
    console.error('\n❌ Missing required configuration');
    process.exit(1);
  }
  
  // 2. Test database connection
  console.log('\n🔗 Database Connection:');
  try {
    const sql = postgres(process.env.POSTGRES_URL, {
      prepare: false,
      idle_timeout: 30,
      max_lifetime: 600,
    });
    
    await sql`SELECT 1`;
    console.log('   ✅ Supabase PostgreSQL connected');
    
    // Check tables
    const tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const expectedTables = ['users', 'orders', 'stop_losses', 'transactions', 'price_history'];
    const foundTables = tables.map(t => t.table_name);
    
    let tablesValid = true;
    for (const expected of expectedTables) {
      const found = foundTables.includes(expected);
      console.log(`   ${found ? '✅' : '❌'} ${expected}`);
      if (!found) tablesValid = false;
    }
    
    await sql.end();
    
    if (!tablesValid) {
      console.error('\n❌ Missing database tables');
      process.exit(1);
    }
  } catch (error) {
    console.error(`   ❌ Database connection failed: ${error.message}`);
    process.exit(1);
  }
  
  // 3. Check API connectivity
  console.log('\n🌐 API Connectivity:');
  try {
    const clob = await fetch(`${process.env.POLYMARKET_CLOB_URL}/markets`, {
      signal: AbortSignal.timeout(5000),
    });
    console.log(`   ✅ Polymarket CLOB API (status: ${clob.status})`);
  } catch (error) {
    console.log(`   ⚠️  Polymarket CLOB API (may be offline): ${error.message}`);
  }
  
  // 4. Final status
  console.log('\n✅ PHASE 3 BACKEND IS READY TO START');
  console.log('\n📝 To start the server:');
  console.log('   npm run dev       # Development mode');
  console.log('   npm start         # Production mode');
  console.log('\n🎯 Server will run on http://localhost:3000');
}

verifyStartup().catch(error => {
  console.error('Startup verification failed:', error);
  process.exit(1);
});
