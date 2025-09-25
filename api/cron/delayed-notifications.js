// Vercel Cron Job for Weekly Delayed Device Notifications
// Runs every Monday at 7:00 AM GST (3:00 AM UTC)

export default async function handler(req, res) {
    // Only allow POST requests from Vercel Cron
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify the request is from Vercel Cron
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('Vercel cron job started - Weekly delayed device notifications');

        // Call the Supabase Edge Function endpoint
        const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ksdrpfxuwavfwnccmrwr.supabase.co';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const edgeFunctionName = process.env.EDGE_FN_NAME || 'make-server-354d5d14';

        if (!serviceRoleKey) {
            console.error('SUPABASE_SERVICE_ROLE_KEY not found');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const response = await fetch(
            `${supabaseUrl}/functions/v1/${edgeFunctionName}/vercel-cron-delayed-notifications`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.ok) {
            const result = await response.json();
            console.log('Vercel cron job completed successfully:', result);

            return res.status(200).json({
                success: true,
                message: 'Weekly delayed device notifications completed',
                timestamp: new Date().toISOString(),
                ...result
            });
        } else {
            const errorText = await response.text();
            console.error('Edge function call failed:', errorText);

            return res.status(500).json({
                success: false,
                error: 'Failed to call edge function',
                details: errorText
            });
        }

    } catch (error) {
        console.error('Vercel cron job error:', error);

        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
}