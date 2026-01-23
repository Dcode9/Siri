import Cerebras from '@cerebras/cerebras_cloud_sdk';
import { Redis } from '@upstash/redis';

// Initialize Clients
const client = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY });
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  const { input, session } = req.query;
  
  // Use "Guest" if the Shortcut doesn't pass a Device ID
  const sessionId = `chat_history:${session || 'Guest'}`;

  try {
    // 1. Fetch past context from Redis
    let history = await redis.get(sessionId) || [];

    // 2. If it's a new chat, add the system prompt
    if (history.length === 0) {
      history.push({ role: 'system', content: 'You are the D-Verse AI. Concise, friendly voice assistant. No markdown.' });
    }

    // 3. Add the user's new message
    history.push({ role: 'user', content: input });

    // 4. Get response from Cerebras (passing the WHOLE history)
    const completion = await client.chat.completions.create({
      model: 'llama3.3-70b',
      messages: history,
    });

    const aiResponse = completion.choices[0].message.content;

    // 5. Add AI response to history and keep only the last 10 messages
    history.push({ role: 'assistant', content: aiResponse });
    const trimmedHistory = history.slice(-10); 

    // 6. Save back to Redis (setting an expiry of 24 hours to keep it clean)
    await redis.set(sessionId, JSON.stringify(trimmedHistory), { ex: 86400 });

    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(aiResponse);

  } catch (err) {
    console.error(err);
    res.status(500).send("D-Verse Error: " + err.message);
  }
}
