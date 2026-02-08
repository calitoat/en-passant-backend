/**
 * Email Service using Resend
 *
 * Sends transactional emails for waitlist confirmations,
 * verification nudges, and launch announcements.
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'En Passant <hello@enpassantapi.io>';

/**
 * Send waitlist confirmation email
 */
export async function sendWaitlistConfirmation(email, vertical) {
    const verticalNames = {
        tickets: 'Tickets',
        apartments: 'Apartments',
        jobs: 'Jobs',
        dating: 'Dating',
        freelance: 'Freelance',
        general: 'En Passant'
    };

    const verticalEmojis = {
        tickets: '🎫',
        apartments: '🏠',
        jobs: '💼',
        dating: '❤️',
        freelance: '🔧',
        general: '♟️'
    };

    const verticalName = verticalNames[vertical] || vertical;
    const verticalEmoji = verticalEmojis[vertical] || '♟️';

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: `You're on the list — En Passant ${verticalEmoji} ${verticalName}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #f5f5f5; padding: 40px 30px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 28px; margin: 0; color: #f5f5f5; font-weight: 600;">♟ En Passant</h1>
        </div>

        <!-- Main Card -->
        <div style="background: #111111; border: 1px solid #1a1a1a; border-radius: 12px; padding: 30px; margin-bottom: 24px;">
            <h2 style="color: #D4A853; margin-top: 0; font-size: 24px; font-weight: 600;">You're on the list!</h2>
            <p style="color: #a1a1aa; line-height: 1.7; margin-bottom: 0; font-size: 16px;">
                Thanks for signing up for <strong style="color: #f5f5f5;">${verticalEmoji} ${verticalName}</strong> early access.
                We'll notify you the moment we launch.
            </p>
        </div>

        <!-- What's Next Card -->
        <div style="background: #111111; border: 1px solid #1a1a1a; border-radius: 12px; padding: 30px; margin-bottom: 24px;">
            <h3 style="color: #f5f5f5; margin-top: 0; font-size: 18px; font-weight: 600;">What's next?</h3>
            <p style="color: #a1a1aa; line-height: 1.7; font-size: 15px;">
                We're putting the finishing touches on En Passant. When we launch, you'll be among the first to know.
                Keep an eye on your inbox — we'll send you an invite link when it's time.
            </p>
            <p style="color: #a1a1aa; line-height: 1.7; font-size: 15px; margin-top: 16px; margin-bottom: 0;">
                In the meantime, follow us on <a href="https://twitter.com/enpassantapi" style="color: #D4A853; text-decoration: none;">Twitter/X</a> for updates.
            </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 24px; border-top: 1px solid #1a1a1a;">
            <p style="color: #52525b; font-size: 14px; margin: 0;">
                En Passant — Prove you're real in a world of bots.
            </p>
            <p style="color: #3f3f46; font-size: 12px; margin-top: 12px;">
                You're receiving this because you signed up at enpassantapi.io
            </p>
        </div>
    </div>
</body>
</html>
            `
        });

        if (error) {
            console.error('[Email] Resend error:', error);
            return { success: false, error };
        }

        console.log('[Email] Waitlist confirmation sent to:', email, 'ID:', data.id);
        return { success: true, id: data.id };
    } catch (err) {
        console.error('[Email] Send failed:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Send pre-verification nudge (for users who signed up but didn't connect accounts)
 * TODO: Re-enable when OAuth is verified and dashboard is live
 */
export async function sendVerificationNudge(email, currentScore) {
    // Disabled until OAuth verification is complete
    console.log('[Email] Verification nudge disabled - OAuth pending:', email);
    return { success: false, error: 'Verification nudge disabled during pre-launch' };
}

/**
 * Send launch announcement to all waitlist leads
 * TODO: Build this out closer to launch
 * Will use Resend's batch send API for bulk sending
 */
export async function sendLaunchAnnouncement(email, vertical) {
    console.log('[Email] Launch announcement queued for:', email, vertical);
    // TODO: Implement batch sending with Resend
}

// TODO: Add SMS notifications via Twilio
// Phone numbers are stored in leads.phone column
// Will implement for launch reminders

export default {
    sendWaitlistConfirmation,
    sendVerificationNudge,
    sendLaunchAnnouncement
};
