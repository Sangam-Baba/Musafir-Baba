# MusafirBaba Chatbot Flow (Flow Diagram)

```text
Visitor Opens Chatbot
        │
        ▼
Greeting + Quick Intent Options
──────────────────────────────────────
• Tour Packages
• Visa
• Car Rental
• Other
        │
        ▼
User Selects or Types Intent
```

---

# Path A — Tour Packages

```text
User selects "Tour Packages"
        │
        ▼
What kind of trip?
──────────────────────────
• Honeymoon
• Family
• Solo
• Group
• Religious
• Adventure
        │
        ▼
Destination?
──────────────────────────
• Domestic
• International
        │
        ▼
Budget Range?
──────────────────────────
• Under 15k
• 15k–30k
• 30k+
        │
        ▼
Travel Dates?
──────────────────────────
• Approximate month
• Flexible
        │
        ▼
Show Matched Packages
──────────────────────────
• Show 2–3 best packages
• Display price
• Display package link
```

---

# Path B — Visa

```text
User selects "Visa"
        │
        ▼
Which Country?
──────────────────────────
• Type manually
OR
• Pick from list
        │
        ▼
Visa Type?
──────────────────────────
• Tourist
• Business
• Transit
        │
        ▼
Travel Date?
──────────────────────────
Needed to calculate
processing timeline
        │
        ▼
Show Visa Summary
──────────────────────────
• Visa Fee
• Processing Time
• Required Documents
```

---

# Path C — Car Rental

```text
User selects "Car Rental"
        │
        ▼
Rental Type?
──────────────────────────
• Airport
• Outstation
• Local
        │
        ▼
Pickup Location?
──────────────────────────
• City
OR
• Airport
        │
        ▼
Date & Duration?
──────────────────────────
• Pickup Date
• Number of Days
        │
        ▼
Confirm Availability
──────────────────────────
• Vehicle Options
• Pricing
```

---

# Lead Capture

(All three paths converge here.)

```text
Capture Name + Phone Number
```

---

# Additional Questions

```text
Any More Questions?
──────────────────────────
Examples
• Cancellation
• Cost
• Itinerary
```

### If YES

```text
Answer Question
        │
        ▼
Loop Back
```

### If NO

Continue to the next step.

---

# Ready to Proceed?

```text
Ready to Proceed?
──────────────────────────
• Book Now
• Need More Time
```

---

## Option 1 — Needs More Time

```text
Offer to Send Details on WhatsApp
──────────────────────────
• Collect WhatsApp Number
• Send Summary
```

---

## Option 2 — Ready

```text
Warm Handoff
──────────────────────────
Connect User
to WhatsApp Agent
```

---

# Lead Saved

Both paths merge here.

```text
Lead Captured and Saved
──────────────────────────
• CRM Updated
• Team Notified Instantly
```

---

# FAQ Handling

```text
Detect Topic
──────────────────────────
Answer from FAQ
```

### If Topic Unknown

```text
Escalate to Human Agent
```

---

# Final Step

```text
Route to WhatsApp / Human Agent
```

---

# Complete Flow

```text
Visitor Opens Chatbot
        │
        ▼
Greeting + Quick Intent Options
        │
        ▼
User Selects Intent
        │
 ┌──────┼──────────────┐
 │      │              │
 ▼      ▼              ▼
Tour   Visa      Car Rental
 │      │              │
 ▼      ▼              ▼
Collect Required Details
 │      │              │
 └──────┴──────────────┘
        │
        ▼
Capture Name + Phone
        │
        ▼
Any More Questions?
   │          │
  Yes         No
   │          │
Answer FAQ    ▼
   │     Ready to Proceed?
   │       │          │
   │     Ready    Need More Time
   │       │          │
   │       ▼          ▼
   │   Warm      Send Details
   │  Handoff    on WhatsApp
   │       │          │
   └───────┴──────────┘
           │
           ▼
Lead Captured
           │
           ▼
FAQ / Escalation
           │
           ▼
WhatsApp / Human Agent
```

This is a clean Markdown representation of the flowchart in your image, preserving the structure, branching logic, and labels from the diagram.
