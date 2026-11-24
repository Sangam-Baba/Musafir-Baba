// @ts-check
/** PUBLIC interface of the webhooks module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { ENDPOINTS_COLLECTION, ENDPOINT_STATUSES, EndpointRecord } from './models/endpoint.model.js';
export { SIGNATURE_HEADER, TOLERANCE_SECONDS, signatureHeader, verifySignature } from './domain/signature.js';
export { isBlockedAddress, checkEndpointUrl } from './domain/addresses.js';
export { API_VERSION, WEBHOOK_EVENTS, publicPayload } from './domain/events.js';
export { guardedPost, SEND_TIMEOUT_MS, SNIPPET_BYTES } from './guarded-client.js';
export { createEndpoints, endpointDto, secretsOf, MAX_ENDPOINTS } from './endpoints.service.js';
