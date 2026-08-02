// MT Servis - ana uygulama
(() => {
  const app = document.getElementById("app");
  const tabs = document.querySelectorAll(".tab");
  let current = null; // düzenlenen job
  let listFilter = "kabul"; // liste sekmesi: "kabul" (serviste) | "teslim"

  // ---------- yardımcılar ----------
  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = (s) =>
    (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtDate = (t) =>
    t ? new Date(t).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

  const STATUS = {
    kabul: { label: "Serviste", cls: "st-open" },
    teslim: { label: "Teslim edildi", cls: "st-done" },
  };

  // Atölye bilgileri (çıktı ve giriş ekranında kullanılır)
  const SHOP = {
    name: "MT Servis",
    address: "Kazımdirik, 409. Sk. No:10, 35100 Bornova/İzmir",
    phone: "0532 630 44 56",
  };

  // Kaydet (cihaz + bulut) ve sil (cihaz + bulut) yardımcıları
  async function saveJob(j) {
    j.updatedAt = Date.now();
    await DB.put(j);
    if (window.Sync && Sync.enabled) Sync.push(j).then(setBadge);
  }
  async function deleteJob(id) {
    await DB.remove(id);
    if (window.Sync && Sync.enabled) Sync.remove(id).then(setBadge);
  }
  function setBadge(res) {
    const el = document.getElementById("syncBadge");
    if (!el) return;
    if (!window.Sync || !Sync.enabled) { el.textContent = "Cihazda"; el.className = "badge badge-local"; return; }
    if (res && res.ok === false && !res.offline) { el.textContent = "Bulut hatası"; el.className = "badge badge-err"; return; }
    el.textContent = "Bulut ✓"; el.className = "badge badge-cloud";
  }

  function newJob() {
    return {
      id: uid(),
      status: "kabul",
      createdAt: Date.now(),
      deliveredAt: null,
      customer: { name: "", phone: "", email: "" },
      vehicle: { brand: "", model: "", year: "", plate: "", vin: "", km: "" },
      complaints: "",
      maintenance: [], // seçili item id'leri (kabulde talep)
      photosIn: [],
      workDone: [], // teslimde yapılanlar
      workNotes: "",
      photosOut: [],
      signature: null,
    };
  }

  // Görsel sıkıştırma (max kenar 1280px, jpeg 0.7)
  function fileToDataURL(file, maxSide = 1280, quality = 0.7) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        let { width: w, height: h } = img;
        if (Math.max(w, h) > maxSide) {
          const r = maxSide / Math.max(w, h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = url;
    });
  }

  // ---------- görünümler ----------
  function setTab(view) {
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.view === view));
  }

  async function renderList() {
    setTab("list");
    const jobs = await DB.all();
    if (!jobs.length) {
      app.innerHTML = `<div class="empty">
        <div class="empty-ic">🚗</div>
        <p>Henüz kayıt yok.</p>
        <button class="btn btn-primary" id="emptyNew">Yeni Araç Kabulü</button>
      </div>`;
      document.getElementById("emptyNew").onclick = () => startNew();
      return;
    }
    const nOpen = jobs.filter((j) => j.status !== "teslim").length;
    const nDone = jobs.filter((j) => j.status === "teslim").length;
    app.innerHTML = `
      <div class="listwrap">
        <div class="segmented">
          <button class="seg ${listFilter === "kabul" ? "active" : ""}" data-f="kabul">Serviste <span class="seg-n">${nOpen}</span></button>
          <button class="seg ${listFilter === "teslim" ? "active" : ""}" data-f="teslim">Teslim edilen <span class="seg-n">${nDone}</span></button>
        </div>
        <input id="search" class="search" placeholder="Ara: plaka, müşteri, marka…" />
        <div class="daterow">
          <label>Tarih:</label>
          <input id="d_from" class="datein" type="date" />
          <span>–</span>
          <input id="d_to" class="datein" type="date" />
          <button id="d_clear" class="dclear" title="Temizle">✕</button>
        </div>
        <div id="cards"></div>
      </div>`;
    const cards = document.getElementById("cards");
    const draw = () => {
      const q = document.getElementById("search").value.toLowerCase().trim();
      const fromV = document.getElementById("d_from").value;
      const toV = document.getElementById("d_to").value;
      const fromTs = fromV ? new Date(fromV + "T00:00:00").getTime() : null;
      const toTs = toV ? new Date(toV + "T23:59:59").getTime() : null;
      const filtered = jobs.filter((j) => {
        const inTab = listFilter === "teslim" ? j.status === "teslim" : j.status !== "teslim";
        if (!inTab) return false;
        if (fromTs && (j.createdAt || 0) < fromTs) return false;
        if (toTs && (j.createdAt || 0) > toTs) return false;
        if (!q) return true;
        const hay = [j.vehicle.plate, j.vehicle.brand, j.vehicle.model, j.customer.name, j.vehicle.vin].join(" ").toLowerCase();
        return hay.includes(q);
      });
      if (!filtered.length) {
        cards.innerHTML = `<div class="list-empty">${listFilter === "teslim" ? "Teslim edilen araç yok." : "Serviste araç yok."}</div>`;
        return;
      }
      cards.innerHTML = filtered.map((j) => {
        const st = STATUS[j.status] || STATUS.kabul;
        const v = j.vehicle;
        const title = [v.brand, v.model].filter(Boolean).join(" ") || "Araç";
        return `<div class="card" data-id="${j.id}">
          <div class="card-top">
            <span class="plate">${esc(v.plate) || "—"}</span>
            <span class="st ${st.cls}">${st.label}</span>
          </div>
          <div class="card-title">${esc(title)}</div>
          <div class="card-sub">${esc(j.customer.name) || "İsimsiz"} · ${esc(v.km) ? esc(v.km) + " km" : "—"}</div>
          <div class="card-date">${fmtDate(j.createdAt)}</div>
        </div>`;
      }).join("");
      cards.querySelectorAll(".card").forEach((el) => {
        el.onclick = () => openJob(el.dataset.id);
      });
    };
    draw();
    document.getElementById("search").oninput = draw;
    document.getElementById("d_from").onchange = draw;
    document.getElementById("d_to").onchange = draw;
    document.getElementById("d_clear").onclick = () => {
      document.getElementById("d_from").value = "";
      document.getElementById("d_to").value = "";
      draw();
    };
    app.querySelectorAll(".seg").forEach((b) => {
      b.onclick = () => {
        listFilter = b.dataset.f;
        app.querySelectorAll(".seg").forEach((x) => x.classList.toggle("active", x === b));
        draw();
      };
    });
  }

  function startNew() {
    current = newJob();
    renderKabul();
  }

  async function openJob(id) {
    current = await DB.get(id);
    if (!current) return renderList();
    if (current.status === "teslim") renderDetail();
    else renderKabul();
  }

  // Fotoğraf grid bileşeni
  function photoGrid(list, onAdd, onRemove, label) {
    const wrap = document.createElement("div");
    wrap.className = "photos";
    const render = () => {
      wrap.innerHTML =
        list.map((p, i) => `<div class="thumb"><img src="${p.data}" /><button class="thumb-x" data-i="${i}">✕</button></div>`).join("") +
        `<label class="thumb add">
           <input type="file" accept="image/*" capture="environment" multiple hidden />
           <span>📷<br>${label}</span>
         </label>`;
      wrap.querySelector('input[type=file]').onchange = async (e) => {
        for (const f of e.target.files) {
          const data = await fileToDataURL(f);
          onAdd({ data, ts: Date.now() });
        }
        render();
      };
      wrap.querySelectorAll(".thumb-x").forEach((b) => {
        b.onclick = () => { onRemove(+b.dataset.i); render(); };
      });
    };
    render();
    return wrap;
  }

  // ---------- KABUL ekranı ----------
  function renderKabul() {
    setTab(current && current.createdAt ? "list" : "new");
    const j = current;
    app.innerHTML = `
      <div class="form">
        <div class="form-head">
          <button class="back" id="back">‹ Geri</button>
          <h2>Araç Kabul</h2>
        </div>

        <section class="fs">
          <h3>Müşteri</h3>
          <input id="c_name" class="in" placeholder="Ad Soyad" value="${esc(j.customer.name)}" />
          <input id="c_phone" class="in" type="tel" placeholder="Telefon" value="${esc(j.customer.phone)}" />
          <input id="c_email" class="in" type="email" placeholder="E-posta (opsiyonel)" value="${esc(j.customer.email)}" />
        </section>

        <section class="fs">
          <h3>Araç</h3>
          <div class="row2">
            <select id="v_brand" class="in">
              <option value="">Marka</option>
              ${["BMW","Mini","Mercedes","Diğer"].map(b=>`<option ${j.vehicle.brand===b?"selected":""}>${b}</option>`).join("")}
            </select>
            <input id="v_model" class="in" placeholder="Model" value="${esc(j.vehicle.model)}" />
          </div>
          <div class="row2">
            <input id="v_year" class="in" type="number" placeholder="Yıl" value="${esc(j.vehicle.year)}" />
            <input id="v_plate" class="in" placeholder="Plaka" value="${esc(j.vehicle.plate)}" style="text-transform:uppercase" />
          </div>
          <div class="row2">
            <input id="v_km" class="in" type="number" placeholder="KM" value="${esc(j.vehicle.km)}" />
            <input id="v_vin" class="in" placeholder="Şasi / VIN" value="${esc(j.vehicle.vin)}" style="text-transform:uppercase" />
          </div>
          <button id="scanVin" class="btn btn-ghost">📷 Ruhsattan VIN oku (OCR)</button>
          <div id="ocrStatus" class="ocr-status"></div>
        </section>

        <section class="fs">
          <h3>Fotoğraflar</h3>
          <div class="sub">Araç (4 köşe + hasar) ve ruhsat fotoğrafları</div>
          <div id="photosIn"></div>
        </section>

        <section class="fs">
          <h3>Şikayetler</h3>
          <textarea id="complaints" class="in ta" placeholder="Müşterinin belirttiği şikayetler…">${esc(j.complaints)}</textarea>
        </section>

        <section class="fs">
          <h3>Talep Edilen Bakım / İşlemler</h3>
          <div id="mnt"></div>
        </section>

        <div class="actions">
          <button class="btn btn-primary" id="save">Kaydet</button>
          ${j.status === "kabul" && j.createdAt ? '<button class="btn btn-success" id="toDeliver">Teslime Geç →</button>' : ""}
          ${j.createdAt ? '<button class="btn btn-danger" id="del">Sil</button>' : ""}
        </div>
      </div>`;

    // fotoğraf grid
    document.getElementById("photosIn").appendChild(
      photoGrid(j.photosIn, (p) => j.photosIn.push(p), (i) => j.photosIn.splice(i, 1), "Ekle")
    );

    // bakım katalog
    renderCatalog(document.getElementById("mnt"), j.maintenance);

    // VIN OCR
    document.getElementById("scanVin").onclick = () => scanVin();

    // olaylar
    document.getElementById("back").onclick = () => renderList();
    document.getElementById("save").onclick = async () => {
      collectKabul();
      await saveJob(j);
      toast("Kaydedildi ✓");
      renderList();
    };
    const td = document.getElementById("toDeliver");
    if (td) td.onclick = async () => { collectKabul(); await saveJob(j); renderDetail(); };
    const del = document.getElementById("del");
    if (del) del.onclick = async () => {
      if (confirm("Bu kaydı silmek istediğine emin misin?")) { await deleteJob(j.id); renderList(); }
    };
  }

  function collectKabul() {
    const g = (id) => document.getElementById(id).value.trim();
    const j = current;
    j.customer = { name: g("c_name"), phone: g("c_phone"), email: g("c_email") };
    j.vehicle = {
      brand: g("v_brand"), model: g("v_model"), year: g("v_year"),
      plate: g("v_plate").toUpperCase(), km: g("v_km"), vin: g("v_vin").toUpperCase(),
    };
    j.complaints = g("complaints");
    j.maintenance = collectChecked("mnt");
  }

  // ---------- Katalog (checkbox grupları) ----------
  function renderCatalog(container, selected) {
    container.innerHTML = window.CATALOG.map((grp) => `
      <details class="grp">
        <summary><span class="grp-ic">${grp.icon}</span> ${grp.title}
          <span class="grp-count" data-g="${grp.id}"></span>
        </summary>
        <div class="grp-items">
          ${grp.items.map((it) => `
            <label class="chk">
              <input type="checkbox" value="${it.id}" ${selected.includes(it.id) ? "checked" : ""} />
              <span>${it.label}</span>
            </label>`).join("")}
        </div>
      </details>`).join("");
    const updCounts = () => {
      window.CATALOG.forEach((grp) => {
        const n = grp.items.filter((it) =>
          container.querySelector(`input[value="${it.id}"]`).checked).length;
        container.querySelector(`.grp-count[data-g="${grp.id}"]`).textContent = n ? `(${n})` : "";
      });
    };
    container.querySelectorAll("input[type=checkbox]").forEach((c) => (c.onchange = updCounts));
    updCounts();
  }

  function collectChecked(containerId) {
    return [...document.getElementById(containerId).querySelectorAll("input[type=checkbox]:checked")].map((c) => c.value);
  }

  // ---------- TESLİM ekranı ----------
  function renderDetail() {
    const j = current;
    const teslim = j.status === "teslim";
    app.innerHTML = `
      <div class="form">
        <div class="form-head">
          <button class="back" id="back">‹ Geri</button>
          <h2>${teslim ? "Kayıt Detayı" : "Araç Teslim"}</h2>
        </div>

        <section class="fs summary">
          <div class="row2">
            <div><span class="lbl">Plaka</span><b>${esc(j.vehicle.plate) || "—"}</b></div>
            <div><span class="lbl">Araç</span><b>${esc([j.vehicle.brand, j.vehicle.model].filter(Boolean).join(" ")) || "—"}</b></div>
          </div>
          <div class="row2">
            <div><span class="lbl">Müşteri</span><b>${esc(j.customer.name) || "—"}</b></div>
            <div><span class="lbl">KM</span><b>${esc(j.vehicle.km) || "—"}</b></div>
          </div>
          <div><span class="lbl">VIN</span><b>${esc(j.vehicle.vin) || "—"}</b></div>
          ${j.complaints ? `<div><span class="lbl">Şikayet</span><span>${esc(j.complaints)}</span></div>` : ""}
        </section>

        <section class="fs">
          <h3>Yapılan İşlemler</h3>
          <div class="sub">Talep edilenler ön seçili geldi; ekle/çıkar.</div>
          <div id="work"></div>
        </section>

        <section class="fs">
          <h3>Diğer / Notlar</h3>
          <textarea id="workNotes" class="in ta" placeholder="Yapılan diğer işlemler, açıklama…" ${teslim ? "disabled" : ""}>${esc(j.workNotes)}</textarea>
        </section>

        <section class="fs">
          <h3>Teslim Fotoğrafları <span class="opt">(opsiyonel)</span></h3>
          <div id="photosOut"></div>
        </section>

        <section class="fs">
          <h3>Müşteri İmzası <span class="opt">(opsiyonel)</span></h3>
          <div id="sigWrap"></div>
        </section>

        <div class="actions">
          ${teslim
            ? '<button class="btn btn-primary" id="reopen">Düzenlemeyi Aç</button>'
            : '<button class="btn btn-primary" id="save">Kaydet</button><button class="btn btn-success" id="deliver">Teslim Et ✓</button>'}
          <button class="btn btn-ghost" id="print">🖨️ Özet / Yazdır</button>
          <button class="btn btn-danger" id="del">Sil</button>
        </div>
        ${teslim ? `<div class="delivered-note">Teslim: ${fmtDate(j.deliveredAt)}</div>` : ""}
      </div>`;

    // yapılan işlemler = talep + workDone birleşimi ön seçili
    const preselect = teslim ? j.workDone : Array.from(new Set([...(j.maintenance || []), ...(j.workDone || [])]));
    renderCatalog(document.getElementById("work"), preselect);
    if (teslim) document.querySelectorAll("#work input").forEach((c) => (c.disabled = true));

    // fotoğraflar
    document.getElementById("photosOut").appendChild(
      photoGrid(j.photosOut, (p) => j.photosOut.push(p), (i) => j.photosOut.splice(i, 1), "Ekle")
    );

    // imza
    buildSignature(document.getElementById("sigWrap"), j, teslim);

    // olaylar
    document.getElementById("back").onclick = () => renderList();
    const collect = () => {
      j.workDone = collectChecked("work");
      j.workNotes = document.getElementById("workNotes").value.trim();
    };
    const save = document.getElementById("save");
    if (save) save.onclick = async () => { collect(); await saveJob(j); toast("Kaydedildi ✓"); };
    const deliver = document.getElementById("deliver");
    if (deliver) deliver.onclick = async () => {
      collect(); j.status = "teslim"; j.deliveredAt = Date.now();
      await saveJob(j); toast("Araç teslim edildi ✓"); renderList();
    };
    const reopen = document.getElementById("reopen");
    if (reopen) reopen.onclick = async () => { j.status = "kabul"; j.deliveredAt = null; await saveJob(j); renderDetail(); };
    document.getElementById("del").onclick = async () => {
      const msg = teslim
        ? "Bu araç TESLİM EDİLMİŞ bir kayıt. Yine de kalıcı olarak silmek istediğine emin misin?"
        : "Bu kaydı silmek istediğine emin misin?";
      if (confirm(msg)) { await deleteJob(j.id); renderList(); }
    };
    document.getElementById("print").onclick = () => renderSummary(j);
  }

  // ---------- İmza (canvas) ----------
  function buildSignature(container, j, readonly) {
    container.innerHTML = `
      <canvas id="sig" class="sig" width="600" height="200"></canvas>
      ${readonly ? "" : '<div class="sig-actions"><button class="btn btn-ghost" id="sigClear">Temizle</button></div>'}`;
    const c = document.getElementById("sig");
    const ctx = c.getContext("2d");
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = "#0b1220";
    // ölçek düzelt
    const scaleX = () => c.width / c.getBoundingClientRect().width;
    const scaleY = () => c.height / c.getBoundingClientRect().height;
    if (j.signature) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height); img.src = j.signature; }
    if (readonly) return;
    let drawing = false;
    const pos = (e) => {
      const r = c.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: (t.clientX - r.left) * scaleX(), y: (t.clientY - r.top) * scaleY() };
    };
    const start = (e) => { drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); };
    const move = (e) => { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); j.signature = c.toDataURL("image/png"); e.preventDefault(); };
    const end = () => { drawing = false; };
    c.addEventListener("mousedown", start); c.addEventListener("mousemove", move); window.addEventListener("mouseup", end);
    c.addEventListener("touchstart", start, { passive: false }); c.addEventListener("touchmove", move, { passive: false }); c.addEventListener("touchend", end);
    document.getElementById("sigClear").onclick = () => { ctx.clearRect(0, 0, c.width, c.height); j.signature = null; };
  }

  // ---------- Özet / yazdır (uygulama içi, geri dönülebilir) ----------
  function renderSummary(j) {
    document.querySelector(".tabbar").style.display = "none";
    const items = (j.workDone && j.workDone.length ? j.workDone : j.maintenance) || [];
    const rows = items.map((id) => `<li>${esc(window.CATALOG_LABELS[id] || id)}</li>`).join("");
    app.innerHTML = `
      <div class="form-head no-print">
        <button class="back" id="s_back">‹ Geri</button>
        <h2>Özet</h2>
      </div>
      <div id="printArea" class="print-area">
        <div class="pa-head">
          <h1>MT Servis — İş Emri</h1>
          <div class="pa-shop">${esc(SHOP.address)} · Tel: ${esc(SHOP.phone)}</div>
        </div>
        <div class="pa-grid">
          <div><span class="k">Plaka:</span> <b>${esc(j.vehicle.plate) || "—"}</b></div>
          <div><span class="k">Araç:</span> ${esc([j.vehicle.brand, j.vehicle.model, j.vehicle.year].filter(Boolean).join(" ")) || "—"}</div>
          <div><span class="k">Müşteri:</span> ${esc(j.customer.name) || "—"}</div>
          <div><span class="k">Telefon:</span> ${esc(j.customer.phone) || "—"}</div>
          <div><span class="k">KM:</span> ${esc(j.vehicle.km) || "—"}</div>
          <div><span class="k">VIN:</span> ${esc(j.vehicle.vin) || "—"}</div>
          <div><span class="k">Giriş:</span> ${fmtDate(j.createdAt)}</div>
          <div><span class="k">Teslim:</span> ${fmtDate(j.deliveredAt)}</div>
        </div>
        ${j.complaints ? `<h3 class="pa-h">Şikayetler</h3><div>${esc(j.complaints)}</div>` : ""}
        <h3 class="pa-h">Yapılan İşlemler</h3><ul class="pa-ul">${rows || "<li>-</li>"}</ul>
        ${j.workNotes ? `<h3 class="pa-h">Notlar</h3><div>${esc(j.workNotes)}</div>` : ""}
        ${j.signature ? `<h3 class="pa-h">Müşteri İmzası</h3><img class="pa-sig" src="${j.signature}"/>` : ""}
      </div>
      <div class="actions no-print">
        <button class="btn btn-primary" id="s_print">🖨️ Yazdır / PDF</button>
        <button class="btn btn-ghost" id="s_back2">‹ Geri Dön</button>
      </div>`;
    const back = () => { document.querySelector(".tabbar").style.display = ""; renderDetail(); };
    document.getElementById("s_back").onclick = back;
    document.getElementById("s_back2").onclick = back;
    document.getElementById("s_print").onclick = () => window.print();
  }

  // ---------- VIN OCR (opsiyonel, Tesseract CDN) ----------
  async function scanVin() {
    const status = document.getElementById("ocrStatus");
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.capture = "environment";
    input.onchange = async () => {
      const f = input.files[0]; if (!f) return;
      status.textContent = "OCR motoru yükleniyor…";
      try {
        if (!window.Tesseract) await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
        status.textContent = "Ruhsat okunuyor… (biraz sürebilir)";
        const dataUrl = await fileToDataURL(f, 1600, 0.85);
        const { data } = await window.Tesseract.recognize(dataUrl, "eng");
        const text = (data.text || "").toUpperCase().replace(/O/g, "0").replace(/[^A-HJ-NPR-Z0-9\s]/g, " ");
        const m = text.match(/\b[A-HJ-NPR-Z0-9]{17}\b/); // VIN 17 hane, I/O/Q yok
        if (m) {
          document.getElementById("v_vin").value = m[0];
          status.innerHTML = `<span class="ok">VIN bulundu: ${m[0]}</span>`;
        } else {
          status.innerHTML = `<span class="warn">17 haneli VIN net okunamadı. Fotoğrafı yakın/net çekip tekrar dene ya da elle gir.</span>`;
        }
      } catch (err) {
        status.innerHTML = `<span class="warn">OCR için internet gerekli. Şimdilik VIN'i elle girebilirsin.</span>`;
      }
    };
    input.click();
  }
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  // ---------- toast ----------
  let toastT;
  function toast(msg) {
    let el = document.getElementById("toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 1800);
  }

  // ---------- nav ----------
  tabs.forEach((t) => (t.onclick = () => {
    if (t.dataset.view === "list") renderList();
    else startNew();
  }));

  // ---------- Giriş ekranı (bulut açıkken) ----------
  function renderLogin(errMsg) {
    document.querySelector(".tabbar").style.display = "none";
    app.innerHTML = `
      <div class="login">
        <div class="login-logos">
          <img src="bmw.png" alt="BMW" class="marka-logo" />
          <img src="mini-cooper.png" alt="Mini" class="marka-logo marka-mini" />
        </div>
        <h2>MT Servis</h2>
        <p class="login-sub">Atölye girişi</p>
        <input id="l_email" class="in" type="email" placeholder="E-posta" autocomplete="username" />
        <input id="l_pass" class="in" type="password" placeholder="Şifre" autocomplete="current-password" />
        ${errMsg ? `<div class="login-err">${esc(errMsg)}</div>` : ""}
        <button class="btn btn-primary" id="l_btn">Giriş Yap</button>
        <div class="login-contact">${esc(SHOP.address)}<br>Tel: ${esc(SHOP.phone)}</div>
      </div>`;
    const btn = document.getElementById("l_btn");
    const submit = async () => {
      const email = document.getElementById("l_email").value.trim();
      const pass = document.getElementById("l_pass").value;
      if (!email || !pass) return renderLogin("E-posta ve şifre gerekli.");
      btn.disabled = true; btn.textContent = "Giriş yapılıyor…";
      const res = await Sync.signIn(email, pass);
      if (!res.ok) return renderLogin("Giriş başarısız: " + (res.error && res.error.message || "hatalı bilgi"));
      startApp();
    };
    btn.onclick = submit;
    document.getElementById("l_pass").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  }

  function startApp() {
    document.querySelector(".tabbar").style.display = "";
    setBadge();
    renderList();
    if (window.Sync && Sync.enabled) {
      Sync.pull().then((res) => { setBadge(res); if (res.merged) renderList(); });
      window.addEventListener("online", () => Sync.pull().then((res) => { setBadge(res); if (res.merged) renderList(); }));
      // rozete dokununca çıkış
      const badge = document.getElementById("syncBadge");
      if (badge) badge.onclick = async () => {
        if (confirm("Çıkış yapılsın mı?")) { await Sync.signOut(); location.reload(); }
      };
    }
  }

  // başlat
  (async () => {
    setBadge();
    if (window.Sync && Sync.enabled) {
      const session = await Sync.getSession();
      if (!session) return renderLogin();
    }
    startApp();
  })();

  // service worker
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
