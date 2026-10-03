/**
 * کلاینت API کارجو
 * - مدیریت خودکار توکن و تازه‌سازی آن
 * - ارسال CSRF برای درخواست‌های کوکی‌محور
 * - تلاش مجدد هوشمند و تشخیص آفلاین
 */
(function (global) {
  'use strict';

  const BASE = (global.KARJO_API_BASE || '/api').replace(/\/$/, '');
  const LS_ACCESS = 'karjo_access_token';
  const LS_REFRESH = 'karjo_refresh_token';

  let csrfToken = null;
  let refreshing = null;

  const getAccess = () => { try { return localStorage.getItem(LS_ACCESS) || ''; } catch { return ''; } };
  const getRefresh = () => { try { return localStorage.getItem(LS_REFRESH) || ''; } catch { return ''; } };
  const setTokens = (a, r) => {
    try {
      if (a) localStorage.setItem(LS_ACCESS, a);
      if (r) localStorage.setItem(LS_REFRESH, r);
    } catch { /* ignore */ }
  };
  const clearTokens = () => {
    try { localStorage.removeItem(LS_ACCESS); localStorage.removeItem(LS_REFRESH); } catch { /* ignore */ }
  };

  async function ensureCsrf() {
    if (csrfToken) return csrfToken;
    try {
      const r = await fetch(`${BASE}/csrf-token`, { credentials: 'include' });
      const j = await r.json();
      csrfToken = j?.data?.csrfToken || null;
    } catch { csrfToken = null; }
    return csrfToken;
  }

  async function refreshSession() {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      const rt = getRefresh();
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ refreshToken: rt }),
        });
        if (!res.ok) throw new Error('refresh failed');
        const j = await res.json();
        setTokens(j?.data?.accessToken, j?.data?.refreshToken);
        return true;
      } catch {
        clearTokens();
        return false;
      } finally { refreshing = null; }
    })();
    return refreshing;
  }

  async function request(pathname, options = {}) {
    const { method = 'GET', body, headers = {}, auth = true, retry = true, timeout = 20000 } = options;

    const h = { ...headers };
    if (body !== undefined && !(body instanceof FormData)) h['Content-Type'] = 'application/json';
    if (auth && getAccess()) h.Authorization = `Bearer ${getAccess()}`;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !h.Authorization) {
      const t = await ensureCsrf();
      if (t) h['X-CSRF-Token'] = t;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);

    let res;
    try {
      res = await fetch(`${BASE}${pathname}`, {
        method,
        headers: h,
        credentials: 'include',
        signal: ctrl.signal,
        body: body === undefined ? undefined : (body instanceof FormData ? body : JSON.stringify(body)),
      });
    } catch (err) {
      clearTimeout(timer);
      const offline = !navigator.onLine;
      throw Object.assign(new Error(offline ? 'اتصال اینترنت برقرار نیست' : 'ارتباط با سرور ممکن نشد'), { offline, network: true });
    }
    clearTimeout(timer);

    // توکن منقضی → یک بار تازه‌سازی و تکرار درخواست
    if (res.status === 401 && retry && getRefresh()) {
      const ok = await refreshSession();
      if (ok) return request(pathname, { ...options, retry: false });
    }
    // CSRF منقضی → گرفتن توکن تازه و تکرار
    if (res.status === 403 && retry) {
      csrfToken = null;
      const t = await ensureCsrf();
      if (t) return request(pathname, { ...options, retry: false });
    }

    let json = null;
    try { json = await res.json(); } catch { /* بدون بدنه */ }

    if (!res.ok || (json && json.success === false)) {
      const msg = json?.error?.message || `خطای سرور (${res.status})`;
      throw Object.assign(new Error(msg), { status: res.status, code: json?.error?.code, details: json?.error?.details });
    }
    return json?.data ?? json;
  }

  const api = {
    base: BASE,
    get: (p, o) => request(p, { ...o, method: 'GET' }),
    post: (p, body, o) => request(p, { ...o, method: 'POST', body }),
    put: (p, body, o) => request(p, { ...o, method: 'PUT', body }),
    patch: (p, body, o) => request(p, { ...o, method: 'PATCH', body }),
    del: (p, o) => request(p, { ...o, method: 'DELETE' }),

    // ---- احراز هویت ----
    async login(username, password) {
      const d = await request('/auth/login', { method: 'POST', body: { username, password }, auth: false });
      setTokens(d.accessToken, d.refreshToken);
      return d.user;
    },
    async logout() {
      try { await request('/auth/logout', { method: 'POST', body: { refreshToken: getRefresh() } }); } catch { /* ignore */ }
      clearTokens();
    },
    me: () => request('/auth/me'),
    isLoggedIn: () => !!getAccess(),

    // ---- بنرها ----
    banners: (placement = 'home') => request(`/banners?placement=${encodeURIComponent(placement)}`, { auth: false }),
    saveBanners: (slides, placement = 'home') => request('/banners', { method: 'PUT', body: { placement, slides } }),

    // ---- تلگرام ----
    telegramLinks: (fresh) => request(`/telegram/links${fresh ? '?fresh=1' : ''}`, { auth: false }),

    // ---- محتوا ----
    jobs: (q = '') => request(`/jobs${q}`, { auth: false }),
    professionals: (q = '') => request(`/professionals${q}`, { auth: false }),
    discounts: (q = '') => request(`/discounts${q}`, { auth: false }),
    places: (q = '') => request(`/places${q}`, { auth: false }),
    categories: (q = '') => request(`/categories${q}`, { auth: false }),
    companies: (q = '') => request(`/companies${q}`, { auth: false }),
    challenges: () => request('/challenges', { auth: false }),
    settings: () => request('/settings', { auth: false }),
    saveSetting: (key, value) => request(`/settings/${encodeURIComponent(key)}`, { method: 'PUT', body: { value } }),
    notifications: (q = '') => request(`/notifications${q}`, { auth: false }),
    createNotification: (body) => request('/notifications', { method: 'POST', body }),
    updateNotification: (id, body) => request(`/notifications/${encodeURIComponent(id)}`, { method: 'PUT', body }),
    removeNotification: (id) => request(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    createReport: (body) => request('/reports', { method: 'POST', body, auth: false }),
    reports: (q = '') => request(`/reports${q}`),
    updateReport: (id, body) => request(`/reports/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
    createApplication: (body, clientId) => request('/applications', { method: 'POST', body, auth: false, headers: clientId ? { 'X-Client-Id': clientId } : {} }),
    myApplications: (clientId) => request('/applications/mine', { auth: false, headers: clientId ? { 'X-Client-Id': clientId } : {} }),
    applications: (q = '') => request(`/applications${q}`),
    updateApplication: (id, body) => request(`/applications/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
    removeApplication: (id, clientId) => request(`/applications/${encodeURIComponent(id)}`, { method: 'DELETE', auth: false, headers: clientId ? { 'X-Client-Id': clientId } : {} }),
    createJobRequest: (body, clientId) => request('/job-requests', { method: 'POST', body, auth: false, headers: clientId ? { 'X-Client-Id': clientId } : {} }),
    jobRequests: () => request('/job-requests'),

    // ---- CRUD مدیر ----
    create: (resource, body) => request(`/${resource}`, { method: 'POST', body }),
    update: (resource, id, body) => request(`/${resource}/${encodeURIComponent(id)}`, { method: 'PUT', body }),
    remove: (resource, id) => request(`/${resource}/${encodeURIComponent(id)}`, { method: 'DELETE' }),

    // ---- داده‌های مدیریتی چالش ----
    challengeVotes: (id) => request(`/challenges/${encodeURIComponent(id)}/votes`),
    challengeData: () => request('/admin/challenge-data'),
    challengeDraw: (id, seed) => request(`/challenges/${encodeURIComponent(id)}/draw`, { method: 'POST', body: seed ? { seed } : {} }),
    voidVote: (voteId, reason) => request(`/challenges/votes/${encodeURIComponent(voteId)}/void`, { method: 'PATCH', body: { reason } }),

    // ---- چالش ----
    registerParticipant: (data) => request('/challenges/participants', { method: 'POST', body: data, auth: false }),
    vote: (challengeId, data) => request(`/challenges/${challengeId}/vote`, { method: 'POST', body: data, auth: false }),

    // ---- آپلود ----
    async upload(files) {
      const fd = new FormData();
      [...files].forEach((f) => fd.append('files', f));
      return request('/uploads', { method: 'POST', body: fd });
    },

    health: () => request('/health', { auth: false }),
  };

  global.KarjoAPI = api;
})(window);
