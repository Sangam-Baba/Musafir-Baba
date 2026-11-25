// @ts-check
/** Bell and email texts for bus operators (Stage 18) — merged into TEMPLATES. */
export const BUS_TEMPLATES = Object.freeze({
  'bus.vehicle-approved': {
    version: 1,
    vars: ['orgName', 'link'],
    title: 'Bus approved',
    body: 'A {{orgName}} bus has been approved by MusafirBaba. Add its routes and schedules to start selling seats.',
    subject: 'Your bus is approved on MusafirBaba',
    text: 'Hello,\n\nA {{orgName}} bus has been approved by MusafirBaba. Add its routes and schedules to start selling seats.\n\nOpen My Buses: {{link}}\n\nMusafirBaba Business',
  },
  'bus.vehicle-changes': {
    version: 1,
    vars: ['orgName', 'link'],
    title: 'Bus needs changes',
    body: 'MusafirBaba asked for changes to a {{orgName}} bus. Open My Buses to see the note and send it again.',
    subject: 'Changes needed for your bus on MusafirBaba',
    text: 'Hello,\n\nMusafirBaba asked for changes to a {{orgName}} bus. Open My Buses to see the note and send it again.\n\nOpen My Buses: {{link}}\n\nMusafirBaba Business',
  },
  'bus.vehicle-suspended': {
    version: 1,
    vars: ['orgName', 'link'],
    title: 'Bus suspended',
    body: 'A {{orgName}} bus was suspended by MusafirBaba and is not selling. Open My Buses for the reason.',
    subject: 'Your bus was suspended on MusafirBaba',
    text: 'Hello,\n\nA {{orgName}} bus was suspended by MusafirBaba and is not selling. Open My Buses for the reason.\n\nOpen My Buses: {{link}}\n\nMusafirBaba Business',
  },
  'bus.paper-expiring': {
    version: 1,
    vars: ['orgName', 'link'],
    title: 'Bus papers expiring soon',
    body: 'Papers of a {{orgName}} bus expire soon. Upload the renewed paper so the bus keeps selling.',
    subject: 'Your bus papers expire soon',
    text: 'Hello,\n\nPapers of a {{orgName}} bus expire soon. Upload the renewed paper so the bus keeps selling.\n\nOpen My Buses: {{link}}\n\nMusafirBaba Business',
  },
  'bus.paper-expired': {
    version: 1,
    vars: ['orgName', 'link'],
    title: 'Bus papers expired',
    body: 'Papers of a {{orgName}} bus have expired, so the bus has stopped selling. Upload the renewed paper to start again.',
    subject: 'Your bus papers have expired — the bus stopped selling',
    text: 'Hello,\n\nPapers of a {{orgName}} bus have expired, so the bus has stopped selling. Upload the renewed paper to start again.\n\nOpen My Buses: {{link}}\n\nMusafirBaba Business',
  },
});
