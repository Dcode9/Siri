import Cerebras from '@cerebras/cerebras_cloud_sdk';

const client = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY });

// This object stays in memory while the server is running
const chatHistories = {}; 

export default async function handler(req, res) {
  const { input, session } = req.query;
  const sessionId = session || 'default';

  // 1. Initialize history for this session if it doesn't exist
  if (!chatHistories[sessionId]) {
    chatHistories[sessionId] = [
      { role: 'system', content: 'You are a helpful AI assistant for D-Verse. Keep answers concise for voice.' }
    ];
  }

  // 2. Add the new user message to the history
  chatHistories[sessionId].push({ role: 'user', content: input });

  // 3. Keep only the last 10 messages to save space
  if (chatHistories[sessionId].length > 10) chatHistories[sessionId].shift();

  try {
    const completion = await client.chat.completions.create({
      model: 'llama3.3-70b',
      messages: chatHistories[sessionId], // Send the WHOLE history, not just one message
    });

    const aiResponse = completion.choices[0].message.content;

    // 4. Add the AI's response to the history so it remembers for next time
    chatHistories[sessionId].push({ role: 'assistant', content: aiResponse });

    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(aiResponse);
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
}
