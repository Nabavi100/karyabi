(function () {
  const page = document.body.dataset.page || "home";
  const listing = page === "home";

  const tabs = [
    {
      href: "index.html",
      id: "home",
      label: "خانه",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/></svg>',
    },
    {
      href: "takhfif.html",
      id: "takhfif",
      label: "تخفیف",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8h8l10-10-8-8L4 12z"/><circle cx="8.5" cy="15.5" r="1.3"/></svg>',
    },
    {
      href: "specialists.html",
      id: "specialists",
      label: "متخصصین",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.4"/><path d="M3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5"/><path d="M14 14.2c2 .2 3.8 1.6 4.5 4.3"/></svg>',
    },
    {
      href: "address.html",
      id: "address",
      label: "آدرس‌ها",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.3"/></svg>',
    },
    {
      href: "tools.html",
      id: "tools",
      label: "ابزارها",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    },
  ];

  const titles = {
    home: "کارجوی هرات",
    takhfif: "تخفیف‌ها",
    specialists: "متخصصین",
    address: "آدرس‌ها",
    tools: "ابزارها",
  };

  document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <header class="app-header">
      <a class="brand" href="index.html">
        <img src="assets/logo.png" alt="" />
        <span class="brand-text">
          <strong>${titles[page] || "کارجوی هرات"}</strong>
          <span>کاریابی ولایت هرات</span>
        </span>
      </a>
      <div class="header-actions">
        ${
          listing
            ? `<button class="icon-btn" id="btn-saved" type="button" aria-label="ذخیره‌ها">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 4h10a1 1 0 0 1 1 1v16l-6-3.5L6 21V5a1 1 0 0 1 1-1z"/></svg>
                <span class="badge" id="saved-count">۰</span>
              </button>
              <button class="filter-btn" id="btn-filter" type="button">فیلتر</button>`
            : `<button class="icon-btn" id="btn-saved" type="button" aria-label="ذخیره‌ها">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 4h10a1 1 0 0 1 1 1v16l-6-3.5L6 21V5a1 1 0 0 1 1-1z"/></svg>
                <span class="badge" id="saved-count">۰</span>
              </button>`
        }
      </div>
    </header>
    `
  );

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <nav class="bottom-nav" aria-label="منوی اصلی">
      ${tabs
        .map(
          (t) =>
            `<a href="${t.href}" class="${page === t.id ? "active" : ""}">${t.icon}<span>${t.label}</span></a>`
        )
        .join("")}
    </nav>

    <div class="drawer-bg" id="drawer-bg"></div>
    <aside class="drawer" id="drawer" aria-label="فیلتر">
      <header>
        <strong>فیلتر آگهی‌ها</strong>
        <button class="close-x" id="close-drawer" type="button" aria-label="بستن">×</button>
      </header>
      <div class="body">
        <div class="field">
          <label for="filter-cat">دسته‌بندی</label>
          <select id="filter-cat"></select>
        </div>
        <div class="field">
          <label for="filter-type">نوع قرارداد</label>
          <select id="filter-type"></select>
        </div>
        <div class="field">
          <label><input id="filter-new" type="checkbox" /> فقط آگهی‌های جدید</label>
        </div>
        <div class="drawer-actions">
          <button class="reset" id="reset-filter" type="button">پاک کردن</button>
          <button class="apply" id="apply-filter" type="button">اعمال فیلتر</button>
        </div>
      </div>
    </aside>

    <aside class="saved-panel" id="saved-panel" aria-label="آگهی‌های ذخیره">
      <header>
        <strong>آگهی‌های ذخیره‌شده</strong>
        <button class="close-x" id="close-saved" type="button" aria-label="بستن">×</button>
      </header>
      <div class="saved-list" id="saved-list"></div>
    </aside>
    <div class="toast" id="toast" role="status"></div>
    `
  );

  window.KarjoyLayout = { page, listing };
})();
