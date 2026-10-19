const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, methods: ["GET", "POST"] },
  pingInterval: 25000,
  pingTimeout: 20000
});

const PORT = Number(process.env.PORT) || 3000;
const MAX_PLAYERS = Math.max(2, Math.min(200, Number(process.env.MAX_PLAYERS) || 80));
const ARENA = { width: 1600, height: 1000 };
const TICK_RATE = 30;
const players = new Map();
const bullets = new Map();
let nextBulletId = 1;

app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));
app.get("/health", (_req, res) => res.json({ ok: true, players: players.size }));

function safeName(value) {
  const cleaned = String(value || "Rookie").replace(/[^\w -]/g, "").trim().slice(0, 16);
  return cleaned || "Rookie";
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function spawnPoint() {
  return { x: 100 + Math.random() * (ARENA.width - 200), y: 100 + Math.random() * (ARENA.height - 200) };
}
function makePlayer(socket, name, color) {
  const p = spawnPoint();
  return {
    id: socket.id, name, x: p.x, y: p.y, angle: 0,
    color: /^#[0-9a-fA-F]{6}$/.test(color || "") ? color : ["#62e6a7", "#ffcc66", "#ff6b8a", "#79a8ff", "#c58bff"][Math.floor(Math.random() * 5)],
    hp: 100, score: 0, kills: 0, deaths: 0, lastShot: 0, lastMove: 0
  };
}
function publicPlayer(p) {
  return { id: p.id, name: p.name, x: p.x, y: p.y, angle: p.angle, color: p.color, hp: p.hp, score: p.score, kills: p.kills, deaths: p.deaths };
}
function emitNotice(text, type = "info") { io.emit("notice", { text, type, at: Date.now() }); }

io.on("connection", (socket) => {
  socket.emit("welcome", { arena: ARENA, maxPlayers: MAX_PLAYERS });
  socket.on("join", (data = {}) => {
    if (players.has(socket.id)) return;
    if (players.size >= MAX_PLAYERS) {
      socket.emit("joinError", "The arena is full. Try again later.");
      return;
    }
    const player = makePlayer(socket, safeName(data.name), data.color);
    players.set(socket.id, player);
    socket.emit("joined", { id: socket.id, arena: ARENA, player: publicPlayer(player) });
    emitNotice(`${player.name} entered the arena`, "join");
    io.emit("state", { players: [...players.values()].map(publicPlayer), bullets: [...bullets.values()] });
  });

  socket.on("input", (input = {}) => {
    const p = players.get(socket.id);
    if (!p) return;
    const now = Date.now();
    if (now - p.lastMove < 10) return;
    p.lastMove = now;
    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const length = Math.hypot(dx, dy) || 1;
    const speed = input.dash ? 260 : 190;
    const dt = Math.min(0.05, Math.max(0, Number(input.dt) || 1 / TICK_RATE));
    p.x = clamp(p.x + (dx / length) * speed * dt, 24, ARENA.width - 24);
    p.y = clamp(p.y + (dy / length) * speed * dt, 24, ARENA.height - 24);
    if (Number.isFinite(input.angle)) p.angle = input.angle;
  });

  socket.on("shoot", (data = {}) => {
    const p = players.get(socket.id);
    if (!p) return;
    const now = Date.now();
    if (now - p.lastShot < 260) return;
    p.lastShot = now;
    const angle = Number.isFinite(data.angle) ? data.angle : p.angle;
    const id = nextBulletId++;
    bullets.set(id, {
      id, owner: p.id, x: p.x + Math.cos(angle) * 25, y: p.y + Math.sin(angle) * 25,
      vx: Math.cos(angle) * 560, vy: Math.sin(angle) * 560, born: now, color: p.color
    });
  });

  socket.on("disconnect", () => {
    const p = players.get(socket.id);
    if (p) {
      players.delete(socket.id);
      emitNotice(`${p.name} left the arena`, "leave");
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [id, b] of bullets) {
    const dt = 1 / TICK_RATE;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < 0 || b.y < 0 || b.x > ARENA.width || b.y > ARENA.height || now - b.born > 1500) {
      bullets.delete(id); continue;
    }
    for (const p of players.values()) {
      if (p.id === b.owner) continue;
      if (Math.hypot(p.x - b.x, p.y - b.y) < 22) {
        p.hp -= 25;
        bullets.delete(id);
        io.to(p.id).emit("hit", { hp: p.hp });
        if (p.hp <= 0) {
          const attacker = players.get(b.owner);
          p.deaths += 1;
          if (attacker) { attacker.kills += 1; attacker.score += 100; }
          emitNotice(`${attacker ? attacker.name : "A player"} eliminated ${p.name}`, "kill");
          const spawn = spawnPoint();
          p.x = spawn.x; p.y = spawn.y; p.hp = 100;
        }
        break;
      }
    }
  }
  io.emit("state", { players: [...players.values()].map(publicPlayer), bullets: [...bullets.values()] });
}, 1000 / TICK_RATE);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`PixelArena listening on port ${PORT}`);
});
