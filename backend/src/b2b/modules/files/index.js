// @ts-check
/** PUBLIC interface of the files module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { FILES_COLLECTION, FileRecord } from './models/file.model.js';
export { FILE_ACCESS_COLLECTION, FileAccessRecord } from './models/access-log.model.js';
export { LINK_TTL_SECONDS } from './download-links.js';
export { createFilesService } from './files.service.js';
export { createLocalStore, createR2Store, fileStoreFromConfig, R2_PREFIX } from './storage.js';
export { checkUpload, detectType, safeFileName, MAX_FILE_BYTES, DOCUMENT_TYPES } from './domain/content-check.js';
export { PUBLIC_PREFIX, isPublicKey, createLocalPublicStore, createR2PublicStore, publicStoreFromEnv } from './public-storage.js';
