// @ts-check
/** The system scope the bus booking engine reads and writes bookings with (shared by its step files). */
import { systemScope } from '../../core/db/tenant-plugin.js';

export const ENGINE = systemScope('bus-booking: booking engine', { routine: true });
