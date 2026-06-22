/**
 * Intent Extraction Service
 * Identifies the user's intent from their raw text message using regex and keyword matching.
 * This replaces the need for NLP/ML intent extraction models.
 */

const INTENTS = {
  GREETING: "GREETING",
  VISA_INQUIRY: "VISA_INQUIRY",
  PACKAGE_INQUIRY: "PACKAGE_INQUIRY",
  RENTAL_INQUIRY: "RENTAL_INQUIRY",
  CONTACT: "CONTACT",
  CANCEL: "CANCEL",
  UNCERTAIN: "UNCERTAIN",
  UNKNOWN: "UNKNOWN",
};

const KEYWORDS = {
  GREETING: ["hello", "hi", "hey", "start", "greetings"],
  VISA_INQUIRY: ["visa", "permit", "evisa", "immigration"],
  PACKAGE_INQUIRY: ["package", "tour", "holiday", "trip", "vacation"],
  RENTAL_INQUIRY: ["rental", "car", "cab", "vehicle", "hire", "taxi"],
  CONTACT: ["human", "agent", "contact", "support", "call", "representative"],
  CANCEL: ["cancel", "stop", "reset", "start over", "clear", "quit", "exit"],
  UNCERTAIN: ["no idea", "not sure", "haven't figured", "don't know", "not decided", "no location", "nothing", "no", "nope", "nevermind", "not yet"],
};

// Common destinations to extract as basic entities
const DESTINATIONS = ["dubai", "thailand", "singapore", "malaysia", "europe", "schengen", "usa", "uk", "bali"];

export const extractIntent = (message) => {
  if (!message) return { intent: INTENTS.UNKNOWN, entities: {} };

  const lowerMsg = message.toLowerCase();
  let detectedIntent = INTENTS.UNKNOWN;
  const entities = {};

  // Check for Cancel/Reset first
  if (KEYWORDS.CANCEL.some((kw) => new RegExp(`\\b${kw}\\b`).test(lowerMsg))) {
    return { intent: INTENTS.CANCEL, entities };
  }

  // Check for Uncertain/Negative responses
  if (KEYWORDS.UNCERTAIN.some((kw) => new RegExp(`\\b${kw}\\b`).test(lowerMsg))) {
    return { intent: INTENTS.UNCERTAIN, entities };
  }

  // Check Greetings
  if (KEYWORDS.GREETING.some((kw) => lowerMsg.split(" ").includes(kw))) {
    detectedIntent = INTENTS.GREETING;
  }

  // Check Contact
  if (KEYWORDS.CONTACT.some((kw) => lowerMsg.includes(kw))) {
    detectedIntent = INTENTS.CONTACT;
  }

  // Check Visa
  if (KEYWORDS.VISA_INQUIRY.some((kw) => lowerMsg.includes(kw))) {
    detectedIntent = INTENTS.VISA_INQUIRY;
  }

  // Check Rental
  if (KEYWORDS.RENTAL_INQUIRY.some((kw) => lowerMsg.includes(kw))) {
    detectedIntent = INTENTS.RENTAL_INQUIRY;
  }

  // Check Package (can override Visa/Rental if present, or we can prioritize)
  if (KEYWORDS.PACKAGE_INQUIRY.some((kw) => lowerMsg.includes(kw))) {
    detectedIntent = INTENTS.PACKAGE_INQUIRY;
  }

  // Extract basic entities (Destination)
  const foundDestination = DESTINATIONS.find((dest) => lowerMsg.includes(dest));
  if (foundDestination) {
    entities.destination = foundDestination;
  }

  return {
    intent: detectedIntent,
    entities,
  };
};

export { INTENTS };
