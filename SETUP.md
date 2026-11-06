# Free setup on Render

Free-tier tradeoff: the service sleeps after 15 minutes idle and takes about a minute to wake. Sessions are kept
in memory, so users sign in to Procore again after each wake-up. Fine for testing; move to a $7/mo instance
(or make sessions stateless) for daily use.

## You do (about 10 minutes)
1. Create free accounts: GitHub, Render (render.com), Anthropic Console (API key), Procore developer portal.
2. In the Procore developer portal create an app. Leave the redirect URI for step 5.
   Copy the Client ID and Client Secret.
3. Push this folder to a new GitHub repo.
4. In Render: New > Blueprint > pick the repo. Render reads `render.yaml`. Paste in PROCORE_CLIENT_ID,
   PROCORE_CLIENT_SECRET, ANTHROPIC_API_KEY, and PROCORE_REDIRECT_URI = `https://<service-name>.onrender.com/auth/callback`.
5. Back in Procore, set that same redirect URI, then add an embedded Side Panel view pointing at
   `https://<service-name>.onrender.com/?company_id={company_id}&project_id={project_id}`.

## Or hand it to Claude Code
Open this folder in Claude Code and paste:

> Read SETUP.md. Initialize git, create a GitHub repo with `gh` and push. Run `npm install` and
> `npm start` locally to confirm the server boots. Then tell me the exact values to enter in Render and in the Procore
> developer portal. Don't ask me to paste secrets in chat; tell me which fields I fill in myself.
