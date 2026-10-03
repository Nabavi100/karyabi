(function () {
  const D = window.KARJOY;
  const faInt = (n) => Number(n).toLocaleString("en-US").replace(/,/g, "٬").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  const toast = (msg) => {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1800);
  };

  function showTab(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("on", s.id === "screen-" + id));
    document.querySelectorAll(".tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.tab === id));
    window.scrollTo(0, 0);
  }
  document.querySelectorAll(".tabbar button").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      showTab(b.dataset.tab);
    });
  });

  function tools(views, extra = "") {
    return `<div class="card-tools">${extra}<button type="button" class="mini">⤴</button><span class="views">👁 ${faInt(views)}</span><button type="button" class="mini chev">⌄</button></div>`;
  }

  const dList = document.getElementById("discount-list");
  dList.innerHTML = D.discounts.map((x) => `
    <article class="card disc-card">
      <div class="disc-photo">
        <img src="${x.image}" alt="${x.title}" />
        <span class="off">${x.off} تخفیف</span>
        <span class="when">${x.when}</span>
      </div>
      <div class="disc-body">
        <h3 style="margin:0 0 8px;font-size:14.5px">${x.title}</h3>
        ${tools(x.views)}
        <div class="actions">
          <a class="btn-call" href="tel:${x.phone}">تماس</a>
          <a class="btn-wa" href="https://wa.me/93${x.phone.replace(/^0/, "")}">واتساپ</a>
        </div>
      </div>
    </article>`).join("");

  function renderSpecs(q = "") {
    const items = D.specialists.filter((s) => (s.name + s.job).includes(q));
    document.getElementById("spec-count").textContent = `${items.length.toString().replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d])} متخصص یافت شد`;
    document.getElementById("spec-list").innerHTML = items.map((s) => `
      <article class="card spec">
        <div class="spec-top">
          <div>
            <h3 style="margin:0;font-size:15px">${s.name}</h3>
            <div class="muted">${s.job}</div>
          </div>
          <div class="stars">★★★★★ <span class="muted">${s.rating}</span></div>
        </div>
        ${tools(s.views, `<button type="button" class="mini">♡</button>`)}
        <div class="spec-grid">
          <div><span>تجربه</span><b>${s.exp}</b></div>
          <div><span>معاش درخواستی</span><b>${s.salary}</b></div>
          <div><span>شهر</span><b>${s.city}</b></div>
        </div>
        <button type="button" class="more-btn" data-sid="${s.id}">جزئیات</button>
        <div class="details" id="sd-${s.id}">
          <p>${s.about}</p>
          <div class="actions">
            <a class="btn-call" href="tel:${s.phone}">تماس</a>
            <a class="btn-wa" href="https://wa.me/93${s.phone.replace(/^0/, "")}">واتساپ</a>
          </div>
        </div>
      </article>`).join("");
  }
  renderSpecs();
  document.getElementById("search-spec").addEventListener("input", (e) => renderSpecs(e.target.value.trim()));
  document.getElementById("spec-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-sid]");
    if (!b) return;
    const card = b.closest(".card");
    card.classList.toggle("open");
  });

  function renderPlaces(q = "") {
    const items = D.places.filter((p) => (p.name + p.cat + p.address).includes(q));
    const groups = {};
    items.forEach((p) => { (groups[p.cat] ||= []).push(p); });
    document.getElementById("place-list").innerHTML = Object.keys(groups).map((cat) => {
      const list = groups[cat];
      return `<div class="cat-box">
        <div class="group-h"><span>${cat === "شفاخانه‌ها" ? "＋ " : "▣ "}${cat} (${String(list.length).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d])})</span></div>
        ${list.map((p) => `
          <article class="card">
            <div class="place">
              <button type="button" class="plus ${p.icon === "bank" ? "bank" : ""}">＋</button>
              <div style="flex:1">
                <b>${p.name}</b>
                <div class="pin">📍 ${p.address}</div>
              </div>
              <div class="card-tools" style="margin:0">
                <button type="button" class="mini">⤴</button>
                <button type="button" class="mini">⌄</button>
              </div>
            </div>
            <div class="details">
              <a class="btn-call" href="tel:${p.phone}">تماس ${p.phone}</a>
            </div>
          </article>`).join("")}
      </div>`;
    }).join("");
  }
  renderPlaces();
  document.getElementById("search-place").addEventListener("input", (e) => renderPlaces(e.target.value.trim()));
  document.getElementById("place-list").addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card && (e.target.closest(".plus") || e.target.closest(".mini"))) card.classList.toggle("open");
  });

  document.getElementById("rates").innerHTML = D.rates.map((r) =>
    `<div class="rate"><b>${r.name}</b><span>خرید ${r.buy} · فروش ${r.sell}</span></div>`
  ).join("");

  document.querySelectorAll(".acc-h").forEach((btn) => {
    btn.addEventListener("click", () => btn.parentElement.classList.toggle("open"));
  });

  function tick() {
    const now = new Date();
    const h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    const ap = h >= 12 ? "ب.ظ" : "ق.ظ";
    const hh = ((h + 11) % 12) + 1;
    const fa = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
    document.getElementById("clock").textContent = fa(`${hh}:${m}:${s} ${ap}`);
  }
  tick();
  setInterval(tick, 1000);

  document.getElementById("y-in")?.addEventListener("input", (e) => {
    const y = Number(e.target.value);
    document.getElementById("y-out").textContent = Number.isFinite(y) ? `${String(y - 621).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d])} هجری شمسی (تقریبی)` : "";
  });

  document.getElementById("cv-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    toast("رزومه ذخیره شد");
    e.target.reset();
  });
})();
