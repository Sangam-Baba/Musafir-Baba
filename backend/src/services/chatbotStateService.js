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
  VISA_AWAITING_DESTINATION: "VISA_AWAITING_DESTINATION",
  VISA_AWAITING_PURPOSE: "VISA_AWAITING_PURPOSE",
  // Package Flow
  PKG_AWAITING_DESTINATION: "PKG_AWAITING_DESTINATION",
  PKG_AWAITING_BUDGET: "PKG_AWAITING_BUDGET",
  PKG_AWAITING_TRAVELERS: "PKG_AWAITING_TRAVELERS",
  // Rental Flow
  RENTAL_AWAITING_LOCATION: "RENTAL_AWAITING_LOCATION",
  // Contact Flow
  CONTACT_AWAITING_NAME: "CONTACT_AWAITING_NAME",
  CONTACT_AWAITING_PHONE: "CONTACT_AWAITING_PHONE",
  CONTACT_AWAITING_EMAIL: "CONTACT_AWAITING_EMAIL",
};

const isValidName = (name) => {
  if (!/^[a-zA-Z\s]{2,50}$/.test(name)) return false;
  
  const lower = name.toLowerCase();
  
  // Must have at least one vowel if it's more than 2 chars
  if (lower.length > 2 && !/[aeiouy]/.test(lower)) return false;
  
  // Reject 4 consecutive identical characters (e.g. aaaa)
  if (/(.)\1{3,}/.test(lower)) return false;
  
  // Reject 5 or more consecutive consonants
  if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(lower)) return false;
  
  // Reject common keyboard mashing sequences
  if (/(asdf|fdsa|qwer|rewq|zxcv|vcxz|hjkl|lkjh|tyui|iuyt)/.test(lower)) return false;
  
  // Reject if it has more than one occurrence of 4 consecutive consonants
  const fourConsonants = lower.match(/[bcdfghjklmnpqrstvwxz]{4}/g);
  if (fourConsonants && fourConsonants.length > 1) return false;

  return true;
};

