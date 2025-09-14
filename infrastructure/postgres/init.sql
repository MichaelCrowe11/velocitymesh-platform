-- VelocityMesh Database Initialization Script

-- Create additional databases if needed
-- CREATE DATABASE velocitymesh_test;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS workflow;
CREATE SCHEMA IF NOT EXISTS analytics;

-- Initial setup complete
SELECT 'VelocityMesh database initialized successfully' AS status;
