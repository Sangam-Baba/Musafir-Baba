// @ts-check
/** PUBLIC interface of the audit module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { AUDIT_COLLECTION, AuditEventRecord } from './models/audit-event.model.js';
export { createAuditService } from './audit.service.js';
export { auditRoutes } from './routes.js';
