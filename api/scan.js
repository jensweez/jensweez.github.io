export const config = { runtime: 'nodejs', maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    const { imageBase64, mediaType } = body || {};

    // Diagnostic info
    const diag = {
      hasApiKey: !!process.env.ANTHROPIC_API_KEY,
      apiKeyPrefix: process.env.ANTHROPIC_API_KEY?.slice(0, 10) + '...',
      hasImage: !!imageBase64,
      imageSizeKB: imageBase64 ? Math.round(imageBase64.length * 0.75 / 1024) : 0,
      mediaType,
    };

    if (!imageBase64 || !mediaType) {
      return res.status(400).json({ error: 'Missing imageBase64 or mediaType', diag });
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    };

    const transcribeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 },
            },
            {
              type: 'text',
              text: 'Transcribe exactly what you see in this handwritten assignment, word for word, no corrections.',
            },
          ],
        }],
      }),
    });

    const transcribeText = await transcribeRes.text();

    if (!transcribeRes.ok) {
      return res.status(500).json({
        error: 'Transcription failed',
        status: transcribeRes.status,
        detail: transcribeText,
        diag,
      });
    }

    const transcribeData = JSON.parse(transcribeText);
    const transcript = transcribeData.content?.[0]?.text ?? '';

    if (!transcript.trim()) {
      return res.status(200).json({ words: [], transcript: '', diag });
    }

    const spellRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Find misspelled words in this child's writing. Return ONLY a JSON array with "wrong", "correct", "context" fields. If none return [].

${transcript}`,
        }],
      }),
    });

    const spellText = await spellRes.text();

    if (!spellRes.ok) {
      return res.status(500).json({
        error: 'Spell check failed',
        status: spellRes.status,
        detail: spellText,
        diag,
      });
    }

    const spellData = JSON.parse(spellText);
    const raw = spellData.content?.[0]?.text ?? '[]';

    let words;
    try {
      words = JSON.parse(raw);
    } catch {
      const match = raw.match(/\[[\s\S]*\]/);
      words = match ? JSON.parse(match[0]) : [];
    }

    return res.status(200).json({ words, transcript });

  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
