// Shared helpers used by the player, host and display pages.
const Trivia = (() => {
  let offset = 0, haveOffset = false;

  async function call(params) {
    const url = (window.CONFIG && CONFIG.API_URL) || "";
    if (!url || url.includes("PASTE_YOUR")) throw new Error("Add your web app URL to config.js");
    const t0 = Date.now();
    const res = await fetch(url + "?" + new URLSearchParams(params));
    const data = await res.json();
    const t1 = Date.now();
    if (data.serverNow && t1 - t0 < 4000) {
      const sample = data.serverNow - (t0 + t1) / 2;
      offset = haveOffset ? offset * 0.6 + sample * 0.4 : sample;
      haveOffset = true;
    }
    return data;
  }

  const serverTime = () => Date.now() + offset;

  // Seconds until the question starts (positive) or 0.
  const untilStart = (s) => Math.max(0, (s.startedAt - serverTime()) / 1000);
  // Seconds left to answer (full duration while the lead-in runs).
  const remaining = (s) => {
    if (!s.startedAt) return 0;
    return Math.max(0, Math.min(s.duration, s.duration - (serverTime() - s.startedAt) / 1000));
  };

  function poll(getParams, onState, onError) {
    let stopped = false;
    (async function loop() {
      try {
        const s = await call(getParams());
        if (s.error) onError && onError(s.error); else onState(s);
      } catch (e) {
        onError && onError(e.message || "Offline");
      }
      if (!stopped) setTimeout(loop, CONFIG.POLL_MS || 2000);
    })();
    return () => { stopped = true; };
  }

  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const LETTERS = ["A", "B", "C", "D"];

  // Leaderboard list. opts: limit, you (player name to highlight), delta (show this round's points)
  function boardHTML(list, opts = {}) {
    const limit = opts.limit || 10;
    const row = (b) => `<li class="row${b.rank === 1 ? " top1" : ""}${opts.you && b.name === opts.you ? " you" : ""}">
      <span class="rk">${b.rank}</span><span class="nm">${esc(b.name)}</span>
      <span class="pts">${fmt(b.total)}${opts.delta && b.roundPts ? `<small>+${fmt(b.roundPts)}</small>` : ""}</span></li>`;
    let html = list.slice(0, limit).map(row).join("");
    if (opts.you && list.length > limit) {
      const mine = list.find((b) => b.name === opts.you);
      if (mine && list.indexOf(mine) >= limit) html += `<li class="gap" aria-hidden="true">...</li>` + row(mine);
    }
    return `<ol class="board">${html}</ol>`;
  }

  return { call, poll, serverTime, remaining, untilStart, esc, fmt, boardHTML, LETTERS };
})();
