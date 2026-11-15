// @ts-check
/** PUBLIC interface of the notifications module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { CATEGORIES, EVENT_CATEGORIES, ADMIN_QUEUES, visibleOrgCategories } from './domain/catalogue.js';
export { TEMPLATES, renderTemplate } from './domain/templates.js';
export { INBOX_COLLECTION, InboxRecord } from './models/inbox.model.js';
export { PREFERENCES_COLLECTION, PreferenceRecord } from './models/preference.model.js';
export { createDelivery } from './delivery.js';
export { createNotificationsService } from './notifications.service.js';
