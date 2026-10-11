// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { getCancellationPolicy, cancellationCode } from "../src/services/cancellation.service.js";

test("cabs: any time before the trip starts, instant", () => {
  for (const status of ["PAYMENT_PENDING", "PAID", "AWAITING_ASSIGNMENT", "ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED"]) {
    assert.equal(getCancellationPolicy("CAB", { status, paymentInfo: { status: "Paid" }, totalAmount: 500 }).type, "INSTANT", status);
  }
  assert.equal(getCancellationPolicy("CAB", { status: "PAID", paymentInfo: { status: "Paid" }, totalAmount: 500 }).paidAmount, 500);
  assert.equal(getCancellationPolicy("CAB", { status: "PAYMENT_PENDING", paymentInfo: { status: "Pending" }, totalAmount: 500 }).paidAmount, 0);
  assert.equal(getCancellationPolicy("CAB", { status: "ONGOING" }).allowed, false);
  assert.equal(getCancellationPolicy("CAB", { status: "COMPLETED" }).allowed, false);
  assert.equal(getCancellationPolicy("CAB", { status: "CANCELLED" }).allowed, false);
});

test("tours: unpaid instant, paid request, not after start / twice", () => {
  const future = new Date(Date.now() + 5 * 864e5);
  assert.equal(getCancellationPolicy("TOUR", { bookingStatus: "PaymentPending", startDate: future, paymentInfo: { status: "Pending" } }).type, "INSTANT");
  const paid = getCancellationPolicy("TOUR", { bookingStatus: "Confirmed", startDate: future, paymentInfo: { status: "Paid" }, payNowAmount: 6037 });
  assert.deepEqual([paid.type, paid.paidAmount], ["REQUEST", 6037]);
  assert.equal(getCancellationPolicy("TOUR", { bookingStatus: "Confirmed", startDate: new Date(Date.now() - 864e5), paymentInfo: { status: "Paid" } }).allowed, false);
  assert.equal(getCancellationPolicy("TOUR", { bookingStatus: "Confirmed", startDate: future, cancellation: { status: "REQUESTED" } }).allowed, false);
  assert.equal(getCancellationPolicy("TOUR", { bookingStatus: "Cancelled", startDate: future }).allowed, false);
});

test("visa: unpaid instant, paid request, closed statuses blocked", () => {
  assert.equal(getCancellationPolicy("VISA", { applicationStatus: "Pending", paymentInfo: { status: "Pending" } }).type, "INSTANT");
  assert.equal(getCancellationPolicy("VISA", { applicationStatus: "Submitted", paymentInfo: { status: "Paid" }, totalAmount: 26358 }).type, "REQUEST");
  for (const s of ["Approved", "Rejected", "Cancelled"]) assert.equal(getCancellationPolicy("VISA", { applicationStatus: s, paymentInfo: { status: "Paid" } }).allowed, false);
  assert.equal(getCancellationPolicy("VISA", { applicationStatus: "Submitted", paymentInfo: { status: "Paid" }, cancellation: { status: "REQUESTED" } }).allowed, false);
});

test("request code", () => assert.equal(cancellationCode(7), "MBGC000007"));
