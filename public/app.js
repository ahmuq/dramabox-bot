/* ===== Telegram WebApp init ===== */
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
if (tg.setHeaderColor) tg.setHeaderColor("#0d0f14");
if (tg.setBackgroundColor) tg.setBackgroundColor("#0d0f14");

/* ===== State ===== */
const state = {
  source: "dramabox",
  mode: "browse",
  keyword: "",
  page: 1,
  loading: false,
  totalPages: 1,
  items: [],
  detail: null,
  pendingEpisode: null,
};

const $ = (id) => document.getElementById(id);
const grid = $("grid");
const sentinel = $("sentinel");
const searchInput = $("search-input");

/* ===== API helper ===== */
async function api(path) {
  const res = await fetch(path, {
    headers: { "X-Telegram-Init-Data": tg.initData || "" },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
  return res.json();
}

/* ===== Source segmented control ===== */
const seg = $("source-seg");
const segBtns = [...seg.querySelectorAll(".seg-btn")];
const indicator = seg.querySelector(".seg-indicator");

function moveIndicator() {
  const active = seg.querySelector(".seg-btn.active");
  indicator.style.left = active.offsetLeft + "px";
  indicator.style.width = active.offsetWidth + "px";
}

segBtns.forEach((btn) =>
  btn.addEventListener("click", () => {
    if (state.source === btn.dataset.source) return;
    segBtns.forEach((b) => b.classList.toggle("active", b === btn));
    moveIndicator();
    state.source = btn.dataset.source;
    resetList();
    loadList();
  }),
);
window.addEventListener("resize", moveIndicator);

/* ===== Chips ===== */
document.querySelectorAll(".chip").forEach((chip) =>
  chip.addEventListener("click", () => {
    if (state.mode === chip.dataset.mode) return;
    state.mode = chip.dataset.mode;
    document
      .querySelectorAll(".chip")
      .forEach((c) => c.classList.toggle("active", c === chip));
    resetList();
    loadList();
  }),
);

/* ===== Search ===== */
let searchTimer;
searchInput.addEventListener("input", () => {
  $("search-clear").hidden = !searchInput.value;
  clearTimeout(searchTimer);
  const q = searchInput.value.trim();
  searchTimer = setTimeout(() => {
    if (!q) {
      switchMode("browse");
      return;
    }
    state.keyword = q;
    switchMode("search");
  }, 450);
});
$("search-clear").addEventListener("click", () => {
  searchInput.value = "";
  $("search-clear").hidden = true;
  switchMode("browse");
});

function switchMode(mode) {
  state.mode = mode;
  document
    .querySelectorAll(".chip")
    .forEach((c) => c.classList.toggle("active", c.dataset.mode === mode));
  resetList();
  loadList();
}

/* ===== List loading ===== */
function resetList() {
  state.page = 1;
  state.items = [];
  state.loading = false;
  state.exhausted = false;
  grid.innerHTML = "";
  $("empty").hidden = true;
}

function showSkeletons(n = 6) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement("div");
    s.className = "skel";
    s.innerHTML = '<div class="s-cover"></div><div class="s-line"></div>';
    grid.appendChild(s);
  }
}

async function loadList() {
  if (state.loading) return;
  state.loading = true;
  if (state.page === 1) {
    grid.innerHTML = "";
    showSkeletons();
  }
  try {
    const q =
      state.mode === "search"
        ? `/api/${state.source}/search?keyword=${encodeURIComponent(state.keyword)}&page=${state.page}`
        : `/api/${state.source}/browse?page=${state.page}`;
    const { results } = await api(q);
    grid.querySelectorAll(".skel").forEach((s) => s.remove());
    if (state.page === 1 && !results.length) $("empty").hidden = false;
    const seen = new Set(state.items.map((b) => b.id));
    let added = 0;
    results.forEach((book) => {
      if (seen.has(book.id)) return; // hindari duplikat saat API mengulang data
      seen.add(book.id);
      state.items.push(book);
      grid.appendChild(renderCard(book));
      added++;
    });
    // berhenti memuat kalau halaman berikut tidak lagi membawa item baru
    if (added === 0 && !state.exhausted) {
      state.exhausted = true;
      const end = document.createElement("div");
      end.className = "empty" ;
      end.style.padding = "18px 0 6px";
      end.innerHTML =
        '<div class="empty-sub" style="font-size:12px">✨ Semua drama sudah ditampilkan</div>';
      grid.appendChild(end);
    }
  } catch (err) {
    grid.querySelectorAll(".skel").forEach((s) => s.remove());
    if (state.page === 1) {
      $("empty").hidden = false;
      $("empty").querySelector(".empty-title").textContent = "Gagal memuat";
      $("empty").querySelector(".empty-sub").textContent = "Tarik ke bawah atau coba lagi";
    }
  } finally {
    state.loading = false;
  }
}

