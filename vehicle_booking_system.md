# AI Development Prompt – Phase 1: Fleet Partner Onboarding System

## Project Overview

We are building a transport booking platform similar to RedBus, but **this phase is ONLY for the Fleet Partner Onboarding System**.

**Important:**
Do NOT implement any customer booking, seat booking, trip management, payment gateway, pricing engine, route management, or live tracking in this phase.

The purpose of this phase is to build a robust onboarding platform where vehicle owners (partners) can register themselves, add their vehicles, upload documents, and get verified by the admin.

The system must be designed in a modular and scalable way so that future booking-related modules can be added without changing the existing database structure.

---

# Primary Goals

Build a production-ready onboarding system that allows:

* Partner Registration
* Authentication
* Profile Management
* Vehicle Management
* Driver Management
* Document Management
* Admin Verification Workflow
* Approval/Rejection Process
* Dashboard
* Notifications

This system should be designed using clean architecture and follow best development practices.

---

# Important Architecture Rules

## Do NOT tightly couple modules.

Instead, design the system as:

Partner
├── Profile
├── Addresses
├── Bank Accounts
├── Vehicles
├── Drivers
├── Documents
└── Verification

Each module should have its own database table(s), APIs, validation, and business logic.

Never store everything in a single Partner table.

---

# Module 1 – Authentication

Implement complete authentication.

Features:

* Partner Registration
* Login
* Logout
* Forgot Password
* Reset Password
* Change Password
* Email Verification (optional if service is unavailable)
* Mobile OTP Verification (optional)
* JWT Authentication
* Refresh Tokens
* Secure Password Hashing

Roles:

* Super Admin
* Admin
* Partner

Implement Role-Based Access Control (RBAC).

---

# Module 2 – Partner Profile

Allow a partner to manage their profile.

Fields:

Personal Details

* Profile Picture
* Full Name
* Father's Name (Optional)
* Date of Birth
* Gender
* Mobile Number
* Alternate Mobile Number
* WhatsApp Number
* Email

Address

* Permanent Address
* Current Address
* Google Maps Location
* Latitude
* Longitude
* Country
* State
* District
* City
* PIN Code

Additional Information

* Emergency Contact Name
* Emergency Contact Number
* Preferred Language
* Partner Type

Partner Type should support:

* Individual
* Fleet Owner
* Travel Agency
* Company

Profile Completion Percentage should be calculated dynamically.

---

# Module 3 – Identity Verification

Support:

Aadhaar

* Number
* Front Image
* Back Image

PAN

* Number
* Image

Every identity document must support:

* Pending
* Approved
* Rejected
* Re-upload Required

Store:

* Uploaded At
* Verified At
* Verified By
* Remarks

Never permanently delete uploaded documents.

---

# Module 4 – Bank Details

Support multiple bank accounts in future but only one primary account for now.

Fields:

* Account Holder Name
* Bank Name
* Branch Name
* Account Number
* IFSC
* UPI ID
* Cancelled Cheque

Verification Status:

* Pending
* Verified
* Rejected

---

# Module 5 – Vehicle Management

A partner can own multiple vehicles.

Never limit the system to one vehicle.

Vehicle Information

* Vehicle Category
* Seating Capacity
* Brand
* Model
* Vehicle Name
* Registration Number
* Chassis Number
* Engine Number
* Manufacturing Year
* Colour

Permit Information

* Commercial Permit
* Permit Number
* Permit Type
* Permit Expiry

Vehicle Features

Support features through a separate master table.

Examples:

* AC
* Music System
* Push Back Seats
* GPS
* CCTV
* Fire Extinguisher
* First Aid Kit
* Charging Point
* Bottle Holder
* Reading Lights
* Luggage Carrier
* Seat Belts
* Microphone

Vehicle Status

* Pending Approval
* Active
* Rejected
* Disabled

Vehicle Images

Store separately.

Support:

