// @ts-check
/** PUBLIC interface of the hotel-inventory module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { PENALTY_TYPES, MAX_RULES, normalisePolicy, summarise, penaltyAt, penaltyText } from './domain/cancellation.js';
export { CANCELLATION_POLICIES_COLLECTION, CancellationPolicyRecord } from './models/cancellation-policy.model.js';
export { createCancellationPolicyService } from './cancellation-policy.service.js';
export { PRICING_MODELS, ADJUST_TYPES, RATE_PLAN_STATUSES, checkRatePlan, derivedPrice } from './domain/rate-plan.js';
export { RATE_PLANS_COLLECTION, RatePlanRecord } from './models/rate-plan.model.js';
export { createRatePlanService } from './rate-plan.service.js';
export { DATE, CALENDAR_WINDOW_DAYS, isDate, addDays, daysBetween, weekday, nights, todayIn } from './domain/dates.js';
export { INVENTORY_DAYS_COLLECTION, INVENTORY_DAY_VALIDATOR, InventoryDayRecord } from './models/inventory-day.model.js';
export { ensureNights, extendCalendarWindow } from './inventory-days.js';
export { MAX_STAY_NIGHTS, EMPTY_DAY, priceKeys, effectiveDay, priceFor } from './domain/rate-day.js';
export { buildCalendar } from './domain/calendar.js';
export { RATE_DAYS_COLLECTION, RateDayRecord } from './models/rate-day.model.js';
export { createCalendarService, MAX_CALENDAR_NIGHTS } from './calendar.service.js';
export {
  MAX_EDIT_NIGHTS,
  MAX_EDIT_CELLS,
  BIG_CHANGE_RATIO,
  RULE_FIELDS,
  selectDates,
  rateChangeProblems,
  bigChanges,
  mergedPrices,
} from './domain/bulk-edit.js';
export { CHANGE_LOG_COLLECTION, ChangeLogRecord } from './models/change-log.model.js';
export { createCalendarEditService } from './calendar-edit.service.js';
export { MAX_ROOMS_PER_STAY, fits, evaluate } from './domain/availability.js';
export { createAvailabilityService } from './availability.service.js';
export { HOLDS_COLLECTION, HOLD_STATUSES, HoldRecord } from './models/hold.model.js';
export { createHoldService, HOLD_MINUTES, EXTEND_MINUTES, holdDto } from './hold.service.js';
export { stepsOf } from './night-steps.js';
export {
  holdReconcileRules,
  sweepHolds,
  bookedNightOwners,
  inventoryInvariants,
  SWEEP_EVERY_MS,
  STUCK_AFTER_MS,
  ORPHAN_AFTER_MS,
  OVERDUE_ALERT_MS,
} from './safety-net.js';
export { inventoryChangedEvent, holdChangedEvent } from './inventory-events.js';
export { createAvailabilitySignals, SIGNAL_EVERY_MS } from './availability-signals.js';
export { parseCsv, toCsv } from './domain/csv.js';
export { MAX_IMPORT_ROWS, MAX_IMPORT_ERRORS, rupeesToPaise, readHeader, readRows } from './domain/import-rows.js';
export { createCalendarImportService } from './calendar-import.service.js';
export { createAdminCalendarService } from './admin-calendar.service.js';
export { calendarOf } from './calendar.service.js';
export { createPlanTermsService } from './plan-terms.service.js';
