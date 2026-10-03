(function () {
  const jobs = (window.KARJOY && window.KARJOY.jobs) || [];
  const toast = (msg) => {
    const el = document.getElementById("toast");
    if (!el) return alert(msg);
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  };

  const catGrid = document.getElementById("category-grid");
  if (catGrid) {
    const map = {};
    jobs.forEach((j) => {
      map[j.category] = (map[j.category] || 0) + 1;
    });
    catGrid.innerHTML = Object.keys(map)
      .map(
        (c) =>
          `<a class="cat-card" href="agahi.html?cat=${encodeURIComponent(c)}"><b>${c}</b><span class="count-pill">${map[c]} آگهی</span></a>`
      )
      .join("");
  }

  const coGrid = document.getElementById("company-grid");
  if (coGrid) {
    const map = {};
    jobs.forEach((j) => {
      if (!map[j.company]) map[j.company] = { count: 0, about: j.about, address: j.address };
      map[j.company].count += 1;
    });
    coGrid.innerHTML = Object.keys(map)
      .map((name) => {
        const c = map[name];
        return `<a class="co-card" href="agahi.html?company=${encodeURIComponent(name)}"><b>${name}</b><p>${c.about}</p><span class="count-pill">${c.count} آگهی فعال</span></a>`;
      })
      .join("");
  }

  function hook(id, msg) {
    const form = document.getElementById(id);
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      toast(msg);
      form.reset();
    });
  }
  hook("post-form", "آگهی شما ثبت شد و پس از بررسی منتشر می‌شود.");
  hook("cv-form", "رزومه ذخیره شد.");
  hook("contact-form", "پیام شما ارسال شد.");
  hook("login-form", "ورود با موفقیت انجام شد.");
  hook("register-form", "حساب شما ساخته شد.");
})();
