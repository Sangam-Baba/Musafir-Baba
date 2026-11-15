// @ts-check
/** PUBLIC interface of the files module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { FILES_COLLECTION, FileRecord } from './models/file.model.js';
export { createFilesService } from './files.service.js';
export { createLocalStore, createR2Store, fileStoreFromConfig, R2_PREFIX } from './storage.js';
export { checkUpload, detectType, safeFileName, MAX_FILE_BYTES, DOCUMENT_TYPES } from './domain/content-check.js';
