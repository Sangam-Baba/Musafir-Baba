/**
 * State Machine Service for Chatbot Flows
 * Handles multi-step conversations (Visa, Package, Lead capture).
 */

import ChatSession from "../models/ChatSession.js";
import { ContactEnquiry } from "../models/ContactInquiry.js";
import KnowledgeBase from "../models/KnowledgeBase.js";
import sendEmail from "./email.service.js";
import { thankYouEnquirySubmit } from "../utils/thankYouEnquirySubmit.js";

// Define States
const STATES = {
  IDLE: "IDLE",
  // Visa Flow
  VISA_AWAITING_COUNTRY: "VISA_AWAITING_COUNTRY",
  VISA_AWAITING_TYPE: "VISA_AWAITING_TYPE",
  VISA_AWAITING_TOURIST_CONFIRM: "VISA_AWAITING_TOURIST_CONFIRM",
  VISA_AWAITING_DATES: "VISA_AWAITING_DATES",
  // Package Flow
  PKG_AWAITING_TRIP_TYPE: "PKG_AWAITING_TRIP_TYPE",
  PKG_AWAITING_DESTINATION_CHOICE: "PKG_AWAITING_DESTINATION_CHOICE",
  PKG_AWAITING_DESTINATION_NAME: "PKG_AWAITING_DESTINATION_NAME",
  PKG_AWAITING_SUGGESTION: "PKG_AWAITING_SUGGESTION",
  PKG_AWAITING_BUDGET: "PKG_AWAITING_BUDGET",
  PKG_AWAITING_DATES: "PKG_AWAITING_DATES",
  // Rental Flow
  RENTAL_AWAITING_TYPE: "RENTAL_AWAITING_TYPE",
  RENTAL_AWAITING_LOCATION: "RENTAL_AWAITING_LOCATION",
  RENTAL_AWAITING_DATE: "RENTAL_AWAITING_DATE",
  // Contact Flow
  CONTACT_AWAITING_NAME: "CONTACT_AWAITING_NAME",
  CONTACT_AWAITING_PHONE: "CONTACT_AWAITING_PHONE",
};

