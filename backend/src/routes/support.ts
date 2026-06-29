import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { resend } from '@specific-dev/framework';
import * as schema from '../db/schema/schema.js';
import * as authSchema from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

const SUPPORT_EMAIL = 'support@kindly.app';

export function register(app: App, fastify: FastifyInstance) {
  // POST /api/support/contact - Send support email
  fastify.post('/api/support/contact', {
    schema: {
      description: 'Send a support/contact email',
      tags: ['support'],
      body: {
        type: 'object',
        required: ['subject', 'message'],
        properties: {
          subject: { type: 'string', minLength: 1 },
          message: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Body: { subject: string; message: string; email?: string } }>,
    reply: FastifyReply
  ) => {
    const { subject, message, email: providedEmail } = request.body;

    app.logger.info({ subject }, 'Support contact request received');

    // Validate required fields
    if (!subject || !message) {
      app.logger.warn('Missing required fields for support request');
      return reply.status(400).send({
        success: false,
        error: 'subject and message are required',
      });
    }

    let username: string | undefined;
    let senderEmail: string | undefined;
    let replyTo: string | undefined;

    // Try to extract auth info from Bearer token
    try {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        // Look up session
        const sessionRecord = await app.db.query.session.findFirst({
          where: eq(authSchema.session.token, token),
        });

        if (sessionRecord) {
          const userId = sessionRecord.userId;

          // Get user info
          const userRecord = await app.db.query.user.findFirst({
            where: eq(authSchema.user.id, userId),
          });

          if (userRecord) {
            senderEmail = userRecord.email;
          }

          // Get profile username
          const profileRecord = await app.db.query.profiles.findFirst({
            where: eq(schema.profiles.id, userId),
          });

          if (profileRecord) {
            username = profileRecord.username;
          }
        }
      }
    } catch (err) {
      app.logger.debug({ err }, 'Error extracting auth info (continuing as anonymous)');
      // Continue as anonymous — don't fail
    }

    // Determine reply-to email
    if (providedEmail) {
      replyTo = providedEmail;
    } else if (senderEmail) {
      replyTo = senderEmail;
    }

    // Build HTML email body
    const displayName = username || (senderEmail ? senderEmail.split('@')[0] : 'Anonymous');
    const displayEmail = senderEmail || providedEmail || 'not provided';
    const messageWithLineBreaks = message.replace(/\n/g, '<br/>');

    const htmlBody = `<h2>New Support Request</h2>
<p><strong>From:</strong> ${displayName} (${displayEmail})</p>
<p><strong>Subject:</strong> ${subject}</p>
<hr/>
<p>${messageWithLineBreaks}</p>`;

    // Send email
    try {
      await resend.emails.send({
        from: 'Kindly Support <onboarding@resend.dev>',
        to: SUPPORT_EMAIL,
        replyTo: replyTo,
        subject: `[Kindly Support] ${subject}`,
        html: htmlBody,
      });

      app.logger.info({ subject, from: displayName }, 'Support email sent successfully');
      return reply.status(200).send({ success: true });
    } catch (err) {
      app.logger.error({ err, subject }, 'Failed to send support email');
      return reply.status(500).send({
        success: false,
        error: 'Failed to send email',
      });
    }
  });
}
