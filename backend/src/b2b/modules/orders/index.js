// @ts-check
/** Public interface of the orders module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export {
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  OPEN_ORDER_STATUSES,
  ORDER_CHANNELS,
  PAYMENT_MODES,
  ITEM_TYPES,
  PAYMENT_WINDOW_MAX_MINUTES,
  PAYMENT_WINDOW_MARGIN_MINUTES,
  MIN_HOLD_LEFT_TO_PAY_MINUTES,
  DUPLICATE_WINDOW_MINUTES,
  ORDER_LIMITS,
  CLIENT_ORDER_LIMITS,
  assertOrderTransition,
  paymentPlan,
  checkBuyerInput,
} from './domain/order.js';
export { ORDERS_COLLECTION, OrderRecord } from './models/order.model.js';
export { createItemHandlers, createPaymentModes } from './registry.js';
export {
  createOrderService,
  orderView,
  orderInfo,
  canSee,
  linkKey,
  fingerprint,
  failOrder,
  pushHistory,
  ORDERS,
} from './orders.service.js';
export { createGatewayMode } from './gateway-mode.js';
export { createWalletMode, WALLET_HOLD_TTL_MS } from './wallet-mode.js';
export { orderReconcileRules, orderConsumers, HOLDING_STUCK_MS, CONFIRMING_STUCK_MS } from './safety-net.js';
export { createOrderPayments, confirmForward, refundOrder, MAX_PAYMENT_ATTEMPTS } from './payment.service.js';
export { sweepOrders, orderInvariants, expireOrder, ORDER_SWEEP_EVERY_MS } from './sweeper.js';
export { createOrderAdmin } from './admin.service.js';
export { createOrderCancellations } from './cancel.service.js';
export { ADMIN_ACTIONS_COLLECTION, ADMIN_ACTIONS, ADMIN_ACTION_STATUSES, AdminActionRecord } from './models/admin-action.model.js';
/** @typedef {import('./registry.js').ItemHandler} ItemHandler */
/** @typedef {import('./registry.js').PaymentMode} PaymentMode */
/** @typedef {import('./registry.js').OrderInfo} OrderInfo */
/** @typedef {import('./registry.js').OrderItem} OrderItem */