export const processState = async (session, message, entities, intent) => {
  let responseText = "";
  let quickReplies = [];
  let responseUrl = "";
  let isFlowComplete = false;

  const { currentState, context } = session;

  // Handle uncertain/negative intent during a flow gracefully
  const excludedUncertainStates = [
    STATES.VISA_AWAITING_TOURIST_CONFIRM,
    STATES.VISA_AWAITING_TYPE,
    STATES.PKG_AWAITING_DESTINATION_CHOICE,
    STATES.PKG_AWAITING_BUDGET
  ];

  if (intent === "UNCERTAIN" && !excludedUncertainStates.includes(currentState)) {
    if (currentState.startsWith("VISA_") || currentState.startsWith("PKG_") || currentState.startsWith("RENTAL_")) {
      session.currentState = STATES.CONTACT_AWAITING_NAME;
      session.context = {};
      session.markModified("context");
      await session.save();
      return {
        responseText: "No worries! Since you haven't decided yet, I can arrange a call with our travel experts to help you figure it out.\n\nMay I have your name?",
        quickReplies: [],
        responseUrl: "",
        isFlowComplete: false,
      };
    }
  }

  switch (currentState) {
    // --- VISA FLOW ---
    case STATES.VISA_AWAITING_COUNTRY:
      context.destination = entities.destination || message;
      session.currentState = STATES.VISA_AWAITING_TYPE;
      responseText = `Got it!\n\nWhat type of visa do you need for ${context.destination}?`;
      quickReplies = ["Tourist Visa", "Business Visa", "Transit Visa", "Not sure — Help me decide"];
      break;

    case STATES.VISA_AWAITING_TYPE:
      context.purpose = message;
      if (message.toLowerCase().includes("not sure")) {
        session.currentState = STATES.VISA_AWAITING_TOURIST_CONFIRM;
        responseText = "For travel and holidays, a Tourist visa is usually the right one.\n\nShall I proceed with that?";
        quickReplies = ["Yes, proceed", "No, I need something else"];
      } else {
        session.currentState = STATES.VISA_AWAITING_DATES;
        responseText = "When are you planning to travel?\n\nThis helps me check if processing time works for your trip.";
        quickReplies = ["Within 2 weeks", "In 3–4 weeks", "In 1–2 months", "More than 2 months away", "Not decided yet"];
      }
      break;

    case STATES.VISA_AWAITING_TOURIST_CONFIRM:
      if (message.toLowerCase().includes("yes") || intent === "GREETING") {
        context.purpose = "Tourist Visa";
        session.currentState = STATES.VISA_AWAITING_DATES;
        responseText = "When are you planning to travel?\n\nThis helps me check if processing time works for your trip.";
        quickReplies = ["Within 2 weeks", "In 3–4 weeks", "In 1–2 months", "More than 2 months away", "Not decided yet"];
      } else {
        session.currentState = STATES.CONTACT_AWAITING_NAME;
        responseText = "No problem! To connect you with our visa experts to find the right visa, I just need your name.";
      }
      break;

    case STATES.VISA_AWAITING_DATES:
      context.travelDate = message;
      session.currentState = STATES.IDLE;
      isFlowComplete = true;
      
      const visaSearch = await KnowledgeBase.find(
        { $text: { $search: `${context.destination} visa` }, category: "visa" },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } }).limit(1);

      if (visaSearch.length > 0) {
        const snippet = visaSearch[0].content.length > 150 ? visaSearch[0].content.substring(0, 150) + "..." : visaSearch[0].content;
        responseText = `Perfect. I found details for ${context.destination}:\n\n${snippet}\n\nWe handle the full application for you — no embassy visits needed. Want me to get the process started?`;
        responseUrl = visaSearch[0].url;
      } else {
        responseText = `I have noted you need a ${context.purpose || "Tourist"} visa for ${context.destination} traveling ${context.travelDate}. Our agent will contact you with exact details.`;
      }
      quickReplies = ["Connect with team"];
      break;

    // --- PACKAGE FLOW ---
    case STATES.PKG_AWAITING_TRIP_TYPE:
      context.tripType = message;
      session.currentState = STATES.PKG_AWAITING_DESTINATION_CHOICE;
      responseText = "Perfect! Do you have a destination in mind, or would you like me to suggest something?";
      quickReplies = ["I have a destination", "Suggest something"];
      break;

    case STATES.PKG_AWAITING_DESTINATION_CHOICE:
      const msgLower = message.toLowerCase();
      if (msgLower.includes("suggest") || intent === "UNCERTAIN" || msgLower === "no" || msgLower.includes("don't")) {
        session.currentState = STATES.PKG_AWAITING_SUGGESTION;
        responseText = "No problem!\n\nAre you thinking domestic — somewhere in India — or an international trip?";
        quickReplies = ["Within India", "International", "Open to both"];
      } else if (entities.destination || (!msgLower.includes("have a destination") && msgLower.length > 2)) {
        // User typed a destination directly (e.g. "Dubai") instead of clicking "I have a destination"
        context.destination = entities.destination || message;
        session.currentState = STATES.PKG_AWAITING_BUDGET;
        responseText = `Got it! ${context.destination} is a great choice.\n\nWhat's your approximate budget per person?`;
        quickReplies = ["Under ₹15,000", "₹15,000 – ₹30,000", "₹30,000 – ₹60,000", "Above ₹60,000", "Not sure yet"];
      } else {
        session.currentState = STATES.PKG_AWAITING_DESTINATION_NAME;
        responseText = "Which destination are you thinking of?\n\nYou can type it or pick a popular one below.";
        quickReplies = ["Kashmir", "Meghalaya", "Kerala", "Rajasthan", "Himachal", "Bali", "Dubai", "Europe"];
      }
      break;

    case STATES.PKG_AWAITING_SUGGESTION:
    case STATES.PKG_AWAITING_DESTINATION_NAME:
      context.destination = entities.destination || message;
      session.currentState = STATES.PKG_AWAITING_BUDGET;
      responseText = "Good to know!\n\nWhat's your approximate budget per person?";
      quickReplies = ["Under ₹15,000", "₹15,000 – ₹30,000", "₹30,000 – ₹60,000", "Above ₹60,000", "Not sure yet"];
      break;

    case STATES.PKG_AWAITING_BUDGET:
      context.budget = message;
      session.currentState = STATES.PKG_AWAITING_DATES;
      responseText = "When are you planning to travel?";
      quickReplies = ["This month", "Next month", "In 2–3 months", "Flexible / Not decided"];
      break;

    case STATES.PKG_AWAITING_DATES:
      context.travelDate = message;
      session.currentState = STATES.IDLE;
      isFlowComplete = true;

      const pkgSearch = await KnowledgeBase.find(
        { $text: { $search: `${context.destination} holiday package` }, category: "package" },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } }).limit(2);

      if (pkgSearch.length > 0) {
        responseText = `Based on what you've told me, here are our top picks for you:\n\n`;
        pkgSearch.forEach((pkg, index) => {
          const absoluteUrl = pkg.url ? (process.env.NEXT_PUBLIC_BASE_URL || "https://musafirbaba.com") + pkg.url : "";
          responseText += `${index + 1}. ${pkg.title}\n${absoluteUrl}\n\n`;
        });
        responseText += `Would you like more details on any of these, or shall I connect you with our team to customise one for you?`;
      } else {
        responseText = `Awesome. I have noted your requirements for ${context.destination}. Our holiday experts will contact you with the best packages matching your budget.`;
      }
      quickReplies = ["Connect with team"];
      break;

    // --- RENTAL FLOW ---
    case STATES.RENTAL_AWAITING_TYPE:
      context.rentalType = message;
      session.currentState = STATES.RENTAL_AWAITING_LOCATION;
      responseText = "Got it!\n\nWhere do you need the car from? (e.g., Delhi, Mumbai, Airport)";
      break;

    case STATES.RENTAL_AWAITING_LOCATION:
      context.location = message;
      session.currentState = STATES.RENTAL_AWAITING_DATE;
      responseText = "Perfect! What date and for how many days?";
      quickReplies = ["Tomorrow", "This weekend", "Next week", "Not decided yet"];
      break;

    case STATES.RENTAL_AWAITING_DATE:
      context.date = message;
      session.currentState = STATES.IDLE;
      isFlowComplete = true;

      responseText = `Thanks!\n\nLet me check availability for a ${context.rentalType} in ${context.location} based on those details. Our team will confirm pricing within 1–2 hours.`;
      quickReplies = ["Connect me now", "Send details on WhatsApp"];
      break;

    // --- CONTACT FLOW ---
    case STATES.CONTACT_AWAITING_NAME:
      if (message.trim().length < 2) {
        responseText = "Please provide a valid name.";
        quickReplies = [];
        break;
      }
      context.name = message.trim();
      session.currentState = STATES.CONTACT_AWAITING_PHONE;
      responseText = `Thanks ${context.name}!\n\nWhat is your WhatsApp number? Please include the country code (e.g., +91 9876543210 or +1 234567890).`;
      quickReplies = [];
      break;

    case STATES.CONTACT_AWAITING_PHONE:
      // Extract phone number with optional country code, allows various formats
      const phoneMatch = message.match(/(?:\+?\d{1,4}[\s\-]?)?(?:\(?\d{2,4}\)?[\s\-]?)?\d{3,4}[\s\-]?\d{3,4}[\s\-]?\d{0,4}/);
      
      // Simple validation: must contain at least 7 digits in total
      const digitCount = message.replace(/\D/g, "").length;
      if (!phoneMatch || digitCount < 7) {
        responseText = "Please provide a valid phone number with your country code (e.g., +91 9876543210).";
        quickReplies = [];
        break;
      }
      
      context.phone = phoneMatch[0].trim();
      session.currentState = STATES.IDLE;
      isFlowComplete = true;
      responseText = `Got it, ${context.name}!\n\nYour enquiry has been sent to our team. One of our travel experts will contact you on WhatsApp within 1–2 hours during business hours.\n\nIs there anything else I can help you with?`;
      quickReplies = ["I have another question", "Open WhatsApp directly"];
      
      // Save Lead
      try {
        let leadMessage = "Chatbot Enquiry\n";
        if (context.serviceType) {
          leadMessage += `Service: ${context.serviceType}\n`;
        } else {
          leadMessage += `Service: General Enquiry\n`;
        }
        if (context.tripType) leadMessage += `Trip Type: ${context.tripType}\n`;
        if (context.destination) leadMessage += `Destination: ${context.destination}\n`;
        if (context.rentalType) leadMessage += `Rental: ${context.rentalType}\n`;
        if (context.location) leadMessage += `Location: ${context.location}\n`;
        if (context.date) leadMessage += `Date: ${context.date}\n`;
        if (context.budget) leadMessage += `Budget: ${context.budget}\n`;
        if (context.travelDate) leadMessage += `Travel Dates: ${context.travelDate}\n`;

        const contact = await ContactEnquiry.create({
          name: context.name,
          phone: context.phone,
          message: leadMessage,
          source: "chatbot",
        });

        // Send Email to Admin
        const subject = "New Contact Enquiry: " + context.name;
        const emailBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333; line-height: 1.6;">
            <!-- Header -->
            <div style="text-align: center; padding: 40px 0 30px; border-bottom: 1px solid #eaeaea;">
              <img src="https://cdn.musafirbaba.com/images/logo.png" alt="MusafirBaba" style="max-width: 180px; height: auto;" />
            </div>
            
            <!-- Intro -->
            <div style="padding: 40px 20px 20px;">
              <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 5px; color: #111111;">New Website Enquiry</h2>
              <p style="font-size: 14px; color: #666666; margin: 0 0 30px;">A new contact request has been submitted from the Chatbot.</p>
              
              <!-- Details -->
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tbody>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; font-weight: 500; width: 120px; color: #888888;">Name</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; color: #111111;">${contact.name || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; font-weight: 500; color: #888888;">WhatsApp</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; color: #111111;">
                      ${contact.phone || "N/A"} 
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; font-weight: 500; color: #888888;">Source</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; color: #111111;">
                      Chatbot
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <!-- Message -->
              <div style="margin-top: 30px;">
                <p style="font-size: 14px; font-weight: 500; color: #888888; margin-bottom: 10px;">Interests & Message</p>
                <div style="font-size: 14px; color: #111111; line-height: 1.8; background-color: #fafafa; padding: 20px; border-radius: 6px;">
                  ${contact.message.replace(/\n/g, '<br/>')}
                </div>
              </div>
            </div>
          </div>
        `;
        const toEmail = process.env.NODE_ENV === "development" ? "shubham.jauhari@musafirbaba.com" : "care@musafirbaba.com";
        await sendEmail(toEmail, subject, emailBody);

      } catch (err) {
        console.error("Failed to save and send chatbot lead", err);
      }
      break;

    default:
      session.currentState = STATES.IDLE;
      responseText = "I'm not sure how to handle that step.";
  }

  // Save session updates
  session.context = context;
  session.markModified("context");
  await session.save();

  return {
    responseText,
    quickReplies,
    responseUrl,
    isFlowComplete,
  };
};

export { STATES };
