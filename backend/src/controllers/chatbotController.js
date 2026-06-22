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
      return res.json({ sessionId: sid, response: responseText, quickReplies: ["Need a Visa", "Holiday Packages", "Vehicle Rentals"] });
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
          responseText = "Hello! I am your Musafir Baba travel assistant. How can I help you today?";
          quickReplies = ["Need a Visa", "Holiday Packages", "Vehicle Rentals", "Talk to an Agent"];
          break;
        case INTENTS.VISA_INQUIRY:
          session.currentState = STATES.VISA_AWAITING_DESTINATION;
          session.context = { serviceType: "Visa" };
          await session.save();
          if (entities.destination) {
            // fast-forward
            const stateResult = await processState(session, message, entities, intent);
            responseText = stateResult.responseText;
            quickReplies = stateResult.quickReplies;
          } else {
            responseText = "I can help with Visas. Which country are you planning to visit?";
          }
          break;
        case INTENTS.PACKAGE_INQUIRY:
          session.currentState = STATES.PKG_AWAITING_DESTINATION;
          session.context = { serviceType: "Package" };
          await session.save();
          if (entities.destination) {
            // fast-forward
            const stateResult = await processState(session, message, entities, intent);
            responseText = stateResult.responseText;
            quickReplies = stateResult.quickReplies;
          } else {
            responseText = "Looking for a holiday? Which destination do you have in mind?";
          }
          break;
        case INTENTS.RENTAL_INQUIRY:
          session.currentState = STATES.RENTAL_AWAITING_LOCATION;
          session.context = { serviceType: "Rental" };
          await session.save();
          if (entities.destination) {
            // fast-forward
            const stateResult = await processState(session, message, entities, intent);
            responseText = stateResult.responseText;
            quickReplies = stateResult.quickReplies;
          } else {
            responseText = "I can help you find a rental vehicle. Which city or location do you need it for?";
          }
          break;
        case INTENTS.CONTACT:
          session.currentState = STATES.CONTACT_AWAITING_NAME;
          await session.save();
          responseText = "I can arrange a call with our travel experts. May I have your name?";
          break;
        case INTENTS.UNCERTAIN:
          session.currentState = STATES.CONTACT_AWAITING_NAME;
          await session.save();
          responseText = "No worries! Our travel experts can help you figure it out. May I have your name so we can arrange a callback?";
          break;
        default:
          // 4. Fallback: Native MongoDB Text Search
          const searchResults = await KnowledgeBase.find(
            { $text: { $search: message } },
            { score: { $meta: "textScore" } }
          )
          .sort({ score: { $meta: "textScore" } })
          .limit(1);

          if (searchResults.length > 0) {
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
    await ChatMessage.create({ sessionId: sid, sender: "bot", message: responseText, url: responseUrl || undefined });

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
