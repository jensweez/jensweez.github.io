export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { imageBase64, mediaType } = await req.json();

    if (!imageBase64 || !mediaType) {
      return new Response(JSON.stringify({ error: 'Missing imageBase64 or mediaType' }), { status: 400 });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: imageBase64 },
              },
              {
                type: 'text',
                text: `This is a photo of a child's handwritten assignment. Your job is to carefully read the handwriting and find every misspelled word.

IMPORTANT INSTRUCTIONS:
- Read the handwriting slowly and carefully. Kids' handwriting can be messy — do your best to interpret each letter.
- Only flag genuine spelling mistakes. Do NOT flag: proper nouns, names, invented words in creative writing, or words you simply cannot read clearly.
- For each misspelled word, record EXACTLY how the child wrote it (including their mistake), the correct spelling, and the full sentence it appeared in (transcribed as the child wrote it).
- If a word is ambiguous and could be read as either correct or incorrect, assume it is correct.
- Do not flag punctuation errors, grammar errors, or capitalization — only spelling.

Return ONLY a valid JSON array, no other text, no markdown, no explanation.
Each item must have exactly these fields:
- "wrong": the word exactly as the child wrote it (with the spelling error)
- "correct": the correct standard spelling
- "context": the complete sentence as the child wrote it

If no spelling mistakes are found, return an empty array: []

Example output:
[{"wrong":"becaus","correct":"because","context":"I stayed home becaus I was sick"},{"wrong":"frend","correct":"friend","context":"my frend came over to play"}]`,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      return new Response(JSON.stringify({ error: 'Claude API error', detail: err }), {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const data = await anthropicRes.json();
    const raw = data.content?.[0]?.text ?? '[]';

    let words;
    try {
      words = JSON.parse(raw);
    } catch {
      const match = raw.match(/\[[\s\S]*\]/);
      words = match ? JSON.parse(match[0]) : [];
    }

    return new Response(JSON.stringify({ words }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