export const processState = async (session, message, entities, intent) => {
  let responseText = "";
  let quickReplies = [];
  let responseUrl = "";
  let isFlowComplete = false;

  const { currentState, context } = session;

  // Handle uncertain/negative intent during a flow gracefully
  if (intent === "UNCERTAIN") {
    if (currentState.startsWith("VISA_") || currentState.startsWith("PKG_") || currentState.startsWith("RENTAL_")) {
      session.currentState = STATES.CONTACT_AWAITING_NAME;
      session.context = {};
      session.markModified("context");
      await session.save();
      return {
        responseText: "No worries! Since you haven't decided yet, I can arrange a call with our travel experts to help you figure it out. May I have your name?",
        quickReplies: [],
        responseUrl: "",
        isFlowComplete: false,
      };
    }
  }

  switch (currentState) {
    // --- VISA FLOW ---
    case STATES.VISA_AWAITING_DESTINATION:
      if (entities.destination || message) {
        context.destination = entities.destination || message;
        session.currentState = STATES.VISA_AWAITING_PURPOSE;
        responseText = `Got it. What is the purpose of your travel to ${context.destination}? (e.g., Tourist, Business, Transit)`;
        quickReplies = ["Tourist", "Business", "Transit"];
      }
      break;

    case STATES.VISA_AWAITING_PURPOSE:
      context.purpose = message;
      session.currentState = STATES.IDLE;
      isFlowComplete = true;
      
      const visaSearch = await KnowledgeBase.find(
        { $text: { $search: `${context.destination} visa` }, category: "visa" },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } }).limit(1);

      if (visaSearch.length > 0) {
        const snippet = visaSearch[0].content.length > 150 ? visaSearch[0].content.substring(0, 150) + "..." : visaSearch[0].content;
        responseText = `Perfect. I found details for ${context.destination}:\n\n${snippet}`;
        responseUrl = visaSearch[0].url;
      } else {
        responseText = `I have noted you need a ${context.purpose} visa for ${context.destination}. Our agent will contact you with exact details.`;
        quickReplies = ["Talk to an Agent"];
      }
      break;

    // --- PACKAGE FLOW ---
    case STATES.PKG_AWAITING_DESTINATION:
      if (entities.destination || message) {
        context.destination = entities.destination || message;
        session.currentState = STATES.PKG_AWAITING_BUDGET;
        responseText = `Great choice! What is your estimated budget per person for ${context.destination}?`;
      }
      break;

    case STATES.PKG_AWAITING_BUDGET:
      context.budget = message;
      session.currentState = STATES.PKG_AWAITING_TRAVELERS;
      responseText = "Noted. How many people are traveling?";
      quickReplies = ["1", "2", "3-5", "6+"];
      break;

    case STATES.PKG_AWAITING_TRAVELERS:
      context.travelers = message;
      session.currentState = STATES.IDLE;
      isFlowComplete = true;

      const pkgSearch = await KnowledgeBase.find(
        { $text: { $search: `${context.destination} holiday package` }, category: "package" },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } }).limit(1);

      if (pkgSearch.length > 0) {
        const snippet = pkgSearch[0].content.length > 150 ? pkgSearch[0].content.substring(0, 150) + "..." : pkgSearch[0].content;
        responseText = `Awesome. Searching for packages to ${context.destination} within ${context.budget}...\n\nHere is a great option:\n${snippet}`;
        responseUrl = pkgSearch[0].url;
      } else {
        responseText = `Awesome. I have noted your requirements for ${context.destination}. Our holiday experts will contact you with the best packages matching your budget.`;
        quickReplies = ["Talk to an Agent"];
      }
      break;

    // --- RENTAL FLOW ---
    case STATES.RENTAL_AWAITING_LOCATION:
      context.location = entities.destination || message;
      session.currentState = STATES.IDLE;
      isFlowComplete = true;

      const rentalSearch = await KnowledgeBase.find(
        { $text: { $search: `${context.location} rental car vehicle cab` }, category: "rental" },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } }).limit(1);

      if (rentalSearch.length > 0) {
        const snippet = rentalSearch[0].content.length > 150 ? rentalSearch[0].content.substring(0, 150) + "..." : rentalSearch[0].content;
        responseText = `Great! I found some vehicle rental options in ${context.location}:\n\n${snippet}`;
        responseUrl = rentalSearch[0].url;
      } else {
        responseText = `I've noted that you're looking for a vehicle rental in ${context.location}. Our team will contact you shortly with available options!`;
        quickReplies = ["Talk to an Agent"];
      }
      break;

    // --- CONTACT FLOW ---
    case STATES.CONTACT_AWAITING_NAME:
      if (!isValidName(message)) {
        responseText = "Please enter a valid real name using only letters (keyboard mashing is not allowed).";
        quickReplies = [];
        break;
      }
      context.name = message;
      session.currentState = STATES.CONTACT_AWAITING_PHONE;
      responseText = `Nice to meet you, ${context.name}. What is your phone number with country code so our team can reach you?`;
      break;

    case STATES.CONTACT_AWAITING_PHONE:
      if (!/^\+?[0-9\s-]{8,15}$/.test(message)) {
        responseText = "Please enter a valid phone number (e.g., +919876543210).";
        quickReplies = [];
        break;
      }
      context.phone = message;
      session.currentState = STATES.CONTACT_AWAITING_EMAIL;
      responseText = "Got it! Lastly, what is your email address?";
      break;

    case STATES.CONTACT_AWAITING_EMAIL:
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message)) {
        responseText = "Please enter a valid email address.";
        quickReplies = [];
        break;
      }
      context.email = message;
      session.currentState = STATES.IDLE;
      isFlowComplete = true;
      responseText = "Thank you! I have saved your details. Our representative will contact you shortly.";
      
      // Save Lead
      try {
        let leadMessage = "Chatbot Enquiry";
        if (context.serviceType) {
          leadMessage = `Service: ${context.serviceType}\n`;
        } else {
          leadMessage = `Service: General Enquiry\n`;
        }
        if (context.destination) leadMessage += `Destination: ${context.destination}\n`;
        if (context.location) leadMessage += `Location: ${context.location}\n`;
        if (context.budget) leadMessage += `Budget: ${context.budget}\n`;

        const contact = await ContactEnquiry.create({
          name: context.name,
          phone: context.phone,
          email: context.email,
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
                    <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; font-weight: 500; color: #888888;">Email</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2;">
                      <a href="mailto:${contact.email}" style="color: #111111; text-decoration: none;">${contact.email || "N/A"}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; font-weight: 500; color: #888888;">Phone</td>
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
                  ${contact.message}
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 30px 20px; border-top: 1px solid #eaeaea; margin-top: 20px;">
              <p style="font-size: 12px; color: #999999; margin: 0;">Automated notification from MusafirBaba Chatbot</p>
            </div>
          </div>
        `;
        const toEmail = process.env.NODE_ENV === "development" ? "shubham.jauhari@musafirbaba.com" : "care@musafirbaba.com";
        await sendEmail(toEmail, subject, emailBody);

        // Send Email to Client
        const clientSubject = "Thank you for reaching out to us.";
        const clientEmailBody = thankYouEnquirySubmit(context.name);
        await sendEmail(context.email, clientSubject, clientEmailBody);

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
