# PixelArena — Online Battle Game

A small multiplayer pixel-art arena shooter that runs in a browser. It uses Node.js, Express, Socket.IO, and HTML Canvas. The art is drawn in code, so no external game-art assets are required.

## Features in this starter
- Live browser multiplayer over Socket.IO
- Pixel-style arena, player avatars, bullets, hit points, respawning
- Keyboard movement (WASD / arrow keys), mouse aiming, click/space shooting, Shift dash
- Live player count, leaderboard, score, kills, and event feed
- Responsive layout and basic touch aiming
- Render deployment configuration and `/health` endpoint

## Important limitations
This is a playable starter/MVP, not a production-grade competitive game. It has no accounts, persistent statistics, matchmaking, room codes, anti-cheat system, or authoritative lag-compensated movement. Anyone with the public URL can join the same arena. The server validates basic movement/shooting cadence and resolves bullet hits, but a serious public release needs stronger validation, moderation, rate limits, and security review.

## Run locally
Requirements: Node.js 20 or newer and npm.

1. Extract the ZIP.
2. Open a terminal in the `PixelArena` folder.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000`.

To stop the server, press `Ctrl+C` in the terminal.

## Deploy on Render
### Option A: GitHub + Render Blueprint
1. Create a new GitHub repository named `pixelarena`.
2. Upload the contents of this folder to the repository (upload the files inside `PixelArena`, not the outer ZIP).
3. Commit the files.
4. In Render, choose **New** → **Blueprint** and connect the repository.
5. Render reads `render.yaml`. Review the service name and create the service.
6. Wait for the deploy to finish, then open the `.onrender.com` URL.
7. Test by opening the URL in two separate browser windows and joining with different names.

### Option B: Create a Web Service manually
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`
- Environment variable: `NODE_ENV=production`
- Optional: `MAX_PLAYERS=80`

## How to play
- WASD or arrow keys: move
- Mouse: aim
- Left click or Space: fire
- Shift: dash
- Eliminate opponents to earn points. Players respawn automatically.

## Project structure
```
PixelArena/
├── public/
│   ├── index.html
│   ├── style.css
│   └── game.js
├── server.js
├── package.json
├── render.yaml
├── .env.example
├── .gitignore
└── README.md
```

## Before inviting lots of players
Add private room codes or authentication if you want invite-only play, then add server-side input validation, persistent profiles, abuse prevention, load testing, and automated tests. Render's free services may sleep when idle and performance depends on the selected plan.
