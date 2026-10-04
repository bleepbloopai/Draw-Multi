# Draw Together

Real-time multiplayer drawing: live cursors with usernames, brush / eraser / fill, size + color, profanity-filtered usernames (leetspeak aware).

GitHub stores the code; Cloudflare runs it (a Worker serves the page, a Durable Object relays everyone's strokes).

## Run locally
    npm install
    npm run dev          # open http://localhost:8787 in two tabs

## Deploy
    npx wrangler login
    npm run deploy       # prints your https://draw-together.<you>.workers.dev URL

To deploy from GitHub instead: Cloudflare dashboard -> Workers & Pages -> Create -> Import a repository.

## Notes
- The canvas lives in memory in the Durable Object; when the last person leaves, it resets to blank.
- The username filter is in `public/filter.js` (edit the `BAD` / `OKW` lists). It runs in the browser and again on the server.
