# PDF to RFI: Procore side panel

Drop a PDF into the panel. Claude reads it, fills in RFI fields, you review, then create a new RFI or add the content as a reply on an existing one.

## Run
1. `cp .env.example .env` and fill in your Procore OAuth credentials and Anthropic key.
2. `npm install && npm start`
3. Host it over HTTPS (Procore iframes require it) and set the same URL as the OAuth redirect: `https://YOUR-HOST/auth/callback`.

## Register in Procore
Developer Portal > your app > Embedded Experience > add a **Side Panel** (or Full Screen) view pointing at
`https://YOUR-HOST/?company_id={company_id}&project_id={project_id}` (use whichever context variables your
embedded-app config supports; the panel also lets users type the IDs).

## Add another record type (Submittals, Observations, ...)
1. Copy `server/targets/rfi.js`, edit `fields`, `prompt`, and the `list/create/append` Procore calls.
2. Register it in `server/targets/index.js`.
3. Open the panel with `?target=<id>`. The form, extraction, and matching all follow the new definition.

## Before production
- Replace the in-memory session store in `server/procore.js` with Redis/DB, and encrypt stored tokens.
- Verify RFI endpoints/payloads against current Procore API docs (create, reply). Spec section, drawing refs, and
  location are currently written into the question body; map them to Procore's ID-based fields when ready.
- Attaching the source PDF to the RFI is the natural next step (Procore uploads API, then reference in the RFI).
- Add rate limiting and restrict `postMessage` origin in `/auth/callback`.
