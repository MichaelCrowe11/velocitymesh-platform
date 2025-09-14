#!/usr/bin/env node
/**
 * VelocityMesh Development Environment Test Script
 * Tests that all core services are running and accessible
 */

const { Client } = require('pg');
const Redis = require('ioredis');
const axios = require('axios');

// Test configurations
const POSTGRES_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'velocitymesh',
  user: 'velocitymesh',
  password: 'password',
};

const REDIS_CONFIG = {
  host: 'localhost',
  port: 6379,
};

async function testPostgreSQL() {
  console.log('🔍 Testing PostgreSQL connection...');
  
  const client = new Client(POSTGRES_CONFIG);
  
  try {
    await client.connect();
    const result = await client.query('SELECT version()');
    console.log('✅ PostgreSQL connected successfully');
    console.log(`   Version: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
    
    // Test database creation
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query('INSERT INTO test_table DEFAULT VALUES');
    const testResult = await client.query('SELECT COUNT(*) FROM test_table');
    console.log(`   Test records: ${testResult.rows[0].count}`);
    
    await client.query('DROP TABLE IF EXISTS test_table');
    await client.end();
    
    return true;
  } catch (error) {
    console.log('❌ PostgreSQL connection failed:', error.message);
    return false;
  }
}

async function testRedis() {
  console.log('🔍 Testing Redis connection...');
  
  const redis = new Redis(REDIS_CONFIG);
  
  try {
    const pong = await redis.ping();
    console.log('✅ Redis connected successfully');
    console.log(`   Response: ${pong}`);
    
    // Test basic operations
    await redis.set('velocitymesh:test', 'hello world', 'EX', 10);
    const value = await redis.get('velocitymesh:test');
    console.log(`   Test value: ${value}`);
    
    await redis.del('velocitymesh:test');
    redis.disconnect();
    
    return true;
  } catch (error) {
    console.log('❌ Redis connection failed:', error.message);
    return false;
  }
}

async function testHTTPEndpoints() {
  console.log('🔍 Testing HTTP endpoints...');
  
  const endpoints = [
    { name: 'Frontend Dev Server', url: 'http://localhost:3000', expected: 'React App' },
    { name: 'Backend API', url: 'http://localhost:3001/health', expected: 'healthy' },
    { name: 'AI Engine', url: 'http://localhost:8000/health', expected: 'healthy' },
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint.url, { timeout: 5000 });
      
      if (response.status === 200) {
        console.log(`✅ ${endpoint.name} is running`);
        console.log(`   Status: ${response.status}`);
        results.push(true);
      } else {
        console.log(`⚠️  ${endpoint.name} returned status ${response.status}`);
        results.push(false);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name} is not accessible: ${error.message}`);
      results.push(false);
    }
  }
  
  return results.every(r => r);
}

async function checkDockerServices() {
  console.log('🔍 Checking Docker services...');
  
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  
  try {
    const { stdout } = await execAsync('docker-compose ps --format json');
    const services = stdout.trim().split('\n').map(line => JSON.parse(line));
    
    console.log('📋 Docker Services Status:');
    services.forEach(service => {
      const status = service.State === 'running' ? '✅' : '❌';
      console.log(`   ${status} ${service.Service}: ${service.State}`);
    });
    
    return services.every(s => s.State === 'running');
  } catch (error) {
    console.log('❌ Failed to check Docker services:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 VelocityMesh Development Environment Test');
  console.log('============================================\n');
  
  const tests = [
    { name: 'Docker Services', test: checkDockerServices },
    { name: 'PostgreSQL Database', test: testPostgreSQL },
    { name: 'Redis Cache', test: testRedis },
    { name: 'HTTP Endpoints', test: testHTTPEndpoints },
  ];
  
  const results = [];
  
  for (const { name, test } of tests) {
    console.log(`\n📝 Running ${name} test...`);
    const result = await test();
    results.push({ name, passed: result });
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(({ name, passed }) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! VelocityMesh development environment is ready!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run dev (starts all development servers)');
    console.log('2. Open: http://localhost:3000 (VelocityMesh frontend)');
    console.log('3. API docs: http://localhost:3001/docs (when backend is running)');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please check the errors above and fix them.');
    console.log('\nTroubleshooting:');
    console.log('1. Make sure Docker is running');
    console.log('2. Run: docker-compose up -d postgres redis');
    console.log('3. Check if ports 3000, 3001, 8000 are available');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testPostgreSQL,
  testRedis,
  testHTTPEndpoints,
  checkDockerServices,
};