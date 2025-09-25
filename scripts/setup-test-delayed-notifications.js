#!/usr/bin/env node

// Simple script to add test devices and delayed checks for testing email notifications

const SUPABASE_URL = 'https://ksdrpfxuwavfwnccmrwr.supabase.co';
const EDGE_FN_NAME = 'make-server-354d5d14';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZHJwZnh1d2F2ZnduY2NtcndyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzkyMjI3MywiZXhwIjoyMDczNDk4MjczfQ.woK160AJy83h-u-Ev9LquCkgf9V32z76YHJUGtS7lPQ';

async function addTestData() {
    console.log('Adding test devices and delayed checks...');

    try {
        // 1. Add a test device
        console.log('Adding test device...');
        const deviceData = {
            name: 'Test Laptop 001',
            type: 'Laptop',
            serialNumber: 'TEST-LT-001',
            location: 'Office A - Desk 1',
            assignedTo: 'test-employee',
            status: 'Active',
            plannedFrequency: 1, // Weekly checks
            identificationNumber: 'EGA-TEST-001'
        };

        const deviceResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/${EDGE_FN_NAME}/devices`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(deviceData)
            }
        );

        if (!deviceResponse.ok) {
            throw new Error(`Failed to add device: ${deviceResponse.status} ${deviceResponse.statusText}`);
        }

        const deviceResult = await deviceResponse.json();
        console.log('✓ Test device added:', deviceResult.device.id);

        // 2. Add a delayed weekly plan (this will create the delayed check)
        console.log('Adding delayed weekly plan...');
        const currentDate = new Date();
        const pastDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago (last week)
        const year = pastDate.getFullYear();
        const week = getWeekNumber(pastDate);

        const planData = {
            week: week.toString(),
            year: year.toString(),
            deviceIds: [deviceResult.device.id],
            assignedBy: 'admin'
        };

        const planResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/${EDGE_FN_NAME}/weekly-plans`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(planData)
            }
        );

        if (!planResponse.ok) {
            throw new Error(`Failed to add weekly plan: ${planResponse.status} ${planResponse.statusText}`);
        }

        const planResult = await planResponse.json();
        console.log('✓ Weekly plan added:', planResult.plan.id);

        // 3. Verify delayed checks exist
        console.log('Checking for delayed devices...');
        const delayedResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/${EDGE_FN_NAME}/delayed-checks`,
            {
                headers: {
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!delayedResponse.ok) {
            throw new Error(`Failed to check delayed devices: ${delayedResponse.status} ${delayedResponse.statusText}`);
        }

        const delayedChecks = await delayedResponse.json();
        console.log(`✓ Found ${delayedChecks.length} delayed device checks`);

        if (delayedChecks.length > 0) {
            console.log('Delayed devices:');
            delayedChecks.forEach((check, index) => {
                console.log(`  ${index + 1}. Device: ${check.deviceId}, Week: ${check.week}/${check.year}`);
            });
        }

        // 4. Test the cron job endpoint
        console.log('Testing cron job endpoint...');
        const cronResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/${EDGE_FN_NAME}/vercel-cron-delayed-notifications`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!cronResponse.ok) {
            throw new Error(`Failed to test cron job: ${cronResponse.status} ${cronResponse.statusText}`);
        }

        const cronResult = await cronResponse.json();
        console.log('✓ Cron job test result:', cronResult);

        console.log('\n🎉 Test data setup completed successfully!');
        console.log('\nYou can now:');
        console.log('1. Open the DelayedDevices component and select employees for notifications');
        console.log('2. Test the Vercel cron job at: /api/cron/test-delayed-notifications');
        console.log('3. The system should send emails about the delayed device check');

    } catch (error) {
        console.error('❌ Error setting up test data:', error.message);
        process.exit(1);
    }
}

// Helper function to get ISO week number
function getWeekNumber(date) {
    const tempDate = new Date(date.getTime());
    tempDate.setHours(0, 0, 0, 0);
    tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
    const week1 = new Date(tempDate.getFullYear(), 0, 4);
    return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// Run the script
addTestData();