/**
 * Chatbot Controller
 */

import crypto from "crypto";
import ChatSession from "../models/ChatSession.js";
import ChatMessage from "../models/ChatMessage.js";
import KnowledgeBase from "../models/KnowledgeBase.js";
import { extractIntent, INTENTS } from "../services/chatbotIntentService.js";
import { processState, STATES } from "../services/chatbotStateService.js";
import { syncKnowledgeBase } from "../services/chatbotSyncService.js";

export const queryChatbot = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // 1. Manage Session
    let sid = sessionId;
    if (!sid) {
      sid = crypto.randomUUID();
    }
    
    let session = await ChatSession.findOne({ sessionId: sid });
    if (!session) {
      session = await ChatSession.create({ sessionId: sid });
    }

    // Save User Message
    await ChatMessage.create({ sessionId: sid, sender: "user", message });

    let responseText = "";
    let quickReplies = [];
    let responseUrl = "";

    // 2. Extract Intent (if idle)
    const { intent, entities } = extractIntent(message);

    // Handle global CANCEL/RESET intent
    if (intent === INTENTS.CANCEL) {
      session.currentState = STATES.IDLE;
      session.context = {};
      await session.save();
      responseText = "Sure, I've cleared the context. How can I help you now?";
      await ChatMessage.create({ sessionId: sid, sender: "bot", message: responseText });
      return res.json({ sessionId: sid, response: responseText, quickReplies: ["Plan a holiday trip", "Apply for a visa", "Book a car rental", "Something else"] });
    }

    // 3. Process State Machine
    if (session.currentState !== STATES.IDLE) {
      const stateResult = await processState(session, message, entities, intent);
      responseText = stateResult.responseText;
      quickReplies = stateResult.quickReplies;
      if (stateResult.responseUrl) {
        responseUrl = stateResult.responseUrl;
      }
    } else {
      // If IDLE, check intent to start a flow
      switch (intent) {
        case INTENTS.GREETING:
          responseText = "Namaste! I'm Baba — your travel assistant from MusafirBaba.\n\nI can help you plan a holiday, apply for a visa, or arrange a car rental. What are you looking for today?";
          quickReplies = ["Plan a holiday trip", "Apply for a visa", "Book a car rental", "Something else"];
          break;
        case INTENTS.VISA_INQUIRY:
          session.context = { serviceType: "Visa" };
          if (entities.destination) {
            session.currentState = STATES.VISA_AWAITING_TYPE;
            session.context.destination = entities.destination;
            await session.save();
            responseText = `Sure, I can help with a visa for ${entities.destination}!\n\nWhat type of visa do you need?`;
            quickReplies = ["Tourist Visa", "Business Visa", "Transit Visa", "Not sure — Help me decide"];
          } else {
            session.currentState = STATES.VISA_AWAITING_COUNTRY;
            await session.save();
            responseText = "Sure, I can help with that!\n\nWhich country do you need a visa for?\nYou can type the country name or pick one below.";
            quickReplies = ["UAE / Dubai", "Schengen / Europe", "USA", "UK", "Canada", "Australia", "Singapore", "Japan", "Vietnam", "Other Country"];
          }
          break;
        case INTENTS.PACKAGE_INQUIRY:
          session.context = { serviceType: "Package" };
          if (entities.destination) {
            session.currentState = STATES.PKG_AWAITING_BUDGET;
            session.context.destination = entities.destination;
            await session.save();
            responseText = `Great choice! I can help you plan a trip to ${entities.destination}.\n\nWhat's your approximate budget per person?`;
            quickReplies = ["Under ₹15,000", "₹15,000 – ₹30,000", "₹30,000 – ₹60,000", "Above ₹60,000", "Not sure yet"];
          } else {
            session.currentState = STATES.PKG_AWAITING_TRIP_TYPE;
            await session.save();
            responseText = "Great choice! Let me find the best options for you.\n\nFirst — what kind of trip are you planning?";
            quickReplies = ["Honeymoon", "Family vacation", "Group tour", "Solo / Friends", "Religious / Pilgrimage", "Adventure / Trek"];
          }
          break;
        case INTENTS.RENTAL_INQUIRY:
          session.context = { serviceType: "Rental" };
          if (entities.destination) {
            session.currentState = STATES.RENTAL_AWAITING_TYPE;
            session.context.locationDate = entities.destination;
            await session.save();
            responseText = `Happy to help with a car rental for ${entities.destination}!\n\nWhat kind of rental are you looking for?`;
            quickReplies = ["Airport Pickup / Drop", "Outstation Trip", "Local Rental (Full Day)", "Hill Station Drive"];
          } else {
            session.currentState = STATES.RENTAL_AWAITING_TYPE;
            await session.save();
            responseText = "Happy to help with a car rental!\n\nWhat kind of rental are you looking for?";
            quickReplies = ["Airport Pickup / Drop", "Outstation Trip", "Local Rental (Full Day)", "Hill Station Drive"];
          }
          break;
        case INTENTS.CONTACT:
          session.currentState = STATES.CONTACT_AWAITING_NAME;
          await session.save();
          responseText = "I can arrange a call with our travel experts.\n\nMay I have your name?";
          break;
        case INTENTS.UNCERTAIN:
          session.currentState = STATES.CONTACT_AWAITING_NAME;
          await session.save();
          responseText = "No worries! Our travel experts can help you figure it out.\n\nMay I have your name so we can arrange a callback?";
          break;
        default:
          // 4. Fallback: Native MongoDB Text Search
          const searchResults = await KnowledgeBase.find(
            { $text: { $search: message } },
            { score: { $meta: "textScore" } }
          )
          .sort({ score: { $meta: "textScore" } })
          .limit(1);

          if (searchResults.length > 0 && searchResults[0]._doc.score > 1.2) {
            const kbTitle = searchResults[0].title || "this topic";
            const snippet = searchResults[0].content.length > 150 
              ? searchResults[0].content.substring(0, 150) + "..." 
              : searchResults[0].content;
            
            responseText = `Here is some information regarding ${kbTitle}:\n\n"${snippet}"`;
            if (searchResults[0].url) {
              responseUrl = searchResults[0].url;
            }
          } else {
            responseText = "I'm not quite sure I understand. Would you like to speak to a human representative?";
            quickReplies = ["Yes, contact agent", "No, I'll ask something else"];
            // Optionally auto-transition to CONTACT_AWAITING_NAME here
          }
          break;
      }
    }

    // Save Bot Message
    await ChatMessage.create({ 
      sessionId: sid, 
      sender: "bot", 
      message: responseText, 
      url: responseUrl || undefined,
      quickReplies: quickReplies.length > 0 ? quickReplies : undefined
    });

    // Update last activity
    session.lastActivity = new Date();
    await session.save();

    res.json({
      sessionId: sid,
      response: responseText,
      quickReplies,
      url: responseUrl || undefined,
    });

  } catch (error) {
    console.error("Chatbot Query Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await ChatMessage.find({ sessionId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
};

export const syncKB = async (req, res) => {
  try {
    const count = await syncKnowledgeBase();
    res.json({ message: "Knowledge base synced successfully", count });
  } catch (error) {
    res.status(500).json({ error: "Failed to sync" });
  }
};
