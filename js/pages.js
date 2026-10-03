(function () {
  const D = window.KARJOY || {};
  const titles = {
    home: "کارجوی هرات",
    takhfif: "تخفیف",
    specialists: "متخصصین",
    address: "آدرس‌ها",
    tools: "ابزارها",
  };

  function showTab(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("on", s.id === "screen-" + id));
    document.querySelectorAll(".tabbar .tab").forEach((t) => t.classList.toggle("on", t.dataset.tab === id));
    const title = document.getElementById("header-title");
    if (title) title.textContent = titles[id] || "کارجوی هرات";
    const filter = document.getElementById("btn-filter");
    if (filter) filter.style.display = id === "home" ? "" : "none";
    window.scrollTo(0, 0);
  }

  document.querySelectorAll(".tabbar .tab").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showTab(btn.dataset.tab);
    });
  });

  const toast = (msg) => {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  };

  function wa(phone, text) {
    const n = "93" + String(phone).replace(/^0/, "").replace(/\s/g, "");
    return `https://wa.me/${n}?text=${encodeURIComponent(text || "")}`;
  }

  const dList = document.getElementById("discount-list");
  if (dList) {
    const render = (q = "") => {
      dList.innerHTML = (D.discounts || [])
        .filter((x) => (x.shop + x.title + x.cat).includes(q))
        .map(
          (x) => `<article class="list-card">
            <span class="off-badge">${x.off}</span>
            <h3>${x.title}</h3>
            <p class="sub">${x.shop} · ${x.until}</p>
            <p>${x.desc}</p>
            <div class="actions">
              <a class="btn-call" href="tel:${x.phone}">تماس</a>
              <a class="btn-wa" target="_blank" rel="noopener" href="${wa(x.phone, x.title)}">واتساپ</a>
            </div>
          </article>`
        )
        .join("");
    };
    render();
    document.getElementById("search-takhfif")?.addEventListener("input", (e) => render(e.target.value.trim()));
  }

  const sList = document.getElementById("spec-list");
  if (sList) {
    let cat = "";
    const chips = document.getElementById("spec-chips");
    const cats = ["", ...new Set((D.specialists || []).map((s) => s.cat))];
    const paintChips = () => {
      chips.innerHTML = cats
        .map((c) => `<button type="button" class="chip ${cat === c ? "on" : ""}" data-sc="${c}">${c || "همه"}</button>`)
        .join("");
    };
    const render = (q = "") => {
      sList.innerHTML = (D.specialists || [])
        .filter((s) => (!cat || s.cat === cat) && (s.name + s.job + s.area).includes(q))
        .map(
          (s) => `<article class="list-card">
            <h3>${s.name}</h3>
            <p class="sub">${s.job} · ${s.exp} · ${s.area}</p>
            <div class="actions">
              <a class="btn-call" href="tel:${s.phone}">تماس</a>
              <a class="btn-wa" target="_blank" rel="noopener" href="${wa(s.phone, s.name)}">واتساپ</a>
            </div>
          </article>`
        )
        .join("");
    };
    paintChips();
    render();
    chips.addEventListener("click", (e) => {
      const b = e.target.closest("[data-sc]");
      if (!b) return;
      cat = b.dataset.sc;
      paintChips();
      render(document.getElementById("search-spec").value.trim());
    });
    document.getElementById("search-spec")?.addEventListener("input", (e) => render(e.target.value.trim()));
  }

  const pList = document.getElementById("place-list");
  if (pList) {
    const render = (q = "") => {
      pList.innerHTML = (D.places || [])
        .filter((p) => (p.name + p.type + p.address).includes(q))
        .map(
          (p) => `<article class="list-card">
            <h3>${p.name}</h3>
            <p class="sub">${p.type} · ${p.hours}</p>
            <p>${p.address}</p>
            <div class="actions">
              ${p.phone !== "—" ? `<a class="btn-call" href="tel:${p.phone}">تماس</a>` : ""}
            </div>
          </article>`
        )
        .join("");
    };
    render();
    document.getElementById("search-place")?.addEventListener("input", (e) => render(e.target.value.trim()));
  }

  const keys = document.getElementById("calc-keys");
  if (keys && !keys.dataset.ready) {
    keys.dataset.ready = "1";
    const out = document.getElementById("calc-out");
    let expr = "";
    const fa = (s) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
    const en = (s) => String(s).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
    ["۷", "۸", "۹", "÷", "۴", "۵", "۶", "×", "۱", "۲", "۳", "-", "۰", ".", "C", "="].forEach((k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = k;
      if (k === "=") b.className = "eq";
      b.addEventListener("click", () => {
        if (k === "C") expr = "";
        else if (k === "=") {
          try {
            expr = String(Function(`"use strict"; return (${expr.replace(/÷/g, "/").replace(/×/g, "*")})`)());
          } catch {
            expr = "";
          }
        } else expr += en(k);
        out.value = fa(expr || "۰");
      });
      keys.appendChild(b);
    });
  }

  const afn = document.getElementById("afn");
  const rate = document.getElementById("rate");
  const fxOut = document.getElementById("fx-out");
  function fx() {
    if (!afn || !rate || !fxOut) return;
    fxOut.textContent = `حدود ${(Number(afn.value) / Number(rate.value || 1)).toFixed(2)} دالر`;
  }
  afn?.addEventListener("input", fx);
  rate?.addEventListener("input", fx);

  document.querySelectorAll("[data-tool]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tool-panel").forEach((p) => p.classList.remove("on"));
      document.getElementById("tool-" + btn.dataset.tool)?.classList.add("on");
    });
  });

  document.getElementById("post-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    toast("آگهی ثبت شد.");
    e.target.reset();
  });

  showTab("home");
})();