function renderCard(book) {
  const card = document.createElement("div");
  card.className = "card";

  const cover = document.createElement("div");
  cover.className = "card-cover";
  if (book.cover) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = book.title;
    img.src = book.cover;
    img.addEventListener("load", () => img.classList.add("loaded"));
    img.addEventListener("error", () => img.remove());
    cover.appendChild(img);
  }
  if (book.totalEpisodes) {
    const badge = document.createElement("span");
    badge.className = "card-badge";
    badge.textContent = `${book.totalEpisodes} eps`;
    cover.appendChild(badge);
  }

  const body = document.createElement("div");
  body.className = "card-body";
  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = book.title;
  body.appendChild(title);
  if (book.tags?.length) {
    const sub = document.createElement("div");
    sub.className = "card-sub";
    sub.textContent = book.tags.slice(0, 2).join(" · ");
    body.appendChild(sub);
  }

  card.append(cover, body);
  card.addEventListener("click", () => openDetail(book));
  return card;
}

/* infinite scroll */
new IntersectionObserver((entries) => {
  if (
    entries[0].isIntersecting &&
    !state.exhausted &&
    state.items.length > 0
  ) {
    state.page++;
    loadList();
  }
}).observe(sentinel);

/* ===== Detail page ===== */
async function openDetail(book) {
  $("page-home").hidden = true;
  $("page-detail").hidden = false;
  window.scrollTo(0, 0);

  $("detail-topbar-title").textContent = book.title;
  $("detail-title").textContent = book.title;
  $("detail-meta").innerHTML = "";
  $("detail-desc").textContent = book.description || "";
  $("episode-grid").innerHTML =
    '<div class="skel" style="aspect-ratio:1;border:0"></div>'.repeat(8);
  $("ep-count").textContent = "";

  const cover = $("detail-cover");
  const fallback = $("hero-fallback");
  fallback.classList.remove("show");
  cover.style.display = book.cover ? "" : "none";
  if (book.cover) {
    cover.src = book.cover;
    cover.onerror = () => {
      cover.style.display = "none";
      fallback.classList.add("show");
    };
  } else fallback.classList.add("show");

  try {
    const { detail } = await api(
      `/api/${state.source}/detail?bookId=${encodeURIComponent(book.id)}`,
    );
    state.detail = {
      ...detail,
      title: book.title || detail.title,
      cover: book.cover || detail.cover,
      description: detail.description || book.description,
      source: state.source,
    };
    if (detail.description) $("detail-desc").textContent = detail.description;
    $("ep-count").textContent = `${detail.chapters.length} episode`;

    const meta = $("detail-meta");
    meta.innerHTML = "";
    if (detail.totalEpisodes) {
      const t = document.createElement("span");
      t.className = "tag";
      t.textContent = `📺 ${detail.totalEpisodes} eps`;
      meta.appendChild(t);
    }
    (book.tags || []).slice(0, 3).forEach((tag) => {
      const t = document.createElement("span");
      t.className = "tag";
      t.textContent = tag;
      meta.appendChild(t);
    });

    renderEpisodes(detail.chapters);
  } catch (err) {
    $("episode-grid").innerHTML = "";
    showToast("Gagal memuat detail drama 😢");
  }
}

function renderEpisodes(chapters) {
  const wrap = $("episode-grid");
  wrap.innerHTML = "";
  chapters.forEach((ch) => {
    const btn = document.createElement("button");
    btn.className = "ep-btn";
    btn.innerHTML = `${ch.index}<span class="play-mini">▶</span>`;
    btn.addEventListener("click", () => {
      state.pendingEpisode = ch;
      openQualitySheet(ch);
    });
    wrap.appendChild(btn);
  });
}

$("back-btn").addEventListener("click", () => {
  $("page-detail").hidden = true;
  $("page-home").hidden = false;
});

/* ===== Quality sheet ===== */
function openQualitySheet(ch) {
  $("sheet-ep").textContent = `${state.detail.title} — ${ch.title || "Episode " + ch.index}`;
  const wrap = $("sheet-qualities");
  wrap.innerHTML = "";

  const qualities =
    state.source === "dramabox" ? [1080, 720, 540, 360] : [720, 540];
  qualities.forEach((q) => {
    const btn = document.createElement("button");
    btn.className = "quality-btn";
    btn.innerHTML = `<span>▶️ Putar Episode ${ch.index}</span><span class="q-label">${q}p</span>`;
    btn.addEventListener("click", () => {
      closeSheet();
      sendToBot(ch, q);
    });
    wrap.appendChild(btn);
  });

  $("sheet-backdrop").hidden = false;
  $("sheet").hidden = false;
}

function closeSheet() {
  $("sheet-backdrop").hidden = true;
  $("sheet").hidden = true;
}
$("sheet-backdrop").addEventListener("click", closeSheet);

/* ===== Send to bot ===== */
function sendToBot(ch, quality) {
  const payload = {
    source: state.detail.source,
    bookId: state.detail.id,
    episode: ch.index,
    quality,
    title: state.detail.title,
  };
  try {
    tg.sendData(JSON.stringify(payload));
    tg.close();
  } catch {
    showToast("Gagal mengirim ke bot 😢");
  }
}

/* ===== Toast ===== */
let toastTimer;
function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2500);
}

/* ===== Boot ===== */
requestAnimationFrame(moveIndicator);
loadList();
