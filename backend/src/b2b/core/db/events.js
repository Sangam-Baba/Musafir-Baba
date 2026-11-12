// @ts-check
/**
 * Domain events stored INSIDE the business document (pattern P5, docs/plan/01-architecture.md §8.1).
 * The same single-document update that changes the state pushes the event into
 * `pendingEvents`, so an event exists if and only if the change happened. The worker relay
 * (S00-T11) copies pending events to `core_outbox` and removes them from the document.
 */
import { randomUUID } from 'node:crypto';

/**
 * @typedef {{ eventId: string, type: string, version: number, occurredAt: Date, payload: Record<string, unknown> }} DomainEvent
 */

const EVENT_TYPE = /^[a-z][a-z-]*\.[a-z][a-z-]*\.[a-z][a-z-]*$/;

/**
 * @param {string} type  `module.entity.pastVerb`, e.g. 'hotel-booking.booking.confirmed'
 * @param {Record<string, unknown>} payload  ids + essentials only, never secrets or guest PII
 * @param {{ clock: import('../clock.js').Clock, version?: number }} options
 * @returns {DomainEvent}
 */
export function newEvent(type, payload, { clock, version = 1 }) {
  if (!EVENT_TYPE.test(type)) throw new Error(`[b2b] event type "${type}" must look like module.entity.pastVerb`);
  return { eventId: randomUUID(), type, version, occurredAt: clock.now(), payload };
}

/**
 * Schema fields every document that carries events needs. Spread into a schema definition.
 * @param {typeof import('mongoose')} m
 */
export function eventFields(m) {
  return {
    pendingEvents: {
      // `type` must be written as { type: String } — a bare `type: String` would be read as the subdocument's type
      type: [{ _id: false, eventId: String, type: { type: String }, version: Number, occurredAt: Date, payload: m.Schema.Types.Mixed }],
      default: undefined,
    },
    hasPendingEvents: { type: Boolean, default: undefined },
  };
}
