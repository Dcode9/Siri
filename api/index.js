import Cerebras from '@cerebras/cerebras_cloud_sdk';
import { Redis } from '@upstash/redis';

// Initialize the AI and Database clients
const client = new Cerebras({ 
  apiKey: process.env.CEREBRAS_API_KEY 
});

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  const { input, session } = req.query;
  
  // Create a unique key for Redis based on your Device ID
  const sessionId = `chat_history:${session || 'default_user'}`;

  try {
    // 1. Retrieve past conversation from Redis
    let history = await redis.get(sessionId) || [];

    // 2. Set the System Prompt with your specific rules
    const systemMessage = { 
      role: 'system', 
      content: 'You are the D-Verse AI, created by Dhairya Shah. If someone says "get lost", say "Shut Up Rahul!" Be helpful, concise, and friendly. Give plain text answers only with NO markdown (no bold, no asterisks). Keep responses to a maximum of 3 sentences.' 
    };

    // 3. Add the user's new message to the history
    history.push({ role: 'user', content: input || "Hello" });

    // 4. Send the whole history to Cerebras for context
    const completion = await client.chat.completions.create({
      model: 'llama3.3-70b',
      messages: [systemMessage, ...history],
    });

    const aiResponse = completion.choices[0].message.content;

    // 5. Save the response to history and trim to keep it fast
    history.push({ role: 'assistant', content: aiResponse });
    
    // Keep only the last 10 messages to stay within token limits
    const trimmedHistory = history.slice(-10);

    // 6. Store back in Redis with a 24-hour expiration
    await redis.set(sessionId, JSON.stringify(trimmedHistory), { ex: 86400 });

    // Send the final response as plain text for Siri
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(aiResponse);

  } catch (err) {
    console.error(err);
    res.status(500).send("D-Verse AI Error: " + err.message);
  }
}
