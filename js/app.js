(function () {
  const { jobs } = window.KARJOY;
  const SAVED_KEY = "karjoy-herat-saved";
  const state = { query: "", category: "", type: "", onlyNew: false, openId: null };
  const $ = (s) => document.querySelector(s);

  const faNum = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  const faInt = (n) => faNum(Number(n).toLocaleString("en-US")).replace(/,/g, "٬");

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
  }
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 1800);
  }

  function filtered() {
    const q = state.query.trim();
    return jobs.filter((j) => {
      if (state.category && j.category !== state.category) return false;
      if (state.type && j.type !== state.type) return false;
      if (state.onlyNew && !j.isNew) return false;
      if (q && ![j.title, j.company, j.category, ...(j.skills || [])].join(" ").includes(q)) return false;
      return true;
    });
  }

  function jobCard(j) {
    const open = state.openId === j.id;
    return `<article class="card ${open ? "open" : ""}" data-id="${j.id}">
      <div class="job-head">
        <div>
          <h3>${j.title}</h3>
          <div class="co"><span class="check">✓</span>${j.company}</div>
        </div>
        <span class="date">${j.date}</span>
      </div>
      <div class="card-tools">
        <button type="button" class="mini" data-share="${j.id}" aria-label="اشتراک">⤴</button>
        <span class="views">👁 ${faInt(j.views)}</span>
        <button type="button" class="mini" data-toggle="${j.id}" aria-label="جزئیات">⌄</button>
      </div>
      <div class="details">
        <h4>شرح وظایف</h4><ul>${j.duties.map((x) => `<li>${x}</li>`).join("")}</ul>
        <h4>شرایط</h4><ul>${j.requirements.map((x) => `<li>${x}</li>`).join("")}</ul>
        <div>${j.skills.map((s) => `<span class="skill">${s}</span>`).join("")}</div>
        <p>${j.address}</p>
        <div class="actions">
          <button type="button" class="btn-ghost" data-save="${j.id}">ذخیره آگهی</button>
          <a class="btn-call" href="tel:${j.phone}">تماس</a>
          <a class="btn-tg" target="_blank" rel="noopener" href="https://t.me/${j.telegram}">تلگرام</a>
          <a class="btn-wa" target="_blank" rel="noopener" href="https://wa.me/93${j.phone.replace(/^0/, "")}">واتساپ</a>
        </div>
      </div>
    </article>`;
  }

  function render() {
    const list = filtered();
    $("#feed").innerHTML = list.map(jobCard).join("") || `<div class="card">آگهی پیدا نشد.</div>`;
    const saved = jobs.filter((j) => loadSaved().includes(j.id));
    $("#saved-list").innerHTML = saved.length
      ? saved.map((j) => `<div class="card"><b>${j.title}</b><div class="muted">${j.company}</div></div>`).join("")
      : `<div class="muted">آگهی ذخیره‌شده ندارید. اعلان جدیدی هم نیست.</div>`;
  }

  function setDrawer(open) {
    $("#drawer").classList.toggle("open", open);
    $("#drawer-bg").classList.toggle("show", open || $("#saved-panel").classList.contains("open"));
  }
  function setSheet(open) {
    $("#saved-panel").classList.toggle("open", open);
    $("#drawer-bg").classList.toggle("show", open || $("#drawer").classList.contains("open"));
  }

  $("#filter-cat").innerHTML = `<option value="">همه</option>` + [...new Set(jobs.map((j) => j.category))].map((c) => `<option>${c}</option>`).join("");
  $("#filter-type").innerHTML = `<option value="">همه</option>` + [...new Set(jobs.map((j) => j.type))].map((c) => `<option>${c}</option>`).join("");

  document.body.addEventListener("click", (e) => {
    const t = e.target.closest("[data-toggle]");
    if (t) { state.openId = state.openId === t.dataset.toggle ? null : t.dataset.toggle; render(); return; }
    const s = e.target.closest("[data-save]");
    if (s) {
      const ids = loadSaved();
      const i = ids.indexOf(s.dataset.save);
      if (i >= 0) ids.splice(i, 1); else ids.unshift(s.dataset.save);
      localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
      toast(i >= 0 ? "حذف شد" : "ذخیره شد");
      render();
      return;
    }
    const sh = e.target.closest("[data-share]");
    if (sh) {
      const j = jobs.find((x) => x.id === sh.dataset.share);
      const text = j ? j.title + " — کارجوی هرات" : "کارجوی هرات";
      if (navigator.share) navigator.share({ title: text, text });
      else { navigator.clipboard?.writeText(text); toast("کپی شد"); }
    }
  });

  document.querySelector("[data-search]").addEventListener("input", (e) => { state.query = e.target.value; render(); });
  $("#btn-search").addEventListener("click", () => render());
  $("#btn-filter").addEventListener("click", () => setDrawer(true));
  $("#apply-filter").addEventListener("click", () => {
    state.category = $("#filter-cat").value;
    state.type = $("#filter-type").value;
    state.onlyNew = $("#filter-new").checked;
    setDrawer(false);
    render();
  });
  $("#reset-filter").addEventListener("click", () => {
    state.category = state.type = state.query = "";
    state.onlyNew = false;
    $("#filter-cat").value = $("#filter-type").value = "";
    $("#filter-new").checked = false;
    document.querySelector("[data-search]").value = "";
    setDrawer(false);
    render();
  });
  $("#btn-bell").addEventListener("click", () => setSheet(true));
  $("#btn-more").addEventListener("click", () => { toast("کارجوی هرات — کاریابی ولایت هرات"); });
  $("#drawer-bg").addEventListener("click", () => { setDrawer(false); setSheet(false); });

  render();
})();
