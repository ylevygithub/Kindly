import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';
import { register as registerComplimentsRoutes } from './routes/compliments.js';

// Combine application and auth schemas
const schema = { ...appSchema, ...authSchema };

// Create application with combined schema
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication
app.withAuth();

// Register routes
registerComplimentsRoutes(app, app.fastify);

await app.run();
app.logger.info('Application running');
