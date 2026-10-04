import { isBad } from '../public/filter.js';

const W = 1600, H = 900;
const HEX = c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
const num = (v, a, b) => Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : a;
const out = (s, o) => { try { s.send(JSON.stringify(o)); } catch {} };

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
      return env.ROOM.get(env.ROOM.idFromName('main')).fetch(req); // one shared room
    }
    return env.ASSETS.fetch(req);
  },
};

export class Room {
  constructor() {
    this.peers = new Map(); // socket -> peer state
    this.ops = [];          // drawing history for late joiners
    this.strokes = new Map();
    this.points = 0;
  }

  fetch() {
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    const p = { id: crypto.randomUUID().slice(0, 8), n: 'Guest', c: '#888888', x: null, y: null, ok: false, win: 0, cnt: 0 };
    this.peers.set(server, p);

    server.addEventListener('message', ev => this.onMessage(server, p, ev.data));
    const gone = () => {
      if (!this.peers.delete(server)) return;
      if (p.ok) this.broadcast(server, { t: 'left', id: p.id });
      if (!this.peers.size) { this.ops = []; this.strokes.clear(); this.points = 0; } // empty room = blank canvas
    };
    server.addEventListener('close', gone);
    server.addEventListener('error', gone);
    return new Response(null, { status: 101, webSocket: client });
  }

  broadcast(from, o) {
    const s = JSON.stringify(o);
    for (const [sock, q] of this.peers) if (sock !== from && q.ok) { try { sock.send(s); } catch {} }
  }

  onMessage(sock, p, data) {
    if (typeof data !== 'string' || data.length > 4096) return;
    const now = Date.now();
    if (now - p.win > 1000) { p.win = now; p.cnt = 0; }
    if (++p.cnt > 80) return; // rate limit
    let m; try { m = JSON.parse(data); } catch { return; }
    if (!m || typeof m !== 'object') return;

    if (m.t === 'hello') {
      if (p.ok) return;
      const n = String(m.n || '').trim().replace(/\s+/g, ' ');
      if (!/^[A-Za-z0-9 _.-]{2,16}$/.test(n) || isBad(n)) { out(sock, { t: 'reject' }); sock.close(1008, 'name'); return; }
      p.n = n; if (HEX(m.c)) p.c = m.c; p.ok = true;
      out(sock, { t: 'init', id: p.id });
      this.sync(sock);
      const pub = q => ({ id: q.id, n: q.n, c: q.c, x: q.x, y: q.y });
      out(sock, { t: 'peers', list: [...this.peers.values()].filter(q => q.ok && q !== p).map(pub) });
      this.broadcast(sock, { t: 'p', ...pub(p) });
      return;
    }
    if (!p.ok) return;

    if (m.t === 'p') {
      if (HEX(m.c)) p.c = m.c;
      if ('x' in m) { p.x = typeof m.x === 'number' ? num(m.x, 0, W) : null; p.y = typeof m.y === 'number' ? num(m.y, 0, H) : null; }
      this.broadcast(sock, { t: 'p', id: p.id, c: p.c, x: p.x, y: p.y });
    } else if (m.t === 'st') {
      if (typeof m.i !== 'string' || m.i.length > 40 || !HEX(m.c) || !Array.isArray(m.p) || m.p.length > 400) return;
      const pts = [];
      for (let k = 0; k + 1 < m.p.length; k += 2) pts.push(Math.round(num(m.p[k], 0, W)), Math.round(num(m.p[k + 1], 0, H)));
      const s = { t: 'st', i: m.i, c: m.c, w: num(m.w, 1, 120), e: m.e ? 1 : 0, p: pts };
      this.broadcast(sock, s);
      let o = this.strokes.get(s.i);
      if (!o && this.points < 400000) { o = { k: 's', i: s.i, c: s.c, w: s.w, e: s.e, p: [] }; this.strokes.set(s.i, o); this.ops.push(o); }
      if (o && this.points < 400000) { for (const v of pts) o.p.push(v); this.points += pts.length; }
    } else if (m.t === 'fl') {
      if (!HEX(m.c)) return;
      const f = { t: 'fl', x: Math.round(num(m.x, 0, W - 1)), y: Math.round(num(m.y, 0, H - 1)), c: m.c };
      this.broadcast(sock, f);
      if (this.ops.length < 5000) this.ops.push({ k: 'f', x: f.x, y: f.y, c: f.c });
    }
  }

  sync(sock) { // send history in ~20 KB batches
    let pack = [], len = 0;
    const flush = () => { if (pack.length) out(sock, { t: 'sync', o: pack }); pack = []; len = 0; };
    const add = o => { const l = JSON.stringify(o).length; if (len + l > 20000) flush(); pack.push(o); len += l; };
    for (const o of this.ops) {
      if (o.k === 'f') add(o);
      else for (let i = 0; i < o.p.length; i += 200) add({ k: 's', i: o.i, c: o.c, w: o.w, e: o.e, p: o.p.slice(i, i + 200) });
    }
    flush();
  }
}
