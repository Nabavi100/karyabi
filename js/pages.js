(function () {
  const D = window.KARJOY || {};
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
      const items = (D.discounts || []).filter((x) =>
        (x.shop + x.title + x.cat).includes(q)
      );
      dList.innerHTML = items
        .map(
          (x) => `<article class="list-card">
            <span class="off-badge">${x.off}</span>
            <h3>${x.title}</h3>
            <p class="sub">${x.shop} · ${x.cat} · ${x.until}</p>
            <p>${x.desc}</p>
            <p class="sub">${x.address}</p>
            <div class="actions">
              <a class="btn-call" href="tel:${x.phone}">تماس</a>
              <a class="btn-wa" target="_blank" rel="noopener" href="${wa(x.phone, "سلام، درباره تخفیف «" + x.title + "»")}">واتساپ</a>
            </div>
          </article>`
        )
        .join("");
    };
    render();
    document.getElementById("page-search")?.addEventListener("input", (e) => render(e.target.value.trim()));
  }

  const sList = document.getElementById("spec-list");
  if (sList) {
    let cat = "";
    const chips = document.getElementById("spec-chips");
    const cats = ["", ...new Set((D.specialists || []).map((s) => s.cat))];
    const paintChips = () => {
      chips.innerHTML = cats
        .map((c) => `<button class="chip ${cat === c ? "on" : ""}" data-sc="${c}">${c || "همه"}</button>`)
        .join("");
    };
    const render = (q = "") => {
      const items = (D.specialists || []).filter((s) => {
        if (cat && s.cat !== cat) return false;
        return (s.name + s.job + s.area).includes(q);
      });
      sList.innerHTML = items
        .map(
          (s) => `<article class="list-card">
            <h3>${s.name}</h3>
            <p class="sub">${s.job} · ${s.exp} · ${s.area}</p>
            <div class="actions">
              <a class="btn-call" href="tel:${s.phone}">تماس</a>
              <a class="btn-wa" target="_blank" rel="noopener" href="${wa(s.phone, "سلام استاد/داکتر " + s.name)}">واتساپ</a>
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
      render(document.getElementById("page-search").value.trim());
    });
    document.getElementById("page-search")?.addEventListener("input", (e) => render(e.target.value.trim()));
  }

  const pList = document.getElementById("place-list");
  if (pList) {
    const render = (q = "") => {
      const items = (D.places || []).filter((p) => (p.name + p.type + p.address).includes(q));
      pList.innerHTML = items
        .map(
          (p) => `<article class="list-card">
            <h3>${p.name}</h3>
            <p class="sub">${p.type} · ${p.hours}</p>
            <p>${p.address}</p>
            <div class="actions">
              ${p.phone !== "—" ? `<a class="btn-call" href="tel:${p.phone}">تماس</a>` : ""}
              <a class="btn-ghost" target="_blank" rel="noopener" href="https://maps.google.com/?q=${encodeURIComponent(p.name + " هرات")}">نقشه</a>
            </div>
          </article>`
        )
        .join("");
    };
    render();
    document.getElementById("page-search")?.addEventListener("input", (e) => render(e.target.value.trim()));
  }

  const keys = document.getElementById("calc-keys");
  if (keys) {
    const out = document.getElementById("calc-out");
    let expr = "";
    const fa = (s) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
    const en = (s) => s.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
    "۷۸۹÷۴۵۶×۱۲۳-۰.C=".split("").forEach((k) => {
      const b = document.createElement("button");
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
    const v = Number(afn.value) / Number(rate.value || 1);
    fxOut.textContent = `حدود ${v.toFixed(2)} دالر`;
  }
  afn?.addEventListener("input", fx);
  rate?.addEventListener("input", fx);
  fx();

  document.getElementById("post-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    toast("آگهی ثبت شد و پس از بررسی منتشر می‌شود.");
    e.target.reset();
  });
})();