* Front
* Rear
* Left
* Right
* Dashboard
* Interior
* Seating
* Luggage

Allow additional images in future.

---

# Module 6 – Driver Management

Driver module must be optional.

Owner may drive the vehicle.

Each driver should contain:

* Name
* Mobile
* Alternate Mobile
* Aadhaar
* Licence Number
* Licence Expiry
* Experience
* Languages
* Photo

Driver Status

* Active
* Inactive
* Pending
* Rejected

Driver Documents

* Licence Front
* Licence Back
* Aadhaar

Do not permanently assign one driver to one vehicle.
Future trip assignments should be possible.

---

# Module 7 – Document Management

Create one reusable document system.

Do NOT create separate document tables for every module.

Document should support:

Owner Type

* Partner
* Vehicle
* Driver

Fields

* Document Type
* File
* Expiry Date
* Uploaded At
* Verification Status
* Verified By
* Verification Date
* Remarks

Supported Status

* Pending
* Approved
* Rejected
* Expired
* Re-upload Required

---

# Module 8 – Verification Workflow

Workflow:

Partner submits onboarding

↓

Admin reviews

↓

Admin can

* Approve
* Reject
* Ask for Re-upload

↓

Partner uploads again

↓

Admin approves

Record complete approval history.

---

# Module 9 – Partner Dashboard

Display:

* Profile Completion
* Verification Status
* Total Vehicles
* Total Drivers
* Pending Documents
* Expiring Documents
* Notifications

No booking information should exist.

---

# Module 10 – Admin Dashboard

Admin should manage:

Partners

* View
* Search
* Filter
* Approve
* Reject
* Suspend

Vehicles

* View
* Approve
* Reject
* Disable

Drivers

* View
* Approve
* Reject

Documents

* Verify
* Reject
* Request Re-upload

Dashboard Statistics

* Total Partners
* Pending Approvals
* Approved Partners
* Rejected Partners
* Total Vehicles
* Total Drivers
* Expiring Documents

---

# Notifications

Design notification architecture.

Support:

* In-App Notifications

Future support:

* Email
* SMS
* WhatsApp
* Push Notifications

Keep implementation extensible.

---

# Audit Logs

Maintain audit logs for every important action.

Track:

* User
* Action
* Module
* Old Value
* New Value
* Timestamp
* IP Address (if available)

Never silently overwrite important records.

---

# File Uploads

Support secure uploads.

Requirements:

* Image validation
* File size validation
* MIME type validation
* Unique filenames
* Secure storage
* Preview support

---

# API Requirements

Follow REST standards.

Implement:

* Pagination
* Filtering
* Searching
* Sorting
* Proper HTTP status codes
* Validation
* Consistent API response format

Never return raw database errors.

---

# Database Design

Normalize the database.

Expected modules include:

* Users
* Roles
* Permissions
* Partners
* Addresses
* Bank Accounts
* Vehicles
* Vehicle Features
* Vehicle Images
* Drivers
* Documents
* Verification Logs
* Notifications
* Audit Logs

Avoid duplicated data.

Use foreign keys appropriately.

---

# Future Compatibility

Design the database so future modules can connect easily:

Future modules (NOT part of this phase):

* Routes
* Trips
* Seat Layouts
* Seat Inventory
* Pricing
* Bookings
* Customers
* Payments
* Reviews
* Live Tracking

The current implementation must not block these future integrations.

---

# Development Expectations

Before writing any code:

1. Analyze the complete requirements.
2. Design the database schema.
3. Identify all entities and relationships.
4. Explain the proposed architecture.
5. Highlight potential scalability issues.
6. Suggest improvements where necessary.
7. Only after approval, begin implementation.

Do not make assumptions. If any requirement is unclear, ask for clarification instead of implementing guessed behavior.

Write clean, maintainable, modular, production-ready code following SOLID principles, proper folder structure, reusable components, centralized validation, and consistent naming conventions.
