# MusafirBaba Chatbot Flow

## STEP 1 --- GREETING (TRIGGER: CHATBOT OPENS)

### 1. Opening message + intent buttons

**Trigger:** Auto-sent on open

**BOT SAYS** \> Namaste! I'm Baba --- your travel assistant from
MusafirBaba. \> \> I can help you plan a holiday, apply for a visa, or
arrange a car rental. What are you looking for today?

**Buttons** - Plan a holiday trip - Apply for a visa - Book a car
rental - Something else

**Tone Rule** - Warm, first-person ("I can help") - Never robotic -
"Namaste" sets an Indian travel brand voice - Maximum 2 sentences before
buttons

------------------------------------------------------------------------

# PATH A --- HOLIDAY / TOUR PACKAGES

## A1. Trip Type Question

**Trigger:** User picked "Plan a holiday trip"

**BOT SAYS** \> Great choice! Let me find the best options for you. \>
\> First --- what kind of trip are you planning?

**Options** - Honeymoon - Family vacation - Group tour - Solo /
friends - Religious / pilgrimage - Adventure / trek

**Rule** - Never ask more than one question per message.

## A2. Destination Question

**Trigger:** After trip type selected

**BOT SAYS** \> Perfect! Do you have a destination in mind, or would you
like me to suggest something?

**Buttons** - I have a destination - Suggest something

### If "I have a destination"

**BOT SAYS** \> Which destination are you thinking of? You can type it
or pick a popular one below.

Popular destinations: - Kashmir - Meghalaya - Kerala - Rajasthan -
Himachal - Uttarakhand - Bali - Dubai - Europe

### If "Suggest something"

**BOT SAYS** \> No problem! Are you thinking domestic --- somewhere in
India --- or an international trip?

Options: - Within India - International - Open to both

## A3. Budget Question

**BOT SAYS** \> Good to know! What's your approximate budget per person?

Options: - Under ₹15,000 - ₹15,000--₹30,000 - ₹30,000--₹60,000 - Above
₹60,000 - Not sure yet

**Rule** - Never skip budget. - If "Not sure", continue and show a
range.

## A4. Travel Date Question

**BOT SAYS** \> When are you planning to travel?

Options: - This month - Next month - In 2--3 months - Flexible / Not
decided

## A5. Show Matched Packages

Show exactly **2--3 packages**.

Example: 1. Kerala Honeymoon --- 5N/6D --- ₹89,999 onwards 2. Kashmir
Honeymoon --- 6N/7D --- ₹72,999 onwards 3. Meghalaya Honeymoon --- 4N/5D
--- ₹45,999 onwards

Ask: - Tell me more about #1 - Tell me more about #2 - Tell me more
about #3 - Connect with team

**Rule** - Never show more than 3 packages. - Include direct URLs.

------------------------------------------------------------------------

# PATH B --- VISA SERVICES

## B1. Country Question

Ask: \> Which country do you need a visa for?

Popular: - UAE - Schengen - USA - UK - Canada - Australia - Singapore -
Japan - Vietnam - Other

## B2. Visa Type

Options: - Tourist - Business - Transit - Not sure

If Not Sure: \> Tourist visa is usually the right choice for holidays.

## B3. Travel Date

Options: - Within 2 weeks - 3--4 weeks - 1--2 months - More than 2
months - Not decided

## B4. Visa Summary

Example fields: - Processing time - Visa fee - Validity - Required
documents

Buttons: - Start application - Send checklist - More questions

**Rule** Create one template per country and swap values dynamically.

------------------------------------------------------------------------

# PATH C --- CAR RENTAL

## C1. Rental Type

Options: - Airport pickup/drop - Outstation - Local rental - Hill
station

## C2. Location + Date

Ask together: 1. Pickup city/airport 2. Date + duration

Example: \> Delhi, 15 July, 3 days

## C3. Confirmation

Confirm: - City - Date - Duration

Buttons: - Connect me now - Send on WhatsApp

------------------------------------------------------------------------

# LEAD CAPTURE

## L1. Name + WhatsApp

Ask: - Name - WhatsApp number

Example: \> Rahul, 9876543210

Rule: - Don't ask for email.

## L2. Confirmation

Confirm enquiry sent.

Mention: - Response in 1--2 hours - Business hours: 10AM--7PM

Buttons: - Another question - Open WhatsApp

Deep link: wa.me/919289602447

------------------------------------------------------------------------

# WHATSAPP TEMPLATES

## Holiday

-   Name
-   Phone
-   Service
-   Trip type
-   Destination
-   Budget
-   Travel date
-   Packages shown

## Visa

-   Name
-   Phone
-   Country
-   Visa type
-   Travel date

## Car Rental

-   Name
-   Phone
-   Rental type
-   City
-   Date
-   Duration

------------------------------------------------------------------------

# PATH D --- FAQ

## Cancellation Policy

30+ days: - Full refund minus charges

Within 15 days: - Partial refund

## Payment Methods

Accept: - UPI - Net Banking - Debit Card - Credit Card - EMI

## Custom Packages

Yes. Hotels, duration, sightseeing and itinerary can all be customized.

## Visa Processing

Examples: - UAE: 3--5 days - Singapore: 3--5 days - Schengen: 5--15
days - USA: 3--8 weeks - Canada: 3--8 weeks

Recommend applying 4--6 weeks early.

## Trust Question

MusafirBaba: - Registered travel company - Najafgarh, New Delhi - Google
Rating: 4.8 - 24,000+ travellers

Contact: +91 92896 02447

## Unknown Question

Never say: - I don't know - I can't help

Always connect to the team.

------------------------------------------------------------------------

# IDLE HANDLING

## E1. 2 Minutes Idle

> Still there? No worries if you need more time.

Send once only.

## E2. Conversation Close

> Take your time --- travel planning should feel exciting, not rushed.

Contact: - WhatsApp: +91 92896 02447 - Email: care@musafirbaba.com

End warmly.
