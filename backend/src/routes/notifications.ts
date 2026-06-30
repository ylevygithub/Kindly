import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';

export function register(app: App, fastify: FastifyInstance) {
  // POST /api/notifications/compliment - Send push notification for compliment
  fastify.post('/api/notifications/compliment', {
    schema: {
      description: 'Send push notification for compliment',
      tags: ['notifications'],
      body: {
        type: 'object',
        required: ['recipient_id', 'category'],
        properties: {
          recipient_id: { type: 'string' },
          category: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Body: { recipient_id: string; category: string } }>,
    reply: FastifyReply
  ) => {
    const { recipient_id, category } = request.body;

    app.logger.info({ recipient_id, category }, 'Sending compliment notification');

    try {
      const onesignalApiKey = process.env.ONESIGNAL_REST_API_KEY;
      const onesignalAppId = process.env.ONESIGNAL_APP_ID;

      if (!onesignalApiKey || !onesignalAppId) {
        app.logger.warn('OneSignal credentials not configured');
        return reply.status(200).send({ success: true });
      }

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${onesignalApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: onesignalAppId,
          include_aliases: { external_id: [recipient_id] },
          target_channel: 'push',
          headings: { en: 'Kindly 💛' },
          contents: { en: 'Tu as reçu un nouveau compliment 💛' },
        }),
      });

      if (!response.ok) {
        app.logger.warn({ status: response.status, statusText: response.statusText }, 'OneSignal API error');
      }

      app.logger.info({ recipient_id }, 'Compliment notification sent');
      return reply.status(200).send({ success: true });
    } catch (error) {
      app.logger.error({ err: error, recipient_id }, 'Failed to send compliment notification');
      return reply.status(200).send({ success: true });
    }
  });
}
