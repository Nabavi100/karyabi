(function () {
  const page = document.body.dataset.page || "home";
  const listing = page === "home" || page === "jobs";

  const links = [
    { href: "index.html", id: "home", label: "خانه" },
    { href: "agahi.html", id: "jobs", label: "آگهی‌ها" },
    { href: "categories.html", id: "categories", label: "دسته‌بندی‌ها" },
    { href: "companies.html", id: "companies", label: "شرکت‌ها" },
    { href: "post.html", id: "post", label: "ثبت آگهی" },
    { href: "cv.html", id: "cv", label: "رزومه" },
    { href: "about.html", id: "about", label: "درباره ما" },
    { href: "contact.html", id: "contact", label: "تماس با ما" },
  ];

  const navHtml = links
    .map(
      (l) =>
        `<a href="${l.href}" class="${page === l.id ? "active" : ""}">${l.label}</a>`
    )
    .join("");

  const search = listing
    ? `<div class="search">
        <span class="ico-search" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3-3" />
          </svg>
        </span>
        <input data-search type="search" placeholder="جستجوی شغل، شرکت یا مهارت…" aria-label="جستجو" />
        <button class="ico-clear" data-clear type="button" title="پاک کردن جستجو">✕</button>
      </div>`
    : `<div class="search-spacer"></div>`;

  document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <header class="app-header">
      <button class="hamburger" id="btn-menu" type="button" aria-label="منو">
        <span></span><span></span><span></span>
      </button>
      <a class="brand" href="index.html">
        <img src="assets/logo.png" alt="لوگوی کارجوی هرات" />
        <span class="brand-text">
          <strong>کارجوی هرات</strong>
          <span>کاریابی ولایت هرات</span>
        </span>
      </a>
      ${search}
      <div class="header-actions">
        <a class="icon-btn ghost-link" href="login.html">ورود</a>
        <button class="icon-btn" id="btn-saved" type="button">
          ذخیره‌ها
          <span class="badge" id="saved-count">۰</span>
        </button>
        ${listing ? `<button class="filter-btn" id="btn-filter" type="button">فیلتر</button>` : `<a class="filter-btn" href="post.html">ثبت آگهی</a>`}
      </div>
    </header>
    <nav class="subnav">${navHtml}</nav>
    `
  );

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <footer class="site-footer">
      <div class="footer-grid">
        <div>
          <h3>کارجوی هرات</h3>
          <p>پلتفرم کاریابی ولایت هرات برای اتصال کارجو و کارفرما. آگهی ببینید، رزومه بسازید و مستقیم تماس بگیرید.</p>
        </div>
        <div>
          <h3>منوها</h3>
          <ul>
            ${links.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join("")}
          </ul>
        </div>
        <div>
          <h3>تماس با ما</h3>
          <ul>
            <li>تلگرام: @karjoy_herat</li>
            <li>واتساپ: ۰۷۹۰۰۰۰۰۰</li>
            <li>هرات، افغانستان</li>
          </ul>
        </div>
      </div>
      <div class="copy">۱۴۰۵ — کارجوی هرات. همه حقوق محفوظ است.</div>
    </footer>

    <nav class="bottom-nav">
      <a href="index.html" class="${page === "home" ? "active" : ""}">خانه</a>
      <a href="agahi.html" class="${page === "jobs" ? "active" : ""}">آگهی‌ها</a>
      <a href="post.html" class="${page === "post" ? "active" : ""}">ثبت آگهی</a>
      <a href="cv.html" class="${page === "cv" ? "active" : ""}">رزومه</a>
      <a href="login.html" class="${page === "login" || page === "register" ? "active" : ""}">حساب</a>
    </nav>

    <div class="drawer-bg" id="drawer-bg"></div>
    <aside class="menu-drawer" id="menu-drawer" aria-label="منوی سایت">
      <header>
        <strong>منوی کارجوی هرات</strong>
        <button class="close-x" id="close-menu" type="button" aria-label="بستن">×</button>
      </header>
      <div class="body menu-links">
        ${links.map((l) => `<a href="${l.href}" class="${page === l.id ? "active" : ""}">${l.label}</a>`).join("")}
        <a href="login.html">ورود</a>
        <a href="register.html">ثبت‌نام</a>
      </div>
    </aside>

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

  const bg = document.getElementById("drawer-bg");
  const menu = document.getElementById("menu-drawer");
  function closeAll() {
    menu.classList.remove("open");
    document.getElementById("drawer")?.classList.remove("open");
    document.getElementById("saved-panel")?.classList.remove("open");
    bg.classList.remove("show");
    document.body.style.overflow = "";
  }
  document.getElementById("btn-menu").addEventListener("click", () => {
    menu.classList.add("open");
    bg.classList.add("show");
  });
  document.getElementById("close-menu").addEventListener("click", closeAll);
  bg.addEventListener("click", closeAll);

  window.KarjoyLayout = {
    closeAll,
    page,
    listing,
  };
})();
