#!/usr/bin/env node
/*
  init-db.js
  - Reads KV_TABLE_NAME env var from .env file
  - Uses Supabase CLI to create a new migration for the KV store table
  - Applies the migration to the database
  - Generates TypeScript types from the database schema

  Requirements: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment OR be logged in via supabase CLI.
*/

// Load local .env so VITE_ variables are available when running the scripts locally
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const KV_TABLE = (process.env.KV_TABLE_NAME || 'kv_store').trim();
const PROJECT_REF = process.env.VITE_SUPABASE_PROJECT_ID || '';

function fail(msg) {
    console.error(msg);
    process.exit(1);
}

function runCommand(command, args, description) {
    console.log(`${description}...`);
    const result = spawnSync(command, args, { stdio: 'inherit', shell: false, env: process.env });
    if (result.error) {
        console.error(`Failed to run ${command}:`, result.error);
        process.exit(1);
    }
    if (result.status !== 0) {
        console.error(`${command} exited with code ${result.status}`);
        process.exit(result.status);
    }
    return result;
}

if (!PROJECT_REF) {
    fail('VITE_SUPABASE_PROJECT_ID is required in .env file');
}

// Link project if not already linked
console.log('Ensuring project is linked...');
try {
    runCommand('npx', ['supabase', 'link', '--project-ref', PROJECT_REF], 'Linking to Supabase project');
} catch (e) {
    console.log('Project may already be linked, continuing...');
}

// Create new migration using Supabase CLI
const migrationName = `create_${KV_TABLE}`;
console.log(`Creating new migration: ${migrationName}`);
runCommand('npx', ['supabase', 'migration', 'new', migrationName], 'Creating migration file');

// Find the newly created migration file
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.includes(`_${migrationName}.sql`))
    .sort()
    .reverse(); // Get the most recent

if (migrationFiles.length === 0) {
    fail('Could not find created migration file');
}

const migrationFile = path.join(migrationsDir, migrationFiles[0]);
console.log('Found migration file:', migrationFile);

// Read the template and replace placeholders
const tplPath = path.join(__dirname, '..', 'supabase', 'migration_templates', 'template_create_kv.sql.tpl');
if (!fs.existsSync(tplPath)) {
    fail('Migration template not found: ' + tplPath);
}

const tpl = fs.readFileSync(tplPath, 'utf8');
const sql = tpl.replace(/{{KV_TABLE}}/g, KV_TABLE);

// Write the actual migration content
fs.writeFileSync(migrationFile, sql, 'utf8');
console.log('Updated migration file with KV store schema');

// Apply the migration
runCommand('npx', ['supabase', 'db', 'push'], 'Applying migration to database');

// Generate TypeScript types
const typesDir = path.join(__dirname, '..', 'src', 'types');
if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
}

const typesFile = path.join(typesDir, 'database.types.ts');
console.log('Generating TypeScript types...');
runCommand('npx', ['supabase', 'gen', 'types', 'typescript', '--project-id', PROJECT_REF], 'Generating database types');

// Capture the output and write to file
const typeGenResult = spawnSync('npx', ['supabase', 'gen', 'types', 'typescript', '--project-id', PROJECT_REF], {
    encoding: 'utf8',
    env: process.env
});

if (typeGenResult.error) {
    console.error('Failed to generate types:', typeGenResult.error);
    process.exit(1);
}

if (typeGenResult.status !== 0) {
    console.error('Type generation failed with code:', typeGenResult.status);
    console.error('stderr:', typeGenResult.stderr);
    process.exit(typeGenResult.status);
}

// Write the generated types to file
fs.writeFileSync(typesFile, typeGenResult.stdout, 'utf8');
console.log('Generated TypeScript types:', typesFile);

console.log('Database initialization completed successfully.');
process.exit(0);
