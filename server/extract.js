// Sends a PDF to Claude and returns JSON shaped by a target's field list.
export async function extractFromPdf(buffer, target) {
  const shape = target.fields.map((f) => `- ${f.key}: ${f.hint || f.label}`).join('\n');
  const prompt =
    `${target.prompt}\n\nReturn ONLY a JSON object with these keys (use "" when not found):\n${shape}\n` +
    `Do not invent facts. No markdown fences.`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });
  if (!r.ok) throw new Error(`Extraction failed (${r.status})`);
  const out = (await r.json()).content.map((b) => b.text || '').join('');
  return JSON.parse(out.replace(/```json|```/g, '').trim());
}
