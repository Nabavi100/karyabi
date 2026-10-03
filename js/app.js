(function () {
  const { jobs, banners, site } = window.KARJOY;
  const SAVED_KEY = "karjoy-herat-saved";

  const state = {
    query: "",
    category: "",
    type: "",
    onlyNew: false,
    onlySaved: false,
    banner: 0,
    openId: null,
  };

  const $ = (sel) => document.querySelector(sel);

  function faNum(n) {
    return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  }
  function faInt(n) {
    return faNum(Number(n).toLocaleString("en-US")).replace(/,/g, "٬");
  }

  function loadSaved() {
    try {
      return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    } catch {
      return [];
    }
  }
  function saveSaved(ids) {
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  }
  function isSaved(id) {
    return loadSaved().includes(id);
  }
  function toggleSave(id) {
    const ids = loadSaved();
    const i = ids.indexOf(id);
    if (i >= 0) ids.splice(i, 1);
    else ids.unshift(id);
    saveSaved(ids);
    toast(i >= 0 ? "آگهی از ذخیره‌ها حذف شد" : "آگهی ذخیره شد");
    render();
  }

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function avatarColor(name) {
    const colors = ["#0f6b4c", "#9a4a32", "#1d4ed8", "#7c3aed", "#0f766e", "#b45309", "#be123c"];
    let h = 0;
    for (const c of name) h = (h + c.charCodeAt(0)) % colors.length;
    return colors[h];
  }

  function filtered() {
    const q = state.query.trim();
    return jobs.filter((j) => {
      if (state.category && j.category !== state.category) return false;
      if (state.type && j.type !== state.type) return false;
      if (state.onlyNew && !j.isNew) return false;
      if (state.onlySaved && !isSaved(j.id)) return false;
      if (q) {
        const blob = [j.title, j.company, j.category, j.address, ...(j.skills || [])].join(" ");
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }

  function groupByDate(list) {
    const map = new Map();
    list.forEach((j) => {
      if (!map.has(j.date)) map.set(j.date, []);
      map.get(j.date).push(j);
    });
    return map;
  }

  function jobCard(j) {
    const open = state.openId === j.id;
    const saved = isSaved(j.id);
    const urgent = j.deadlineDays <= 5;
    const tg = `https://t.me/${j.telegram}`;
    const wa = `https://wa.me/93${j.phone.replace(/^0/, "")}?text=${encodeURIComponent("سلام، درباره آگهی «" + j.title + "» پیام می‌دهم.")}`;
    return `
      <article class="job ${open ? "open" : ""}" data-id="${j.id}">
        <div class="job-top">
          <div class="job-identity">
            <div class="avatar" style="background:${avatarColor(j.company)}">${j.company.trim().charAt(0)}</div>
            <div>
              <h3>${j.title}</h3>
              <div class="company">${j.company} · ${j.address.split("،")[0]}</div>
            </div>
          </div>
          <span class="views" title="بازدید">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            ${faInt(j.views)}
          </span>
        </div>
        <div class="tags">
          <span class="tag type">${j.type}</span>
          ${j.isNew ? `<span class="tag new">جدید</span>` : ""}
          <span class="tag">${j.category}</span>
          ${urgent ? `<span class="tag warn">مهلت رو به پایان</span>` : ""}
        </div>
        <dl class="meta">
          <div><dt>دسته‌بندی</dt><dd>${j.category}</dd></div>
          <div><dt>تجربه موردنیاز</dt><dd>${j.experience}</dd></div>
          <div><dt>تاریخ انتشار</dt><dd>${j.published}</dd></div>
          <div><dt>آخرین مهلت</dt><dd>${j.deadline}</dd></div>
        </dl>
        <div class="details">
          <h4>شرح وظایف</h4>
          <ul>${j.duties.map((x) => `<li>${x}</li>`).join("")}</ul>
          <h4>شرایط استخدام</h4>
          <ul>${j.requirements.map((x) => `<li>${x}</li>`).join("")}</ul>
          <h4>مهارت‌های موردنیاز</h4>
          <div class="skill-row">${j.skills.map((s) => `<span class="skill">${s}</span>`).join("")}</div>
          <h4>مزایا</h4>
          <p>${j.benefits}</p>
          <h4>درباره شرکت</h4>
          <p>${j.about}</p>
          <h4>آدرس محل کار</h4>
          <p>${j.address}</p>
          <div class="actions">
            <button class="btn-ghost btn-save ${saved ? "on" : ""}" data-save="${j.id}">${saved ? "ذخیره شده" : "ذخیره آگهی"}</button>
            <a class="btn-call" href="tel:${j.phone}">تماس</a>
            <a class="btn-tg" target="_blank" rel="noopener" href="${tg}">تلگرام</a>
            <a class="btn-wa" target="_blank" rel="noopener" href="${wa}">واتساپ</a>
          </div>
        </div>
        <button class="toggle" data-toggle="${j.id}">${open ? "بستن جزئیات" : "مشاهده جزئیات آگهی"}</button>
      </article>
    `;
  }

  function renderBanner() {
    const b = banners[state.banner];
    $("#banner-img").src = b.image;
    $("#banner-img").alt = b.title;
    $("#banner-kicker").textContent = b.kicker;
    $("#banner-title").textContent = b.title;
    $("#banner-text").textContent = b.text;
    $("#dots").innerHTML = banners
      .map((_, i) => `<button data-dot="${i}" class="${i === state.banner ? "on" : ""}" aria-label="بنر ${i + 1}"></button>`)
      .join("");
  }

  function render() {
    const list = filtered();
    const savedCount = loadSaved().length;
    if ($("#saved-count")) {
      $("#saved-count").textContent = faNum(savedCount);
      $("#saved-count").style.display = savedCount ? "grid" : "none";
    }
    if ($("#stat-jobs")) $("#stat-jobs").textContent = faNum(jobs.length);
    if ($("#stat-new")) $("#stat-new").textContent = faNum(jobs.filter((j) => j.isNew).length);
    if ($("#stat-cos")) $("#stat-cos").textContent = faNum(new Set(jobs.map((j) => j.company)).size);
    if ($("#stat-views")) $("#stat-views").textContent = faInt(jobs.reduce((s, j) => s + j.views, 0));
    if ($("#result-count")) $("#result-count").textContent = `${faNum(list.length)} آگهی`;

    const feed = $("#feed");
    if (feed) {
      if (!list.length) {
        feed.innerHTML = `<div class="empty">آگهی‌ای با این جستجو پیدا نشد.<br>فیلتر را پاک کنید و دوباره تلاش نمایید.</div>`;
      } else {
        let html = "";
        groupByDate(list).forEach((items, date) => {
          html += `<section class="date-group"><div class="date-label">${date}</div>${items.map(jobCard).join("")}</section>`;
        });
        feed.innerHTML = html;
      }
    }

    const savedJobs = jobs.filter((j) => isSaved(j.id));
    if (!$("#saved-list")) return;
    $("#saved-list").innerHTML = savedJobs.length
      ? savedJobs
          .map(
            (j) => `<div class="saved-item"><b>${j.title}</b><div class="company">${j.company}</div>
            <button class="toggle" data-open="${j.id}">نمایش در فهرست</button></div>`
          )
          .join("")
      : `<div class="empty">هنوز آگهی ذخیره نکرده‌اید.</div>`;

    const q = state.query;
    document.querySelectorAll("[data-search]").forEach((el) => {
      if (el.value !== q) el.value = q;
      el.closest(".search")?.classList.toggle("has-query", !!q);
    });
    if ($("#banner-img")) renderBanner();
    renderFilterChips();
  }

  function renderFilterChips() {
    const el = $("#cat-chips");
    if (!el) return;
    const cats = ["", ...new Set(jobs.map((j) => j.category))];
    el.innerHTML = cats
      .map((c) => `<button class="chip ${state.category === c ? "on" : ""}" data-cat="${c}">${c || "همه"}</button>`)
      .join("");
  }

  function fillSelects() {
    const catEl = $("#filter-cat");
    const typeEl = $("#filter-type");
    if (!catEl || !typeEl) return;
    const cats = [...new Set(jobs.map((j) => j.category))];
    const types = [...new Set(jobs.map((j) => j.type))];
    catEl.innerHTML =
      `<option value="">همه دسته‌ها</option>` + cats.map((c) => `<option>${c}</option>`).join("");
    typeEl.innerHTML =
      `<option value="">همه نوع‌ها</option>` + types.map((c) => `<option>${c}</option>`).join("");
  }

  function setDrawer(open) {
    $("#drawer").classList.toggle("open", open);
    $("#drawer-bg").classList.toggle("show", open || $("#saved-panel").classList.contains("open"));
    document.body.style.overflow = open ? "hidden" : "";
  }
  function setSaved(open) {
    $("#saved-panel").classList.toggle("open", open);
    $("#drawer-bg").classList.toggle("show", open || $("#drawer").classList.contains("open"));
  }

  function bind() {
    document.body.addEventListener("click", (e) => {
      const t = e.target.closest("[data-toggle]");
      if (t) {
        const id = t.dataset.toggle;
        state.openId = state.openId === id ? null : id;
        render();
        return;
      }
      const s = e.target.closest("[data-save]");
      if (s) {
        toggleSave(s.dataset.save);
        return;
      }
      const d = e.target.closest("[data-dot]");
      if (d) {
        state.banner = Number(d.dataset.dot);
        renderBanner();
        return;
      }
      const c = e.target.closest("[data-cat]");
      if (c) {
        state.category = c.dataset.cat;
        render();
        return;
      }
      const o = e.target.closest("[data-open]");
      if (o) {
        if (!$("#feed")) {
          location.href = "index.html?open=" + encodeURIComponent(o.dataset.open);
          return;
        }
        state.openId = o.dataset.open;
        setSaved(false);
        render();
        document.querySelector(`[data-id="${o.dataset.open}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    document.querySelectorAll("[data-search]").forEach((el) => {
      el.addEventListener("input", () => {
        state.query = el.value;
        render();
      });
    });
    document.querySelectorAll("[data-clear]").forEach((el) => {
      el.addEventListener("click", () => {
        state.query = "";
        render();
        toast("جستجو پاک شد");
      });
    });

    $("#btn-filter")?.addEventListener("click", () => setDrawer(true));
    $("#close-drawer")?.addEventListener("click", () => setDrawer(false));
    $("#apply-filter")?.addEventListener("click", () => {
      state.category = $("#filter-cat").value;
      state.type = $("#filter-type").value;
      state.onlyNew = $("#filter-new").checked;
      setDrawer(false);
      render();
    });
    $("#reset-filter")?.addEventListener("click", () => {
      state.category = "";
      state.type = "";
      state.onlyNew = false;
      state.query = "";
      if ($("#filter-new")) $("#filter-new").checked = false;
      if ($("#filter-cat")) $("#filter-cat").value = "";
      if ($("#filter-type")) $("#filter-type").value = "";
      setDrawer(false);
      render();
    });
    $("#btn-saved")?.addEventListener("click", () => setSaved(true));
    $("#close-saved")?.addEventListener("click", () => setSaved(false));
    $("#drawer-bg")?.addEventListener("click", () => {
      setDrawer(false);
      setSaved(false);
    });

    if ($("#banner-img")) {
      setInterval(() => {
        state.banner = (state.banner + 1) % banners.length;
        renderBanner();
      }, 6500);
    }
  }

  function renderBannerSafe() {
    if ($("#banner-img")) renderBanner();
  }

  const params = new URLSearchParams(location.search);
  if (params.get("cat")) state.category = params.get("cat");
  if (params.get("q")) state.query = params.get("q");
  if (params.get("company")) state.query = params.get("company");
  if (params.get("open")) state.openId = params.get("open");

  fillSelects();
  bind();
  if ($("#feed")) render();
  else {
    const n = loadSaved().length;
    if ($("#saved-count")) {
      $("#saved-count").textContent = faNum(n);
      $("#saved-count").style.display = n ? "grid" : "none";
    }
  }
  renderBannerSafe();
})();
