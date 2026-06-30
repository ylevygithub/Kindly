import { createApplication } from "@specific-dev/framework";
import { jwt } from 'better-auth/plugins';
import { sql } from 'drizzle-orm';
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';
import { register as registerComplimentsRoutes } from './routes/compliments.js';
import { register as registerSupportRoutes } from './routes/support.js';
import { register as registerNotificationsRoutes } from './routes/notifications.js';

// Combine application and auth schemas
const schema = { ...appSchema, ...authSchema };

// Create application with combined schema
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Startup cleanup: Delete seed/test users before the app starts serving requests
// This cascade-deletes their profiles, sessions, and accounts
try {
  await app.db.execute(
    sql`DELETE FROM "user" WHERE email LIKE '%test%' OR name LIKE '%user%' OR name LIKE 'su%' OR name LIKE 'up%'`
  );
  app.logger.info('Cleanup: Deleted seed/test users from database');
} catch (err) {
  app.logger.warn({ err }, 'Cleanup: Error deleting seed users (may have already been deleted)');
}

// Enable authentication with JWT plugin
app.withAuth({
  plugins: [jwt()],
});

// Register routes
registerComplimentsRoutes(app, app.fastify);
registerSupportRoutes(app, app.fastify);
registerNotificationsRoutes(app, app.fastify);

await app.run();
app.logger.info('Application running');
