#!/usr/bin/env node

/**
 * Phase 3 Migration Runner
 * Verifies Supabase schema is set up
 */

import dotenv from 'dotenv';
import postgres from 'postgres';

// Load environment variables
dotenv.config();

async function verifyMigrations() {
  const postgresUrl = process.env.POSTGRES_URL;

  if (!postgresUrl) {
    console.error('❌ POSTGRES_URL not set');
    process.exit(1);
  }

  console.log('🔗 Connecting to Supabase...');
  
  const sql = postgres(postgresUrl, {
    prepare: false,
    idle_timeout: 30,
    max_lifetime: 600,
  });

  try {
    console.log('✅ Database connection successful\n');
    
    // Verify tables exist
    console.log('📋 Verifying schema...');
    const tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    const tableNames = ['users', 'stop_losses', 'orders', 'transactions', 'price_history'];
    let allGood = true;
    
    for (const expectedTable of tableNames) {
      const exists = tables.some(t => t.table_name === expectedTable);
      const status = exists ? '✅' : '❌';
      console.log(`   ${status} ${expectedTable}`);
      if (!exists) allGood = false;
    }

    if (!allGood) {
      console.error('\n❌ Some tables are missing. Please run SQL migration manually.');
      process.exit(1);
    }

    // Check row counts
    console.log('\n📊 Row counts:');
    for (const table of tableNames) {
      const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   ${table}: ${result[0].count} rows`);
    }

    console.log('\n✅ All migrations verified!');
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    try {
      await sql.end();
    } catch (e) {
      // ignore
    }
    process.exit(1);
  }
}

verifyMigrations();
