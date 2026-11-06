// A "target" = one kind of Procore record the panel can fill from a PDF.
// To add Submittals, Observations, Punch items, etc.: copy this file, change the fields/prompt/API calls,
// and register it in targets/index.js. The UI renders itself from `fields`.
const compose = (f) =>
  [f.question,
   f.spec_section && `Spec section: ${f.spec_section}`,
   f.drawing_refs && `Drawings: ${f.drawing_refs}`,
   f.location && `Location: ${f.location}`].filter(Boolean).join('\n\n');

export default {
  id: 'rfi',
  label: 'RFI',
  supportsAppend: true,
  prompt:
    'You are reading a construction document (email, markup, field report, sub question, meeting minutes). ' +
    'Extract what is needed to raise or add to a Request for Information.',
  fields: [
    { key: 'subject', label: 'Subject', type: 'text', hint: 'short RFI title, under 80 chars' },
    { key: 'question', label: 'Question', type: 'textarea', hint: 'the clarification being requested, written as a clear question' },
    { key: 'spec_section', label: 'Spec section', type: 'text', hint: 'e.g. 03 30 00' },
    { key: 'drawing_refs', label: 'Drawing references', type: 'text', hint: 'sheet numbers/details mentioned' },
    { key: 'location', label: 'Location', type: 'text', hint: 'building, level, grid line or area' },
    { key: 'due_date', label: 'Response needed by', type: 'date', hint: 'YYYY-MM-DD, only if stated' },
  ],
  itemLabel: (i) => `#${i.number ?? ''} ${i.subject ?? ''}`.trim(),
  list: (p, ctx) => p.get(`/rest/v1.0/projects/${ctx.projectId}/rfis?per_page=100`),
  create: (p, ctx, f) =>
    p.post(`/rest/v1.0/projects/${ctx.projectId}/rfis`, {
      rfi: { subject: f.subject, question: { body: compose(f) }, ...(f.due_date && { due_date: f.due_date }) },
    }),
  // Adds the extracted content as a new reply on an existing RFI.
  append: (p, ctx, id, f) =>
    p.post(`/rest/v1.0/projects/${ctx.projectId}/rfis/${id}/replies`, {
      reply: { body: `${f.subject ? f.subject + '\n\n' : ''}${compose(f)}` },
    }),
};
