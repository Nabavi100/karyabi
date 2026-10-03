/**
 * پل واقعی فرانت‌اند ↔ بک‌اند کارجو
 *
 * اصل معماری:
 *  - دیتابیس سرور منبع اصلی داده‌های عمومی است.
 *  - localStorage فقط cache و وضعیت محلی UI/کاربر است.
 *  - عملیات مدیر روی آگهی‌ها، شرکت‌ها، دسته‌ها، متخصصین، تخفیف‌ها،
 *    آدرس‌ها و چالش‌ها به API مرکزی همگام می‌شود.
 *  - ثبت‌نام و رأی چالش مستقیماً به سرور ارسال می‌شود.
 *
 * این فایل هیچ استایل یا چیدمان صفحه را تغییر نمی‌دهد.
 */
(function (global) {
  'use strict';

  const BRIDGE = {
    ready: false,
    online: navigator.onLine,
    serverUp: false,
    syncing: false,
    syncTimer: null,
    refreshFromServer: null,
    queueSync: null,
  };

  const API = () => global.KarjoAPI;
  const data = () => typeof global.__KarjoGetData === 'function' ? global.__KarjoGetData() : null;

  const arr = (v) => Array.isArray(v) ? v : [];
  const clone = (v) => {
    try { return JSON.parse(JSON.stringify(v)); } catch (_) { return v; }
  };
  /* اسلاگ ASCII پایدار (سرور فقط a-z0-9- می‌پذیرد؛ نام فارسی قبلاً ۴۰۰ می‌داد) */
  const asciiSlug = (name, id) => {
    let h = 5381; const s = String(id || '') + '|' + String(name || '');
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    const base = String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
    return (base.length >= 2 ? base : 'cat') + '-' + h.toString(36);
  };
  /* وضعیت‌های فقط-UI را به ENUM سرور نگاشت می‌کنیم */
  const JOB_STATUS = { pending: 'draft', rejected: 'disabled', finished: 'expired' };
  const CH_STATUS = { open: 'active', finished: 'closed' };
  const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''));

  /* ---------------- Service Worker ---------------- */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:') return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  /* ---------------- Telegram ---------------- */
  function patchTelegram() {
    const TL = global.TelegramLive;
    if (!TL) return;

    if (typeof global.discountTelegramUrl === 'function' && !global.discountTelegramUrl.__patched) {
      const original = global.discountTelegramUrl;
      const patched = function patchedUrl() {
        const live = TL.info('discount_register');
        if (live && live.url && live.status === 'ok') return live.url;
        return original.apply(this, arguments);
      };
      patched.__patched = true;
      try { global.discountTelegramUrl = patched; } catch (_) {}
    }

    if (global.A && typeof global.A.telegram === 'function' && !global.A.telegram.__patched) {
      const original = global.A.telegram;
      const patched = function patchedTelegram(handleOrPhone) {
        const v = String(handleOrPhone || '').trim();
        if (v) return original.apply(this, arguments);
        return TL.open('support');
      };
      patched.__patched = true;
      try { global.A.telegram = patched; } catch (_) {}
    }
  }

  /* ---------------- Normalization: server -> UI ---------------- */
  function mapCategory(x) {
    return { ...x };
  }

  function mapCompany(x) {
    return { ...x, city: x.city || 'هرات', address: x.address || 'هرات',
      telegram: x.telegram || x.phone || '', whatsapp: x.whatsapp || x.phone || '', email: x.email || '' };
  }

  function mapJob(x, old) {
    return {
      ...(old || {}),
      ...x,
      desc: x.description ?? old?.desc ?? '',
      postedAt: x.postedAt ? new Date(x.postedAt).getTime() : (old?.postedAt || Date.now()),
      deadline: x.deadline ? new Date(x.deadline).getTime() : (old?.deadline || Date.now()),
      duties: arr(x.duties),
      requirements: arr(x.requirements),
      skills: arr(x.skills),
      views: Number(x.views || 0),
      telegram: x.telegram || x.phone || '',
      whatsapp: x.whatsapp || x.phone || '',
      negotiable: old?.negotiable ?? false,
      urgent: old?.urgent ?? false,
      remote: old?.remote ?? false,
      gender: old?.gender ?? 'هر دو',
      applyMethod: old?.applyMethod ?? 'contact',
    };
  }

  function mapProfessional(x, old) {
    return {
      ...(old || {}),
      ...x,
      title: x.job ?? old?.title ?? '',
      cat: x.categoryId ?? old?.cat ?? '',
      exp: Number(x.expYears ?? old?.exp ?? 0),
      skills: arr(x.skills),
      badges: old?.badges || [],
      langs: old?.langs || [],
      edu: old?.edu || '',
      color: old?.color ?? 0,
    };
  }

  function mapDiscount(x, old) {
    return {
      ...(old || {}),
      ...x,
      ts: x.createdAt ? new Date(x.createdAt).getTime() : (old?.ts || Date.now()),
      specs: x.specs ?? old?.specs ?? '',
      color: old?.color ?? 0,
    };
  }

  function mapPlace(x, old) {
    return { ...(old || {}), ...x, desc: x.note ?? old?.desc ?? '' };
  }

  function mapChallenge(x, old) {
    return {
      ...(old || {}),
      ...x,
      startsAt: x.startAt ? new Date(x.startAt).getTime() : (x.startsAt ?? old?.startsAt ?? null),
      endsAt: x.endAt ? new Date(x.endAt).getTime() : (x.endsAt ?? old?.endsAt ?? null),
      active: x.bannerActive !== false && x.status !== 'archived',
      options: arr(x.options),
      voteCount: Number(x.voteCount || 0),
    };
  }

  async function fetchAll(resource, method, limit = 100) {
    const api = API();
    if (!api) throw new Error('API unavailable');
    const out = [];
    let page = 1;
    while (page <= 1000) {
      const d = await api[method](`?page=${page}&limit=${limit}`);
      const items = arr(d?.items || d);
      out.push(...items);
      const totalPages = Number(d?.pagination?.pages || 0);
      if (!items.length || (totalPages && page >= totalPages) || items.length < limit) break;
      page += 1;
    }
    return out;
  }

  async function refreshFromServer(force = false) {
    const api = API();
    if (!api || !navigator.onLine) return false;
    const D = data();
    if (!D) return false;

    try {
      await api.health();
      BRIDGE.serverUp = true;

      const [categories, companies, jobs, professionals, discounts, places, challenges, settings, homeBanners, challengeBanners] =
        await Promise.all([
          fetchAll('categories', 'categories', 200),
          fetchAll('companies', 'companies', 200),
          fetchAll('jobs', 'jobs', 100),
          fetchAll('professionals', 'professionals', 100),
          fetchAll('discounts', 'discounts', 100),
          fetchAll('places', 'places', 200),
          api.challenges(),
          api.settings(),
          api.banners('home'),
          api.banners('challenge'),
        ]);

      const old = {
        jobs: new Map(arr(D.jobs).map(x => [String(x.id), x])),
        professionals: new Map(arr(D.professionals).map(x => [String(x.id), x])),
        discounts: new Map(arr(D.discounts).map(x => [String(x.id), x])),
        places: new Map(arr(D.places).map(x => [String(x.id), x])),
        challenges: new Map(arr(D.challenges).map(x => [String(x.id), x])),
      };

      D.categories = categories.map(mapCategory);
      D.companies = companies.map(mapCompany);
      D.jobs = jobs.map(x => mapJob(x, old.jobs.get(String(x.id))));
      D.professionals = professionals.map(x => mapProfessional(x, old.professionals.get(String(x.id))));
      D.discounts = discounts.map(x => mapDiscount(x, old.discounts.get(String(x.id))));
      D.places = places.map(x => mapPlace(x, old.places.get(String(x.id))));
      D.challenges = arr(challenges?.items || challenges).map(x => mapChallenge(x, old.challenges.get(String(x.id))));

      const homeItems = arr(homeBanners?.items || homeBanners);
      if (homeItems.length) {
        D.homeBanner = { ...(D.homeBanner || {}), slides: homeItems.map(x => ({
          media: x.media, mediaType: x.mediaType || 'image', link: x.link || '', desc: x.description || '',
          phone: x.phone || '', whatsapp: x.whatsapp || '', telegram: x.telegram || ''
        })), active: homeItems.some(x => x.active !== false) };
      }
      const chItems = arr(challengeBanners?.items || challengeBanners);
      if (chItems.length) {
        D.challengeBanner = { ...(D.challengeBanner || {}), media: chItems[0].media, image: chItems[0].media,
          mediaType: chItems[0].mediaType || 'image', active: chItems[0].active !== false, description: chItems[0].description || '' };
      }

      if (settings?.settings) {
        D.contact = { ...(D.contact || {}), ...(settings.settings.contact || {}) };
        D.chSettings = { ...(D.chSettings || {}), ...(settings.settings.chSettings || {}) };
        if (settings.settings.appLogo && typeof settings.settings.appLogo.image === 'string') D.appLogo = { image: settings.settings.appLogo.image };
      }

      /* مدیر: ثبت‌نام‌ها و رأی‌های واقعی را هم از دیتابیس مرکزی می‌خوانیم. */
      if (api.isLoggedIn()) {
        try {
          const pendingJobs = await api.jobRequests();
          const pendingItems = arr(pendingJobs?.items || pendingJobs);
          if (pendingItems.length) {
            const existing = new Map(arr(D.jobs).map(x => [String(x.id), x]));
            pendingItems.forEach(x => {
              const mapped = mapJob(x, existing.get(String(x.id)));
              mapped.status = 'pending';
              mapped.requestOnly = true;
              existing.set(String(x.id), mapped);
            });
            D.jobs = Array.from(existing.values());
          }
        } catch (_) {}
        try {
          const cd = await api.challengeData();
          if (cd && Array.isArray(cd.participants)) {
            D.participants = cd.participants.map(p => ({
              id: p.id, code: p.referralCode, name: String(p.name || '').split(/\s+/)[0] || '',
              last: String(p.name || '').split(/\s+/).slice(1).join(' '),
              father: p.fatherName || '', phone: p.phone || '', blocked: !!p.banned,
              registeredAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(), note: '',
              key: [p.name || '', p.fatherName || ''].join('|'),
              votes: arr(p.votes).map(v => ({
                id: v.id, chId: v.challengeId, optionId: v.optionId, comment: v.comment || '',
                ts: v.createdAt ? new Date(v.createdAt).getTime() : Date.now(),
                void: !!v.void, winner: !!v.winner, edited: false, sig: v.signature || ''
              }))
            }));
          }
        } catch (_) {}
      }

      if (typeof global.__KarjoSetData === 'function') global.__KarjoSetData(D);
      try { if (typeof global.render === 'function') global.render(); } catch (_) {}

      BRIDGE.lastServerSnapshot = {
        categories: clone(D.categories),
        companies: clone(D.companies),
        jobs: clone(D.jobs),
        professionals: clone(D.professionals),
        discounts: clone(D.discounts),
        places: clone(D.places),
        challenges: clone(D.challenges),
      };

      /* بعد از ورود مدیر، localStorage قدیمی دیگر منبع داده نیست. */
      if (force || api.isLoggedIn()) {
        await syncCentralChanges();
      }
      return true;
    } catch (e) {
      BRIDGE.serverUp = false;
      return false;
    }
  }

  /* ---------------- UI -> server payloads ---------------- */
  const payloads = {
    category(x) {
      return { name: x.name, slug: (x.slug && /^[a-z0-9-]+$/i.test(x.slug)) ? x.slug : asciiSlug(x.name, x.id),
        icon: x.icon || 'case', color: Number(x.color || 0), sortOrder: Number(x.sortOrder || 0), active: x.active !== false };
    },
    company(x) {
      return { name: x.name, about: x.about || '', logo: x.logo || null, city: x.city || 'هرات',
        address: x.address || 'هرات', phone: x.phone || null, email: x.email || null, whatsapp: x.whatsapp || x.phone || null,
        telegram: x.telegram || x.phone || null, website: x.website || null, verified: !!x.verified, color: Number(x.color || 0) };
    },
    job(x) {
      return { title: x.title, companyId: isUuid(x.companyId) ? x.companyId : null,
        categoryId: isUuid(x.categoryId) ? x.categoryId : null, type: x.type || 'تمام‌وقت', duration: x.duration || null, gender: x.gender || 'هر دو',
        level: x.level || 'متوسط', salaryMin: x.salaryMin == null ? null : Number(x.salaryMin),
        salaryMax: x.salaryMax == null ? null : Number(x.salaryMax), expMin: Number(x.expMin || 0),
        expMax: Number(x.expMax || 0), city: x.city || 'هرات', area: x.area || null, address: x.address || null,
        lat: x.lat == null ? null : Number(x.lat), lng: x.lng == null ? null : Number(x.lng),
        locPicked: !!x.locPicked, phone: x.phone || null, whatsapp: x.whatsapp || x.phone || null,
        telegram: x.telegram || x.phone || null, email: x.email || null, duties: arr(x.duties),
        requirements: arr(x.requirements), skills: arr(x.skills), benefits: x.benefits || null,
        description: x.description ?? x.desc ?? null, status: JOB_STATUS[x.status] || x.status || 'active', views: Number(x.views || 0),
        postedAt: x.postedAt ? new Date(x.postedAt).toISOString() : new Date().toISOString(),
        deadline: x.deadline ? new Date(x.deadline).toISOString() : null };
    },
    professional(x) {
      return { name: x.name, job: x.job ?? x.title ?? '', categoryId: isUuid(x.categoryId) ? x.categoryId : (isUuid(x.cat) ? x.cat : null),
        bio: x.bio || '', photo: x.photo || null, city: x.city || 'هرات', phone: x.phone || null,
        whatsapp: x.whatsapp || x.phone || null, telegram: x.telegram || x.phone || null,
        skills: arr(x.skills), expYears: Number(x.expYears ?? x.exp ?? 0), avail: x.avail || 'آماده همکاری',
        rating: Number(x.rating || 0), active: x.active !== false };
    },
    discount(x) {
      return { title: x.title, img: x.img || null, percent: Number(x.percent || 0),
        priceOld: x.priceOld == null ? null : Number(x.priceOld), priceNew: x.priceNew == null ? null : Number(x.priceNew),
        shop: x.shop || null, address: x.address || null, phone: x.phone || null,
        whatsapp: x.whatsapp || x.phone || null, telegram: x.telegram || null,
        expiresAt: x.expiresAt ? new Date(x.expiresAt).toISOString() : null, active: x.active !== false,
        specs: x.specs || null };
    },
    place(x) {
      return { name: x.name, cat: x.cat || 'other', address: x.address || null, phone: x.phone || null,
        lat: x.lat == null ? null : Number(x.lat), lng: x.lng == null ? null : Number(x.lng),
        hours: x.hours || null, note: x.note ?? x.desc ?? null, approved: x.approved !== false };
    },
    challenge(x) {
      return { title: x.title, details: x.details || '', banner: x.banner || null,
        bannerType: x.bannerType || (x.banner && /\.(mp4|webm|mov)(\?|$)/i.test(x.banner) ? 'video' : 'image'),
        bannerActive: x.bannerActive !== false, options: arr(x.options), prize: x.prize || null,
        winnersCount: Math.max(1, Number(x.winnersCount || 1)), status: CH_STATUS[x.status] || x.status || 'draft',
        startAt: x.startAt ?? x.startsAt ? new Date(x.startAt ?? x.startsAt).toISOString() : null,
        endAt: x.endAt ?? x.endsAt ? new Date(x.endAt ?? x.endsAt).toISOString() : null,
        requireFollow: x.requireFollow !== false };
    }
  };

  const resources = [
    ['categories', 'categories', 'category'],
    ['companies', 'companies', 'company'],
    ['jobs', 'jobs', 'job'],
    ['professionals', 'professionals', 'professional'],
    ['discounts', 'discounts', 'discount'],
    ['places', 'places', 'place'],
    ['challenges', 'challenges', 'challenge'],
  ];

  const comparable = (resource, x) => {
    const p = payloads[resource](x);
    return JSON.stringify(p);
  };

  function replaceIdEverywhere(oldId, newId) {
    const D = data();
    if (!D || oldId === newId) return;
    const refs = ['jobs', 'professionals'];
    refs.forEach(k => arr(D[k]).forEach(x => {
      if (String(x.categoryId) === String(oldId)) x.categoryId = newId;
      if (String(x.companyId) === String(oldId)) x.companyId = newId;
    }));
    arr(D.challenges).forEach(c => {
      if (String(c.id) === String(oldId)) c.id = newId;
    });
  }

  async function syncCollection(key, apiName, payloadName, current, previous) {
    const api = API();
    const before = new Map(arr(previous).map(x => [String(x.id), x]));
    const now = arr(current);

    /* حذف‌ها */
    for (const old of before.values()) {
      if (!now.some(x => String(x.id) === String(old.id))) {
        if (isUuid(old.id)) {
          try { await api.remove(apiName, old.id); } catch (_) {}
        }
      }
    }

    /* ایجاد/ویرایش */
    for (const item of now) {
      const id = String(item.id || '');
      const old = before.get(id);

      if (!isUuid(id)) {
        try {
          const created = await api.create(apiName, payloads[payloadName](item));
          const serverItem = created?.item || created;
          if (serverItem?.id) {
            const D = data();
            const live = arr(D[key]).find(x => String(x.id) === id);
            if (live) Object.assign(live, payloadsToUi(payloadName, serverItem));
            replaceIdEverywhere(id, serverItem.id);
          }
        } catch (_) {}
        continue;
      }

      if (!old || comparable(payloadName, item) !== comparable(payloadName, old)) {
        try {
          const updated = await api.update(apiName, id, payloads[payloadName](item));
          const serverItem = updated?.item || updated;
          if (serverItem) {
            const D = data();
            const live = arr(D[key]).find(x => String(x.id) === id);
            if (live) Object.assign(live, payloadsToUi(payloadName, serverItem));
          }
        } catch (_) {}
      }
    }
  }

  function payloadsToUi(type, x) {
    if (type === 'job') return mapJob(x);
    if (type === 'professional') return mapProfessional(x);
    if (type === 'discount') return mapDiscount(x);
    if (type === 'place') return mapPlace(x);
    if (type === 'challenge') return mapChallenge(x);
    if (type === 'company') return mapCompany(x);
    return mapCategory(x);
  }

  async function syncCentralChanges() {
    const api = API();
    const D = data();
    if (!api || !D || !api.isLoggedIn() || BRIDGE.syncing) return false;

    BRIDGE.syncing = true;
    try {
      const prev = BRIDGE.lastServerSnapshot || {};
      for (const [key, apiName, payloadName] of resources) {
        await syncCollection(key, apiName, payloadName, D[key], prev[key] || []);
      }
      BRIDGE.lastServerSnapshot = {
        categories: clone(D.categories), companies: clone(D.companies), jobs: clone(D.jobs),
        professionals: clone(D.professionals), discounts: clone(D.discounts),
        places: clone(D.places), challenges: clone(D.challenges),
      };
      try { if (typeof global.__KarjoSetData === 'function') global.__KarjoSetData(D); } catch (_) {}
      return true;
    } finally {
      BRIDGE.syncing = false;
    }
  }

  function queueSync() {
    if (!API()?.isLoggedIn?.() || !BRIDGE.serverUp) return;
    clearTimeout(BRIDGE.syncTimer);
    BRIDGE.syncTimer = setTimeout(() => {
      syncCentralChanges().catch(() => {});
    }, 350);
  }

  /* ---------------- Notifications / reports / settings ---------------- */
  function applicationClientId() {
    const key = 'karjo_application_client_id';
    try {
      let id = localStorage.getItem(key);
      if (!id || !/^[A-Za-z0-9_-]{16,128}$/.test(id)) {
        const bytes = new Uint8Array(24);
        if (global.crypto?.getRandomValues) global.crypto.getRandomValues(bytes);
        else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
        id = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem(key, id);
      }
      return id;
    } catch (_) { return null; }
  }
  async function syncAuxiliaryData(force = false) {
    const api = API();
    const D = data();
    if (!api || !D || !BRIDGE.serverUp) return false;
    try {
      const settings = await api.settings();
      if (settings?.settings) {
        D.contact = { ...(D.contact || {}), ...(settings.settings.contact || {}) };
        D.chSettings = { ...(D.chSettings || {}), ...(settings.settings.chSettings || {}) };
        if (settings.settings.appLogo && typeof settings.settings.appLogo.image === 'string') D.appLogo = { image: settings.settings.appLogo.image };
        if (settings.settings.discountTelegramLink) D.discountTelegramLink = String(settings.settings.discountTelegramLink);
      }
      const notifications = await api.notifications();
      if (Array.isArray(notifications?.items || notifications)) {
        D.notifications = arr(notifications?.items || notifications).map(n => ({
          ...n, ts: n.sentAt ? new Date(n.sentAt).getTime() : (n.ts || Date.now()),
          cat: n.zone && n.zone !== 'all' ? n.zone : (n.cat || null), reads: arr(n.reads)
        }));
      }
      try {
        const mine = await api.myApplications(applicationClientId());
        if (Array.isArray(mine?.items || mine)) {
          D.applications = arr(mine?.items || mine).map(a => ({
            id: a.id, jobId: a.jobId, userId: a.userId || 'guest', uname: a.name, uphone: a.phone,
            status: a.status || 'applied', note: a.note || '', ts: a.createdAt ? new Date(a.createdAt).getTime() : Date.now()
          }));
        }
      } catch (_) {}
      if (api.isLoggedIn()) {
        try {
          const reports = await api.reports('?page=1&limit=200');
          if (Array.isArray(reports?.items || reports)) {
            D.reports = arr(reports?.items || reports).map(r => ({
              ...r, ts: r.createdAt ? new Date(r.createdAt).getTime() : (r.ts || Date.now()), reporterId: r.reporterId || 'guest'
            }));
          }
        } catch (_) {}
      }
      if (typeof global.__KarjoSetData === 'function') global.__KarjoSetData(D);
      return true;
    } catch (_) { return false; }
  }

  async function savePublicSetting(key, value) {
    const api = API();
    if (!api?.isLoggedIn?.()) throw new Error('برای ذخیره تنظیمات باید وارد حساب مدیر شوید');
    await api.saveSetting(key, value);
    await syncAuxiliaryData(true);
  }

  function patchAuxiliaryAdminActions() {
    const A = global.A;
    if (!A || A.__auxServerPatched) return;
    const wrap = (name, fn) => {
      if (typeof A[name] !== 'function' || A[name].__serverPatched) return;
      const original = A[name];
      const adminOnly = {
        notifSend: 1, notifEditGo: 1, appStatus: 1, repAct: 1, notifDel: 1,
        contactSave: 1, logoSave: 1, logoReset: 1, discountTelegramSave: 1, chSettingsSave: 1,
      };
      const patched = async function () {
        const remote = BRIDGE.serverUp && API() && (!adminOnly[name] || API().isLoggedIn());
        if (!remote) return original.apply(this, arguments);
        try { return await fn.apply(this, arguments); }
        catch (e) {
          try { return original.apply(this, arguments); }
          catch (_) {
            if (global.toast) global.toast(e.message || 'عملیات ناموفق بود', 'err');
          }
        }
      };
      patched.__serverPatched = true;
      A[name] = patched;
    };

    wrap('reportGo', async function (type, id) {
      const reason = String(document.getElementById('rp_reason')?.value || '').trim();
      if (!reason) throw new Error('دلیل گزارش را وارد کنید');
      const r = await API().createReport({ type, targetId: id, reason });
      const item = r?.item || r;
      const D = data();
      D.reports = arr(D.reports);
      D.reports.unshift({ ...item, id: item.id, type, targetId: id, reason, ts: Date.now(), reporterId: 'guest' });
      if (global.saveDB) global.saveDB();
      if (global.closeLayer) global.closeLayer();
      if (global.toast) global.toast('گزارش در سرور ثبت شد. تشکر!', 'ok');
      if (global.render) global.render();
    });

    wrap('notifSend', async function () {
      const t = String(document.getElementById('nf_title')?.value || '').trim();
      const b = String(document.getElementById('nf_body')?.value || '').trim();
      const zone = String(document.getElementById('nf_cat')?.value || '').trim() || 'all';
      if (!t || !b) throw new Error('عنوان و متن الزامی است');
      await API().createNotification({ title: t, body: b, zone });
      await syncAuxiliaryData(true);
      if (global.render) global.render();
      if (global.toast) global.toast(zone !== 'all' ? 'اعلان هدفمند در سرور ذخیره شد' : 'اعلان عمومی در سرور ذخیره شد', 'ok');
    });

    wrap('notifEditGo', async function (id) {
      const t = String(document.getElementById('ne_title')?.value || '').trim();
      const b = String(document.getElementById('ne_body')?.value || '').trim();
      if (!t || !b) throw new Error('عنوان و متن الزامی است');
      await API().updateNotification(id, { title: t, body: b });
      await syncAuxiliaryData(true);
      if (global.closeLayer) global.closeLayer();
      if (global.render) global.render();
      if (global.toast) global.toast('اعلان در سرور ویرایش شد', 'ok');
    });

    wrap('placeSubmit', async function () {
      const g = id => document.getElementById('up_'+id)?.value ?? '';
      const name = String(g('name')).trim(), address = String(g('address')).trim();
      if (!name) throw new Error('نام مرکز الزامی است');
      if (!address) throw new Error('آدرس را وارد کنید');
      await API().post('/places/suggest', { name, cat: g('cat') || 'company', address, phone: String(g('phone')).trim(), note: String(g('desc')).trim(), lat: 34.34, lng: 62.20 });
      if (global.closeLayer) global.closeLayer(); if (global.go) global.go('menu');
      if (global.toast) global.toast('آدرس به سرور ارسال شد و پس از تأیید مدیر نمایش داده می‌شود', 'ok');
    });

    wrap('applyGo', async function (id) {
      const name = String(document.getElementById('ap_name')?.value || '').trim();
      const phone = String(document.getElementById('ap_phone')?.value || '').trim();
      const note = String(document.getElementById('ap_note')?.value || '');
      if (name.length < 3) throw new Error('نام کامل خود را بنویسید');
      if (phone.replace(/\D/g, '').length < 7) throw new Error('شماره تلفن معتبر نیست');
      const r = await API().createApplication({ jobId: id, name, phone, note }, applicationClientId());
      const item = r?.item || r; const D = data(); D.applications = arr(D.applications);
      D.applications.unshift({ id: item.id, jobId: id, userId: 'guest', uname: name, uphone: phone, note, status: item.status || 'applied', ts: Date.now() });
      if (global.saveDB) global.saveDB(); if (global.closeLayer) global.closeLayer(); if (global.render) global.render();
      if (global.toast) global.toast('درخواست شما در سرور ثبت شد', 'ok');
    });

    wrap('withdrawGo', async function (aid) {
      await API().removeApplication(aid, applicationClientId());
      const D = data(); D.applications = arr(D.applications).filter(x => String(x.id) !== String(aid));
      if (global.saveDB) global.saveDB(); if (global.closeLayer) global.closeLayer(); if (global.render) global.render();
      if (global.toast) global.toast('درخواست حذف شد', 'ok');
    });

    wrap('appStatus', async function (aid, st) {
      const D = data(); const a = arr(D.applications).find(x => String(x.id) === String(aid));
      if (!a) throw new Error('درخواست پیدا نشد');
      await API().updateApplication(aid, { status: st });
      a.status = st; if (global.saveDB) global.saveDB(); if (global.render) global.render();
      if (global.toast) global.toast('وضعیت درخواست در سرور به‌روزرسانی شد', 'ok');
    });

    wrap('repAct', async function (rid, act) {
      const D = data();
      const r = arr(D.reports).find(x => String(x.id) === String(rid));
      if (!r) throw new Error('گزارش پیدا نشد');
      if (act === 'disable' && r.type === 'job') {
        const j = arr(D.jobs).find(x => String(x.id) === String(r.targetId));
        if (j) {
          if (j.status === 'active') await API().update('jobs', j.id, { status: 'disabled' });
          j.status = 'disabled';
        }
      }
      await API().updateReport(rid, { status: act === 'disable' ? 'actioned' : 'dismissed' });
      r.status = act === 'disable' ? 'actioned' : 'dismissed';
      if (global.saveDB) global.saveDB();
      if (global.render) global.render();
      if (global.toast) global.toast(act === 'disable' ? 'آگهی غیرفعال و گزارش بسته شد' : 'گزارش بسته شد', 'ok');
    });

    wrap('notifDel', async function (id) {
      await API().removeNotification(id);
      const D = data(); D.notifications = arr(D.notifications).filter(n => String(n.id) !== String(id));
      if (global.saveDB) global.saveDB();
      if (global.render) global.render();
      if (global.toast) global.toast('اعلان حذف شد', 'ok');
    });

    wrap('contactSave', async function () {
      const ph = String(document.getElementById('ct_phone')?.value || '').trim();
      const wa = String(document.getElementById('ct_whatsapp')?.value || '').trim();
      const tg = String(document.getElementById('ct_telegram')?.value || '').trim();
      if (!ph && !wa && !tg) throw new Error('حداقل یک راه ارتباطی وارد کنید');
      await savePublicSetting('contact', { phone: ph, whatsapp: wa, telegram: tg });
      const D = data(); D.contact = { phone: ph, whatsapp: wa, telegram: tg };
      if (global.saveDB) global.saveDB(); if (global.render) global.render();
      if (global.toast) global.toast('راه‌های ارتباطی در سرور ذخیره شد', 'ok');
    });

    wrap('logoSave', async function () {
      const pend = typeof global.__KarjoLogoPending === 'function' ? global.__KarjoLogoPending() : null;
      if (pend === null || pend === undefined) throw new Error('اول یک عکس برای لوگو انتخاب کنید');
      await savePublicSetting('appLogo', { image: pend });
      const D = data(); D.appLogo = { image: pend };
      if (global.__KarjoLogoClear) global.__KarjoLogoClear();
      if (global.saveDB) global.saveDB(); if (global.render) global.render();
      if (global.toast) global.toast('لوگوی جدید در سرور ذخیره شد', 'ok');
    });

    wrap('logoReset', async function () {
      await savePublicSetting('appLogo', { image: '' });
      const D = data(); D.appLogo = { image: '' };
      if (global.__KarjoLogoClear) global.__KarjoLogoClear();
      if (global.saveDB) global.saveDB(); if (global.render) global.render();
      if (global.toast) global.toast('لوگوی پیش‌فرض برگردانده شد', 'ok');
    });

    wrap('discountTelegramSave', async function () {
      const url = String(document.getElementById('discount_tg_link')?.value || '').trim();
      if (!/^https?:\/\/(?:www\.)?t\.me\/[A-Za-z0-9_+\/-]+(?:\?.*)?$/i.test(url)) throw new Error('لینک معتبر تلگرام وارد کنید');
      await savePublicSetting('discountTelegramLink', url);
      const D = data(); D.discountTelegramLink = url;
      if (global.saveDB) global.saveDB(); if (global.render) global.render();
      if (global.toast) global.toast('لینک در سرور ذخیره شد', 'ok');
    });

    wrap('chSettingsSave', async function () {
      const g = id => document.getElementById(id)?.value || '';
      const on = id => !!document.getElementById(id)?.classList.contains('on');
      const D = data(); D.chSettings = D.chSettings || {};
      const value = { ...D.chSettings,
        minComment: Math.max(1, Math.min(200, parseInt(g('cs_min'), 10) || 5)),
        maxComment: Math.max(1, Math.min(2000, parseInt(g('cs_max'), 10) || 600)),
        maxDailyDevices: Math.max(1, Math.min(100, parseInt(g('cs_daily'), 10) || 5)),
        facebookLink: g('cs_fb').trim(), instagramLink: g('cs_ig').trim(),
        followFacebook: on('cs_fb_sw'), followInstagram: on('cs_ig_sw'), showLive: on('cs_live') };
      await savePublicSetting('chSettings', value);
      D.chSettings = value; if (global.saveDB) global.saveDB(); if (global.render) global.render();
      if (global.toast) global.toast('تنظیمات چالش در سرور ذخیره شد', 'ok');
    });

    if (typeof A.hbCommit === 'function' && !A.hbCommit.__bannerServerPatched) {
      const original = A.hbCommit;
      const patched = async function (slides) {
        if (!BRIDGE.serverUp || !API()?.isLoggedIn?.()) return original.apply(this, arguments);
        const D = data();
        const normalized = arr(slides).slice(0, 5).map(x => ({ media: x.media, mediaType: x.mediaType || 'image',
          link: x.link || '', description: x.desc || x.description || '', phone: x.phone || '',
          whatsapp: x.whatsapp || '', telegram: x.telegram || '', active: D?.homeBanner?.active !== false }));
        try {
          await API().saveBanners(normalized, 'home');
        } catch (e) {
          return original.apply(this, arguments);
        }
        const result = original.apply(this, arguments);
        await syncAuxiliaryData(true);
        if (global.toast) global.toast('بنر خانه در سرور ذخیره شد', 'ok');
        return result;
      };
      patched.__bannerServerPatched = true; A.hbCommit = patched;
    }

    A.__auxServerPatched = true;
  }

  /* ---------------- Challenge user flow ---------------- */
  function patchChallengeFlows() {
    if (!global.chRegister && !global.chVoteSubmit) return;

    /* توابع اصلی را با API مرکزی جایگزین می‌کنیم؛ UI و اعتبارسنجی اولیه حفظ می‌شود. */
    if (typeof global.chRegister === 'function' && !global.chRegister.__serverPatched) {
      const original = global.chRegister;
      const patched = async function () {
        const D = data();
        const g = id => String(document.getElementById(id)?.value || '');
        const fullname = g('chr_fullname').trim();
        const father = g('chr_father').trim();
        const parts = fullname.split(/\s+/);
        const name = parts[0] || '';
        const last = parts.slice(1).join(' ') || '';
        if (!name || !last || !father) return original.apply(this, arguments);
        if (!BRIDGE.serverUp || !API()) return original.apply(this, arguments);

        try {
          const phoneEl = document.getElementById('chr_phone');
          const phone = String(phoneEl?.value || D?.contact?.phone || '').trim();
          const result = await API().registerParticipant({ name: `${name} ${last}`, fatherName: father, phone });
          const p = result?.participant;
          if (!p) throw new Error('ثبت‌نام از سرور پاسخ معتبر نداد');

          D.participants = arr(D.participants);
          let local = D.participants.find(x => String(x.id) === String(p.id));
          if (!local) {
            local = { id: p.id, code: p.referralCode, name, last, father, phone: p.phone,
              key: `${name}|${last}|${father}`, registeredAt: new Date(p.createdAt || Date.now()).getTime(),
              votes: [], blocked: !!p.banned, note: '', deviceIds: [] };
            D.participants.push(local);
          } else {
            local.code = p.referralCode;
            local.phone = p.phone;
          }
          try { localStorage.setItem('karjo_ch_profile_v1', JSON.stringify({ id: p.id, code: p.referralCode })); } catch (_) {}
          if (typeof global.saveDB === 'function') global.saveDB();
          try { global.render(); } catch (_) {}
          if (global.toast) global.toast(result?.existed ? 'ثبت‌نام شما قبلاً انجام شده بود — همان کد یکتا نمایش داده شد' : 'ثبت‌نام موفق! کد رفرال شما صادر شد', 'ok');
        } catch (e) {
          return original.apply(this, arguments);
        }
      };
      patched.__serverPatched = true;
      global.chRegister = patched;
    }

    if (typeof global.chVoteSubmit === 'function' && !global.chVoteSubmit.__serverPatched) {
      const original = global.chVoteSubmit;
      const patched = async function (chId) {
        const D = data();
        const p = typeof global.chParticipant === 'function' ? global.chParticipant() : null;
        const c = arr(D?.challenges).find(x => String(x.id) === String(chId));
        const sel = (global.S?.chSel || {})[chId] || '';
        const opt = c && typeof global.chOption === 'function' ? global.chOption(c, sel) : null;
        const comment = String(document.getElementById('ch_cmt_' + chId)?.value || '').replace(/\s+/g, ' ').trim();

        if (!p || !c || !opt || comment.length < 5) return original.apply(this, arguments);
        if (!BRIDGE.serverUp || !API()) return original.apply(this, arguments);

        try {
          const fb = !!document.getElementById('ch_follow_fb_' + chId)?.checked;
          const ig = !!document.getElementById('ch_follow_ig_' + chId)?.checked;
          const result = await API().vote(chId, {
            participantId: p.id, optionId: opt.id, comment,
            followedFacebook: fb, followedInstagram: ig,
          });
          const v = result?.vote;
          if (!v) throw new Error('رأی از سرور پاسخ معتبر نداد');

          p.votes = arr(p.votes);
          p.votes.push({ id: v.id, chId, optionId: v.optionId, comment: v.comment,
            ts: new Date(v.createdAt || Date.now()).getTime(), device: '', void: !!v.void,
            winner: !!v.winner, edited: false, sig: v.signature || '' });
          p.lastVoteAt = Date.now();
          if (typeof global.saveDB === 'function') global.saveDB();
          try { global.render(); } catch (_) {}
          if (global.toast) global.toast('رأی و کامنت شما در سرور ثبت شد', 'ok');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
          return original.apply(this, arguments);
        }
      };
      patched.__serverPatched = true;
      global.chVoteSubmit = patched;
    }
  }

  /* ---------------- Admin challenge actions ---------------- */
  function patchAdminChallengeActions() {
    if (!global.A || !global.A.__challengeServerPatched) {
      const A = global.A;
      if (!A) return;

      const wrapAsync = (name, fn) => {
        if (typeof A[name] !== 'function' || A[name].__serverPatched) return;
        const original = A[name];
        const patched = async function () {
          if (!BRIDGE.serverUp || !API()?.isLoggedIn?.()) return original.apply(this, arguments);
          try { return await fn.apply(this, arguments); }
          catch (e) {
            try { return original.apply(this, arguments); }
            catch (_) {
              if (global.toast) global.toast(e.message || 'عملیات ناموفق بود', 'err');
            }
          }
        };
        patched.__serverPatched = true;
        A[name] = patched;
      };

      wrapAsync('chSetStatus', async function (id, st) {
        await API().update('challenges', id, { status: CH_STATUS[st] || st });
        const D = data(), c = arr(D.challenges).find(x => String(x.id) === String(id));
        if (c) c.status = st;
        if (global.saveDB) global.saveDB();
        if (global.render) global.render();
        if (global.toast) global.toast(st === 'closed' ? 'رأی‌گیری بسته شد' : 'رأی‌گیری باز شد', 'ok');
      });

      wrapAsync('chDelGo', async function (id) {
        await API().remove('challenges', id);
        const D = data(); D.challenges = arr(D.challenges).filter(x => String(x.id) !== String(id));
        if (global.saveDB) global.saveDB();
        if (global.closeLayer) global.closeLayer();
        if (global.render) global.render();
        if (global.toast) global.toast('چالش حذف شد', 'ok');
      });

      wrapAsync('chDrawGo', async function (id) {
        const r = await API().challengeDraw(id);
        const D = data(), c = arr(D.challenges).find(x => String(x.id) === String(id));
        if (c) c.status = 'closed';
        if (global.saveDB) global.saveDB();
        if (global.closeLayer) global.closeLayer();
        if (global.render) global.render();
        if (global.toast) global.toast('قرعه‌کشی در سرور انجام شد', 'ok');
        return r;
      });

      wrapAsync('chVoteVoidGo', async function (pid, cid) {
        const D = data(), p = arr(D.participants).find(x => String(x.id) === String(pid));
        const v = p && arr(p.votes).find(x => String(x.chId) === String(cid));
        if (!v || !v.id) throw new Error('رأی سرور پیدا نشد');
        await API().voidVote(v.id, 'تخلف');
        v.void = true;
        if (global.saveDB) global.saveDB();
        if (global.closeLayer) global.closeLayer();
        if (global.render) global.render();
        if (global.toast) global.toast('رأی در سرور باطل شد', 'ok');
      });

      A.__challengeServerPatched = true;
    }
  }

  /* ---------------- Network state ---------------- */
  function watchNetwork() {
    const update = () => {
      BRIDGE.online = navigator.onLine;
      document.documentElement.setAttribute('data-online', String(BRIDGE.online));
    };
    window.addEventListener('online', () => {
      update();
      refreshFromServer(false).catch(() => {});
    });
    window.addEventListener('offline', update);
    update();
  }

  async function init() {
    registerSW();
    watchNetwork();

    if (global.TelegramLive) {
      try { await global.TelegramLive.init({ observe: true }); } catch (_) {}
      patchTelegram();
      global.TelegramLive.onChange(() => patchTelegram());
    }

    if (global.__KarjoDBReady) {
      await refreshFromServer(false);
    }

    patchChallengeFlows();
    patchAdminChallengeActions();
    patchAuxiliaryAdminActions();
    await syncAuxiliaryData(false);

    let tries = 0;
    const iv = setInterval(() => {
      patchTelegram();
      patchChallengeFlows();
      patchAdminChallengeActions();
      patchAuxiliaryAdminActions();
      /* بعد از ورود مدیر، با توکن جدید داده‌های خصوصی را دوباره می‌گیریم. */
      if (API()?.isLoggedIn?.() && !BRIDGE.adminHydrated) {
        BRIDGE.adminHydrated = true;
        refreshFromServer(true).catch(() => {});
      }
      if (++tries > 40) clearInterval(iv);
    }, 500);

    BRIDGE.refreshFromServer = refreshFromServer;
    BRIDGE.queueSync = queueSync;
    BRIDGE.ready = true;
    global.KarjoBridge = BRIDGE;
    document.dispatchEvent(new CustomEvent('karjo:bridge-ready', { detail: BRIDGE }));
  }

  global.KarjoBridge = BRIDGE;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
