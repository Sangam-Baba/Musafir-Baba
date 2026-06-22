const testChatbotLead = async () => {
  let sessionId = null;
  const baseUrl = "http://127.0.0.1:8000/api/chatbot/query";
  
  const sendMessage = async (msg) => {
    console.log(`User: ${msg}`);
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, sessionId })
    });
    const data = await res.json();
    sessionId = data.sessionId;
    console.log(`Bot: ${data.response}`);
    return data;
  };

  await sendMessage("I want to speak to an agent"); // Triggers CONTACT intent
  await sendMessage("Test User Chatbot"); // Name
  await sendMessage("1234567890"); // Phone
  await sendMessage("testchatbot@example.com"); // Email
};

testChatbotLead();
