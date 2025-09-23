#!/usr/bin/env node
// bootstrap.js - run DB init then function deploy
require('dotenv').config();
const { spawnSync } = require('child_process');
const path = require('path');
const os = require('os');

// Fix file permissions (needed on some systems for proper script execution)
function fixPermissions() {
    if (os.platform() !== 'win32') { // Skip on Windows
        console.log('Fixing file permissions...');
        const projectRoot = path.join(__dirname, '..');

        try {
            // Make scripts executable
            spawnSync('chmod', ['+x', 'scripts/init-db.js'], { cwd: projectRoot, stdio: 'pipe' });
            spawnSync('chmod', ['+x', 'scripts/deploy-edge-fn.js'], { cwd: projectRoot, stdio: 'pipe' });
            spawnSync('chmod', ['+x', 'scripts/bootstrap.js'], { cwd: projectRoot, stdio: 'pipe' });

            // Ensure proper ownership (only if not already owned by current user)
            const currentUser = process.env.USER || process.env.USERNAME;
            if (currentUser) {
                const result = spawnSync('find', ['.', '-not', '-user', currentUser], {
                    cwd: projectRoot,
                    stdio: 'pipe',
                    encoding: 'utf8'
                });

                if (result.stdout && result.stdout.trim()) {
                    console.log('Fixing file ownership...');
                    spawnSync('chown', ['-R', `${currentUser}:${currentUser}`, '.'], {
                        cwd: projectRoot,
                        stdio: 'pipe'
                    });
                }
            }

            console.log('✓ File permissions fixed');
        } catch (error) {
            console.log('Note: Could not fix permissions automatically. If you encounter permission errors, run:');
            console.log('  chmod -R +x scripts/');
            console.log('  chown -R $USER:$USER .');
        }
    }
}

// Fix permissions first
fixPermissions();

// Simple arg parsing: accept --project-ref or -p
const argv = process.argv.slice(2);
let projectRefArg = '';
for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--project-ref' || a === '-p') {
        projectRefArg = argv[i + 1] || '';
        i++;
    } else if (a.startsWith('--project-ref=')) {
        projectRefArg = a.split('=')[1];
    } else if (a.startsWith('-p=')) {
        projectRefArg = a.split('=')[1];
    }
}

if (projectRefArg) {
    console.log('Using provided project ref:', projectRefArg);
    process.env.SUPABASE_PROJECT_REF = projectRefArg;
    // Also set VITE var for child processes that expect it
    process.env.VITE_SUPABASE_PROJECT_ID = projectRefArg;
}
// Prefer VITE_SUPABASE_PROJECT_ID if present
if (process.env.VITE_SUPABASE_PROJECT_ID && !process.env.SUPABASE_PROJECT_REF) {
    process.env.SUPABASE_PROJECT_REF = process.env.VITE_SUPABASE_PROJECT_ID;
}

function run(cmd, args) {
    console.log('> ', cmd, args.join(' '));
    const r = spawnSync(cmd, args, { stdio: 'inherit', env: process.env });
    if (r.error) {
        console.error('Command failed:', r.error);
        process.exit(1);
    }
    if (r.status !== 0) {
        console.error('Command exited with code', r.status);
        process.exit(r.status);
    }
}

// Run init-db
run('node', ['scripts/init-db.js']);
// Then deploy edge function
run('node', ['scripts/deploy-edge-fn.js']);

console.log('Bootstrap completed successfully.');
