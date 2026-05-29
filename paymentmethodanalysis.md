# Production-Ready PayU Payment System Audit & Refactor Prompt

You are an expert Senior Full-Stack Payment Systems Architect.

Your task is to deeply audit, reverse engineer, document, secure, and refactor the existing PayU payment integration in our application.

Current Problem:

* We do NOT know whether the payment flow is being handled on the frontend, backend, or both.
* We do NOT know whether the current implementation is secure, production-ready, scalable, or compliant with best practices.
* We want a COMPLETE technical examination of the existing payment architecture before making changes.
* We do NOT want to break existing working functionality.
* We do NOT want to lose any transaction records or payment-related data.

The project contains:

* Frontend application
* Backend application
* Existing PayU integration
* Existing payment forms and APIs
* Existing database records

Your task is to perform a FULL PAYMENT SYSTEM INVESTIGATION and then implement a PRODUCTION-READY ARCHITECTURE.

---

## PHASE 1 — COMPLETE PAYMENT FLOW ANALYSIS

First, inspect the ENTIRE codebase and identify:

1. Where PayU integration starts

   * frontend forms
   * checkout buttons
   * payment APIs
   * middleware
   * services
   * utility functions
   * environment variables
   * webhooks
   * redirect handlers

2. Determine:

   * Is payment initiation happening on frontend?
   * Is hash generation happening on frontend?
   * Is secret key exposed anywhere?
   * Is backend validating payment?
   * Is webhook implemented?
   * Is success/failure verification secure?
   * Is transaction integrity protected?
   * Is replay attack prevention implemented?
   * Is duplicate payment handling implemented?
   * Is payment status reconciliation implemented?

3. Trace FULL PAYMENT FLOW:
   User Action
   → API Call
   → Hash Generation
   → PayU Redirect
   → Callback
   → Verification
   → Database Update
   → Final Success State

4. Create a detailed audit report including:

   * insecure implementations
   * frontend vulnerabilities
   * exposed secrets
   * race conditions
   * missing validations
   * missing webhook verification
   * possible payment tampering
   * broken transaction flows
   * bad architecture decisions
   * missing logging
   * missing retry mechanisms
   * missing idempotency protection

5. Find all payment-related:

   * routes
   * controllers
   * services
   * models
   * hooks
   * utilities
   * cron jobs
   * event handlers
   * webhook handlers

---

## PHASE 2 — PRODUCTION-READY ARCHITECTURE

Refactor the system into a secure enterprise-grade payment architecture.

Implement proper separation:

FRONTEND RESPONSIBILITIES:

* Collect user payment request
* Call backend payment-init API
* Redirect to PayU securely
* Display payment status
* Never generate hashes
* Never expose merchant secrets
* Never trust frontend payment status

BACKEND RESPONSIBILITIES:

* Generate payment hash
* Store transaction before payment starts
* Verify all callbacks
* Verify webhook signatures
* Validate payment authenticity
* Update transaction state
* Prevent duplicate processing
* Maintain audit logs
* Handle retries safely

---

## PHASE 3 — SECURITY HARDENING

Implement:

1. Secure Environment Handling

* Move all PayU secrets to backend env only
* Ensure no secret exists in frontend build
* Validate env loading

2. Transaction Security

* Unique transaction IDs
* Idempotency handling
* Duplicate callback prevention
* Replay attack prevention

3. Validation

* Verify amount
* Verify txnid
* Verify hash
* Verify user ownership
* Verify payment status from PayU

4. Webhook Security

* Proper webhook verification
* Signature validation
* Retry-safe processing
* Logging for failed webhooks

5. Logging & Monitoring

* payment initiated
* payment success
* payment failed
* callback received
* webhook received
* verification failed
* duplicate callback detected

6. Failure Handling

* network failure recovery
* partial transaction recovery
* pending payment reconciliation
* timeout handling

---

## PHASE 4 — DATABASE & TRANSACTION SAFETY

Audit database structure and improve if needed.

Ensure:

* payment table exists
* transaction states are normalized
* pending/success/failed/refunded states exist
* audit logs exist
* webhook logs exist
* duplicate transactions prevented

Recommended states:

* initiated
* pending
* processing
* success
* failed
* cancelled
* refunded
* verification_failed

Add:

* indexes
* constraints
* unique txnid
* proper relations

DO NOT DELETE EXISTING DATA.

Use migrations safely.

---

## PHASE 5 — TESTING & QA

Implement:

* sandbox testing
* callback testing
* webhook testing
* failure simulation
* duplicate request simulation
* timeout simulation

Create:

* test checklist
* payment flow documentation
* architecture diagram
* API documentation

---

## PHASE 6 — FINAL DELIVERABLES

Provide:

1. Existing Flow Analysis
2. Security Audit Report
3. Vulnerability List
4. Refactored Architecture
5. Updated Backend Flow
6. Updated Frontend Flow
7. Database Improvements
8. Production Readiness Checklist
9. Rollback Strategy
10. Deployment Instructions

---

## CRITICAL REQUIREMENTS

* DO NOT break existing working payment flows.
* DO NOT remove existing APIs unless replacement is confirmed working.
* DO NOT expose merchant key or salt in frontend.
* DO NOT trust frontend payment success.
* DO NOT lose transaction records.
* Keep backward compatibility where possible.
* Add comments explaining every important payment logic.
* Follow enterprise-level payment security practices.
* Follow scalable architecture principles.
* Refactor carefully and incrementally.

Before modifying anything:

1. Fully understand existing flow.
2. Document existing behavior.
3. Create safe migration/refactor plan.
4. Then implement changes step by step.

The final system should be:

* secure
* scalable
* maintainable
* production-ready
* audit-friendly
* failure-resistant
* webhook-safe
* replay-safe
* duplicate-safe
* enterprise-grade.
