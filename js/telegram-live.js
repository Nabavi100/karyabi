/**
 * لینک‌های تلگرام «همیشه زنده»
 *
 * سه لایه برای اینکه لینک هیچ‌وقت مرده نباشد:
 *   ۱) Socket.IO — سرور به‌محض تغییر، لینک تازه را push می‌کند (آنی).
 *   ۲) Polling — اگر سوکت نبود، هر N ثانیه از API می‌خواند.
 *   ۳) کش محلی — آخرین لینک سالم در localStorage می‌ماند تا آفلاین هم کار کند.
 *
 * استفاده در HTML:
 *   <a data-tg-link="support">پشتیبانی</a>
 *   <a data-tg-link="discount_register">ثبت آگهی تخفیف</a>
 * یا در کد:
 *   TelegramLive.url('support')
 *   TelegramLive.open('support')
 */
(function (global) {
  'use strict';

  const CACHE_KEY = 'karjo_tg_links_v1';
  const DEFAULT_FALLBACK = 'https://t.me/Graphicbox2024';
  const POLL_MS = 60000;

  let links = {};
  let socket = null;
  let pollTimer = null;
  const listeners = new Set();

  /* ---------- کش محلی ---------- */
  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.links) links = p.links;
      }
    } catch { /* ignore */ }
  }
  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ links, at: Date.now() })); } catch { /* ignore */ }
  }

  /* ---------- اعمال روی DOM ---------- */
  function applyToDom(root = document) {
    root.querySelectorAll('[data-tg-link]').forEach((el) => {
      const key = el.getAttribute('data-tg-link');
      const info = links[key];
      const href = (info && info.url) || el.getAttribute('data-tg-fallback') || DEFAULT_FALLBACK;

      if (el.tagName === 'A') {
        el.href = href;
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
      } else {
        el.style.cursor = 'pointer';
        if (!el.__tgBound) {
          el.__tgBound = true;
          el.addEventListener('click', (e) => { e.preventDefault(); open(key); });
        }
      }

      el.setAttribute('data-tg-status', (info && info.status) || 'unknown');
      const badge = el.querySelector('[data-tg-members]');
      if (badge && info && info.memberCount) badge.textContent = String(info.memberCount);
    });
  }

  function update(next, silent) {
    if (!next || typeof next !== 'object') return;
    links = next;
    saveCache();
    applyToDom();
    if (!silent) listeners.forEach((fn) => { try { fn(links); } catch { /* ignore */ } });
  }

  /* ---------- منابع داده ---------- */
  async function fetchOnce(fresh) {
    try {
      if (global.KarjoAPI) {
        const d = await global.KarjoAPI.telegramLinks(fresh);
        if (d && d.links) update(d.links);
        return true;
      }
      const r = await fetch(`/api/telegram/links${fresh ? '?fresh=1' : ''}`, { credentials: 'include' });
      const j = await r.json();
      if (j?.data?.links) update(j.data.links);
      return true;
    } catch { return false; }
  }

  function connectSocket() {
    if (!global.io) return false;
    try {
      socket = global.io({ path: '/socket.io', transports: ['websocket', 'polling'], reconnectionDelayMax: 10000 });
      socket.on('connect', () => socket.emit('telegram:request'));
      socket.on('telegram:links', (payload) => { if (payload && payload.links) update(payload.links); });
      return true;
    } catch { return false; }
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(() => { if (!document.hidden) fetchOnce(false); }, POLL_MS);
  }

  /* ---------- API عمومی ---------- */
  function url(key) {
    const i = links[key];
    return (i && i.url) || DEFAULT_FALLBACK;
  }
  function info(key) { return links[key] || null; }
  function all() { return { ...links }; }
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  function open(key) {
    const href = url(key);
    // در اپ موبایل (Capacitor) با مرورگر سیستم باز می‌شود
    if (global.Capacitor && global.Capacitor.Plugins && global.Capacitor.Plugins.Browser) {
      global.Capacitor.Plugins.Browser.open({ url: href }).catch(() => global.open(href, '_blank'));
      return;
    }
    const w = global.open(href, '_blank', 'noopener,noreferrer');
    if (!w) global.location.href = href;
  }

  async function init(options = {}) {
    loadCache();
    applyToDom();
    await fetchOnce(false);
    if (!connectSocket()) startPolling();

    // هنگام بازگشت به برنامه، لینک‌ها تازه می‌شوند
    document.addEventListener('visibilitychange', () => { if (!document.hidden) fetchOnce(false); });
    global.addEventListener('online', () => fetchOnce(true));

    // اگر بعداً DOM تغییر کرد، لینک‌های جدید هم اعمال شوند
    if (options.observe !== false && global.MutationObserver) {
      new MutationObserver(() => applyToDom()).observe(document.body, { childList: true, subtree: true });
    }
    return all();
  }

  global.TelegramLive = { init, url, info, all, open, onChange, refresh: () => fetchOnce(true), applyToDom };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }
})(window);
