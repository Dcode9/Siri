import Cerebras from '@cerebras/cerebras_cloud_sdk';

const client = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
});

export default async function handler(req, res) {
  const userInput = req.query.input || "Hello";

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b',
      messages: [
        { role: 'system', content: 'Concise voice assistant for D-Verse. Plain text only.' },
        { role: 'user', content: userInput }
      ],
    });

    const aiResponse = completion.choices[0].message.content;

    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(aiResponse);
  } catch (error) {
    res.status(500).send("Error connecting to D-Verse AI.");
  }
}
