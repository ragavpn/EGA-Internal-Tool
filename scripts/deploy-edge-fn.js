#!/usr/bin/env node
/*
  deploy-edge-fn.js
  - Reads EDGE_FN_NAME env var from .env file
  - Uses Supabase CLI to create a new edge function
  - Copies the server function source code to the function directory
  - Deploys the function to Supabase

  Requirements: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment OR be logged in via supabase CLI.
*/

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const EDGE_FN = (process.env.EDGE_FN_NAME || 'edge-function').replace(/^\//, '').trim();
const PROJECT_REF = process.env.VITE_SUPABASE_PROJECT_ID || '';
const SRC_DIR = path.join(__dirname, '..', 'src', 'supabase', 'functions', 'server');
const DST_DIR = path.join(__dirname, '..', 'supabase', 'functions', EDGE_FN);

function fail(msg) {
    console.error(msg);
    process.exit(1);
}

function runCommand(command, args, description, allowFailure = false) {
    console.log(`${description}...`);
    const result = spawnSync(command, args, { stdio: 'pipe', shell: false, env: process.env });

    if (result.error) {
        console.error(`Failed to run ${command}:`, result.error);
        if (!allowFailure) process.exit(1);
        return result;
    }

    if (result.status !== 0) {
        const stderr = result.stderr?.toString() || '';
        const stdout = result.stdout?.toString() || '';

        if (allowFailure) {
            console.log(`Command completed with non-zero exit code (${result.status}), but continuing...`);
            if (stderr) console.log('Error output:', stderr.trim());
            if (stdout) console.log('Standard output:', stdout.trim());
            return result;
        }

        console.error(`${command} exited with code ${result.status}`);
        if (stderr) console.error('Error:', stderr.trim());
        if (stdout) console.error('Output:', stdout.trim());
        process.exit(result.status);
    }

    // Print stdout if command succeeded and we have output
    if (result.stdout) {
        const output = result.stdout.toString().trim();
        if (output) console.log(output);
    }

    return result;
}

if (!fs.existsSync(SRC_DIR)) {
    fail('Source function directory not found: ' + SRC_DIR);
}

if (!PROJECT_REF) {
    fail('VITE_SUPABASE_PROJECT_ID is required in .env file');
}

// Link project if not already linked
console.log('Ensuring project is linked...');
const linkResult = runCommand('npx', ['supabase', 'link', '--project-ref', PROJECT_REF], 'Linking to Supabase project', true);
if (linkResult.status !== 0) {
    const stderr = linkResult.stderr?.toString() || '';
    if (stderr.includes('already linked') || stderr.includes('Project linked')) {
        console.log('✓ Project is already linked');
    } else {
        console.log('Link command completed with warnings, continuing...');
    }
}

// Create function using Supabase CLI
console.log(`Creating edge function: ${EDGE_FN}`);
const createResult = runCommand('npx', ['supabase', 'functions', 'new', EDGE_FN], `Creating function ${EDGE_FN}`, true);
if (createResult.status !== 0) {
    const stderr = createResult.stderr?.toString() || '';
    const stdout = createResult.stdout?.toString() || '';

    if (stderr.includes('file exists') || stderr.includes('already exists') ||
        stdout.includes('already exists') || stderr.includes('Function') && stderr.includes('exists')) {
        console.log(`✓ Function ${EDGE_FN} already exists, skipping creation...`);
    } else {
        console.log('Function creation completed with warnings, continuing...');
        if (stderr.trim()) console.log('Warning:', stderr.trim());
    }
} else {
    console.log(`✓ Function ${EDGE_FN} created successfully`);
}

// Ensure destination directory exists
if (!fs.existsSync(DST_DIR)) {
    fs.mkdirSync(DST_DIR, { recursive: true });
}

// Copy source files to function directory
const srcIndex = path.join(SRC_DIR, 'index.tsx');
const srcKV = path.join(SRC_DIR, 'kv_store.tsx');
const dstIndex = path.join(DST_DIR, 'index.ts');
const dstKV = path.join(DST_DIR, 'kv_store.ts');

if (!fs.existsSync(srcIndex)) {
    fail('Missing source index.tsx: ' + srcIndex);
}

// Copy and convert index file
let indexContent = fs.readFileSync(srcIndex, 'utf8');
// Ensure imports are relative and use .ts extension for Deno
indexContent = indexContent.replace(/from '\.\/kv_store'/g, "from './kv_store.ts'");
// Remove type imports that won't work in Deno edge functions
indexContent = indexContent.replace(/import type.*from.*database\.types.*;\n?/g, '');
// Remove generic type annotations for Database
indexContent = indexContent.replace(/createClient<Database>\(/g, 'createClient(');
fs.writeFileSync(dstIndex, indexContent, 'utf8');
console.log('Copied function entry:', dstIndex);

// Copy KV store helper if it exists
if (fs.existsSync(srcKV)) {
    let kvContent = fs.readFileSync(srcKV, 'utf8');
    // Remove type imports that won't work in Deno edge functions
    kvContent = kvContent.replace(/import type.*from.*database\.types.*;\n?/g, '');
    // Remove generic type annotations for Database
    kvContent = kvContent.replace(/createClient<Database>\(/g, 'createClient(');
    fs.writeFileSync(dstKV, kvContent, 'utf8');
    console.log('Copied helper module:', dstKV);
}

// Deploy the function
console.log(`\nDeploying function ${EDGE_FN} to Supabase...`);
runCommand('npx', ['supabase', 'functions', 'deploy', EDGE_FN, '--project-ref', PROJECT_REF], `Deploying function ${EDGE_FN}`);

console.log('✅ Function deployed successfully!');
console.log(`\nFunction URL: https://${PROJECT_REF}.supabase.co/functions/v1/${EDGE_FN}`);
console.log(`Base path for API routes: /${EDGE_FN}`);
process.exit(0);
