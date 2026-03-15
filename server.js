import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// Passphrase gate — set APP_PASSPHRASE env var to enable
const APP_PASSPHRASE = process.env.APP_PASSPHRASE || '';

if (APP_PASSPHRASE) {
  // Token-based auth: /api/auth issues a token, everything else checks it
  const validTokens = new Set();

  app.post('/api/auth', (req, res) => {
    const { passphrase } = req.body;
    if (passphrase === APP_PASSPHRASE) {
      const token = crypto.randomBytes(32).toString('hex');
      validTokens.add(token);
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Wrong passphrase' });
    }
  });

  // Protect API routes
  app.use('/api/', (req, res, next) => {
    const token = req.headers['x-auth-token'];
    if (token && validTokens.has(token)) return next();
    res.status(401).json({ error: 'Unauthorized' });
  });
}

app.use(express.static(join(__dirname, 'public')));

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a warm, supportive CBT companion based on the book "Feeling Good" by David Burns. You help people identify cognitive distortions in their thinking and work through them conversationally.

The 10 cognitive distortions are:
1. All-or-Nothing Thinking — seeing things in black and white
2. Overgeneralization — one bad event means everything is bad
3. Mental Filter — focusing only on the negative
4. Disqualifying the Positive — dismissing good things as flukes
5. Jumping to Conclusions — mind reading or fortune telling
6. Magnification/Minimization — blowing things up or shrinking them
7. Emotional Reasoning — "I feel it, so it must be true"
8. Should Statements — rigid rules about how things ought to be
9. Labeling — "I'm a loser" instead of "I made a mistake"
10. Personalization — blaming yourself for things outside your control

There are two types of messages you'll receive:

TYPE 1 — The user shares a thought or adds more context (correcting your previous analysis).
Respond with JSON:
{
  "type": "analysis",
  "distortions": [
    {
      "name": "Distortion Name",
      "explanation": "A brief, warm explanation of how this distortion shows up in their thought. 1-2 sentences."
    }
  ],
  "reframe": "A gentle, honest reframing. Not toxic positivity — just a more balanced perspective. 2-3 sentences."
}

TYPE 2 — The user says the analysis feels right (their message will be "[ACCEPTED]").
Respond with JSON:
{
  "type": "wisdom",
  "message": "ONE short sentence. A pithy, warm takeaway they can read later without context and still get it. Reference the specific topic, not the distortion names. Examples of the right vibe: 'You're getting better at volleyball and not every day is gonna be perfect!' or 'One awkward conversation doesn't erase years of friendship.' or 'You're allowed to have an off week at work — it doesn't mean you're bad at your job.' Keep it casual, warm, lowercase energy. NOT a paragraph. NOT therapy-speak. Just a friendly reminder.",
  "image_keyword": "A single word or two-word phrase for a photo that captures the vibe of the topic. Use the ACTUAL SUBJECT they talked about — not abstract feelings. Examples: 'volleyball', 'friendship', 'office', 'cooking', 'guitar', 'sunset beach'. Pick something visually beautiful and relevant to their specific situation."
}

Rules:
- For analysis responses: identify 1-3 distortions (only the ones that clearly apply).
- If they push back with more context, UPDATE your analysis. Remove distortions that don't apply. Add new ones if you see them. It's fine to have just 1 distortion or even 0 if they've genuinely talked you out of it.
- Be warm and conversational, like a smart friend — not a therapist reading from a textbook.
- Never minimize their feelings. Validate first, then reframe.
- Keep it short. They're not in the mood for an essay.
- ONLY return JSON, nothing else.`;

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !messages.length) {
    return res.status(400).json({ error: 'Please share what\'s on your mind.' });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages
    });

    let responseText = response.content[0].text;
    // Strip markdown code fences if present
    responseText = responseText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    const parsed = JSON.parse(responseText);
    res.json(parsed);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Something went wrong. Try again?' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Feeling Better is running at http://localhost:${PORT}`);
});
