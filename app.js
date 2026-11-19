(function () {
  const KEYS = {
    inventory: "maison_inventory_v1",
    interest: "maison_interest_v1",
    favorites: "maison_favorites_v1"
  };
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }
  function money(n) {
    return "₹" + Number(n).toLocaleString("en-IN");
  }
  function stockStatus(qty) {
    if (qty <= 0) return { className: "unavailable", label: "Out of Stock" };
    if (qty <= 3) return { className: "low-stock", label: "Low Stock" };
    return { className: "available", label: "In Stock" };
  }
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }
  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  function toast(message) {
    let stack = $(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    const note = document.createElement("div");
    note.className = "toast";
    note.textContent = message;
    stack.appendChild(note);
    setTimeout(function () { note.remove(); }, 2800);
  }
  function getInventory() {
    const stored = read(KEYS.inventory, null);
    if (stored) return stored;
    write(KEYS.inventory, MaisonData.inventorySeed);
    return MaisonData.inventorySeed.slice();
  }
  function getInterest() {
    const stored = read(KEYS.interest, null);
    if (stored) return stored;
    write(KEYS.interest, MaisonData.interestSeed);
    return MaisonData.interestSeed.slice();
  }
  function getFavorites() {
    return read(KEYS.favorites, []);
  }
  function productStock(product) {
    const rows = getInventory().filter(function (row) { return row.id === product.id; });
    if (!rows.length) return product.status;
    const qty = rows.reduce(function (sum, row) { return sum + Number(row.quantity); }, 0);
    return stockStatus(qty).className;
  }
  function productStatusLabel(product) {
    const status = productStock(product);
    if (status === "unavailable") return "Out of Stock";
    if (status === "low-stock") return "Low Stock";
    return "In Stock";
  }
  function setupNav() {
    const nav = $(".navbar");
    const toggle = $(".menu-toggle");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        nav.classList.toggle("open");
      });
    }
  }
  function animateBars() {
    $$(".bar-fill").forEach(function (bar) {
      const width = bar.getAttribute("data-width") || bar.style.width;
      bar.style.width = "0";
      requestAnimationFrame(function () {
        bar.style.width = width;
      });
    });
  }
  function countUp(el) {
    const target = Number(el.getAttribute("data-count"));
    if (!target && target !== 0) return;
    const isText = el.getAttribute("data-text");
    if (isText) {
      el.textContent = isText;
      return;
    }
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / 700, 1);
      el.textContent = String(Math.round(target * p)).padStart(String(target).length, "0");
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function renderDashboard() {
    const inventory = getInventory();
    const interest = getInterest();
    const inStock = inventory.filter(function (r) { return r.quantity > 3; }).length;
    const low = inventory.filter(function (r) { return r.quantity > 0 && r.quantity <= 3; }).length;
    const out = inventory.filter(function (r) { return r.quantity <= 0; }).length;
    const total = inventory.length || 1;
    const setCount = function (id, value) {
      const el = document.getElementById(id);
      if (el) {
        el.setAttribute("data-count", String(value));
        countUp(el);
      }
    };
    setCount("stat-designs", MaisonData.products.length);
    setCount("stat-collections", 4);
    setCount("stat-variants", inventory.length);
    setCount("stat-interest", interest.length);
    const bars = {
      in: Math.round((inStock / total) * 100),
      low: Math.round((low / total) * 100),
      out: Math.round((out / total) * 100)
    };
    const inEl = $("#bar-in");
    const lowEl = $("#bar-low");
    const outEl = $("#bar-out");
    if (inEl) {
      inEl.setAttribute("data-width", bars.in + "%");
      $("#bar-in-label").textContent = bars.in + "%";
    }
    if (lowEl) {
      lowEl.setAttribute("data-width", bars.low + "%");
      $("#bar-low-label").textContent = bars.low + "%";
    }
    if (outEl) {
      outEl.setAttribute("data-width", bars.out + "%");
      $("#bar-out-label").textContent = bars.out + "%";
    }
    animateBars();
  }
  function productCard(product) {
    const fav = getFavorites().indexOf(product.id) !== -1;
    const status = productStock(product);
    return (
      '<article class="product-card ' + product.collection + '" data-id="' + product.id + '">' +
        '<img src="' + product.image + '" alt="' + product.alt + '">' +
        '<div class="card-content">' +
          '<span class="tag">' + product.collectionLabel + "</span>" +
          "<h3>" + product.name + "</h3>" +
          "<p>Style: " + product.style + "</p>" +
          "<p>Sizes: " + product.sizes.join(", ") + "</p>" +
          "<p>Colors: " + product.colors.join(", ") + "</p>" +
          '<div class="price">' + money(product.price) + "</div>" +
          '<span class="tag ' + status + '">' + productStatusLabel(product) + "</span>" +
          '<p class="muted">Product ID: ' + product.id + "</p>" +
          '<div class="actions">' +
                      '<button class="btn" data-action="view" data-id="' + product.id + '">Quick view</button>' +
            '<button class="btn btn-outline" data-action="interest" data-id="' + product.id + '">Record interest</button>' +
            '<button class="btn ghost" data-action="favorite" data-id="' + product.id + '">' +
              (fav ? "Saved" : "Save") +
            "</button>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }
  function openModal(product) {
    const backdrop = $("#product-modal");
    if (!backdrop) return;
    $("#modal-image").src = product.image;
    $("#modal-image").alt = product.alt;
    $("#modal-title").textContent = product.name;
    $("#modal-meta").innerHTML =
      "<p>" + product.description + "</p>" +
      "<p>Collection: " + product.collectionLabel + "</p>" +
      "<p>Style: " + product.style + "</p>" +
      "<p>Sizes: " + product.sizes.join(", ") + "</p>" +
      "<p>Colors: " + product.colors.join(", ") + "</p>" +
      "<p class='price'>" + money(product.price) + "</p>" +
      "<p>Status: " + productStatusLabel(product) + "</p>";
    $("#modal-interest").setAttribute("data-id", product.id);
    backdrop.classList.add("open");
  }
  function renderCatalogue() {
    const grid = $("#catalogue-grid");
    if (!grid) return;
    const params = new URLSearchParams(location.search);
    const search = ($("#search-garments") || {}).value || "";
    const collection = ($("#collection-select") || {}).value || params.get("collection") || "all";
    const availability = ($("#availability-select") || {}).value || "all";
    const size = ($("#size-select") || {}).value || "all";
    const sort = ($("#sort-select") || {}).value || "featured";
    if ($("#collection-select") && params.get("collection") && !$("#collection-select").dataset.applied) {
      $("#collection-select").value = params.get("collection");
      $("#collection-select").dataset.applied = "1";
    }
    $$('input[name="collection-filter"]').forEach(function (input) {
      input.checked = input.value === ( $("#collection-select") ? $("#collection-select").value : collection );
    });
    $$(".filter-row label").forEach(function (label) {
      const forId = label.getAttribute("for");
      const input = forId ? document.getElementById(forId) : null;
      label.classList.toggle("is-active", Boolean(input && input.checked));
    });
    let items = MaisonData.products.slice();
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter(function (p) {
        return [p.name, p.style, p.id, p.colors.join(" "), p.collectionLabel].join(" ").toLowerCase().indexOf(q) !== -1;
      });
    }
    const col = $("#collection-select") ? $("#collection-select").value : collection;
    if (col && col !== "all") items = items.filter(function (p) { return p.collection === col; });
    if (availability !== "all") items = items.filter(function (p) { return productStock(p) === availability; });
    if (size !== "all") items = items.filter(function (p) { return p.sizes.indexOf(size) !== -1; });
    if (sort === "price-asc") items.sort(function (a, b) { return a.price - b.price; });
    if (sort === "price-desc") items.sort(function (a, b) { return b.price - a.price; });
    if (sort === "name") items.sort(function (a, b) { return a.name.localeCompare(b.name); });
    $("#result-count").textContent = items.length + " garment" + (items.length === 1 ? "" : "s") + " shown";
    grid.innerHTML = items.length
      ? items.map(productCard).join("")
      : '<div class="empty-state">No garments match these filters. Try clearing search or choosing All Designs.</div>';
  }
  function setupCatalogue() {
    if (!$("#catalogue-grid")) return;
    ["search-garments", "collection-select", "availability-select", "size-select", "sort-select"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", renderCatalogue);
      if (el) el.addEventListener("change", renderCatalogue);
    });
    $$('input[name="collection-filter"]').forEach(function (input) {
      input.addEventListener("change", function () {
        if ($("#collection-select")) $("#collection-select").value = input.value;
        renderCatalogue();
      });
    });
    document.addEventListener("click", function (event) {
      const btn = event.target.closest("[data-action]");
      if (!btn) return;
      const product = MaisonData.products.find(function (p) { return p.id === btn.getAttribute("data-id"); });
      if (!product) return;
      if (btn.getAttribute("data-action") === "view") openModal(product);
      if (btn.getAttribute("data-action") === "interest") {
        location.href = "interest.html?garment=" + encodeURIComponent(product.name) +
          "&collection=" + encodeURIComponent(product.collectionLabel);
      }
      if (btn.getAttribute("data-action") === "favorite") {
        const favs = getFavorites();
        const i = favs.indexOf(product.id);
        if (i === -1) favs.push(product.id);
        else favs.splice(i, 1);
        write(KEYS.favorites, favs);
        toast(i === -1 ? product.name + " saved to your shortlist." : product.name + " removed from shortlist.");
        renderCatalogue();
      }
    });
    const backdrop = $("#product-modal");
    if (backdrop) {
      backdrop.addEventListener("click", function (event) {
        if (event.target === backdrop || event.target.classList.contains("modal-close")) {
          backdrop.classList.remove("open");
        }
      });
      $("#modal-interest").addEventListener("click", function () {
        const id = this.getAttribute("data-id");
        const product = MaisonData.products.find(function (p) { return p.id === id; });
        if (product) {
          location.href = "interest.html?garment=" + encodeURIComponent(product.name) +
            "&collection=" + encodeURIComponent(product.collectionLabel);
        }
      });
    }
    renderCatalogue();
  }
  function statusTag(status) {
    const map = {
      Interested: "available",
      Requested: "low-stock",
      "Awaiting Stock": "unavailable",
      "In Stock": "available",
      "Low Stock": "low-stock",
      "Out of Stock": "unavailable"
    };
    return '<span class="tag ' + (map[status] || "") + '">' + status + "</span>";
  }
 function renderInterest() {
    const tbody = $("#interest-body");
    if (!tbody) return;
    const q = (($("#interest-search") || {}).value || "").toLowerCase();
    const rows = getInterest().filter(function (row) {
      return Object.values(row).join(" ").toLowerCase().indexOf(q) !== -1;
    });
    tbody.innerHTML = rows.map(function (row) {
      return "<tr>" +
        "<td>" + row.ref + "</td>" +
        "<td>" + row.customer + "</td>" +
        "<td>" + row.garment + "</td>" +
        "<td>" + row.size + "</td>" +
        "<td>" + row.color + "</td>" +
        "<td>" + row.collection + "</td>" +
        "<td>" + statusTag(row.status) + "</td>" +
      "</tr>";
    }).join("") || '<tr><td colspan="7">No matching interest records.</td></tr>';
    const all = getInterest();
    const counts = {};
    all.forEach(function (row) {
      counts[row.garment] = (counts[row.garment] || 0) + 1;
    });
    const topGarment = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0] || "—";
    const colors = {};
    all.forEach(function (row) { colors[row.color] = (colors[row.color] || 0) + 1; });
    const topColor = Object.keys(colors).sort(function (a, b) { return colors[b] - colors[a]; })[0] || "—";
    const sizes = {};
    all.forEach(function (row) { sizes[row.size] = (sizes[row.size] || 0) + 1; });
    const topSize = Object.keys(sizes).sort(function (a, b) { return sizes[b] - sizes[a]; })[0] || "—";
    if ($("#interest-total")) $("#interest-total").textContent = String(all.length).padStart(2, "0");
    if ($("#interest-style")) $("#interest-style").textContent = String(counts[topGarment] || 0).padStart(2, "0");
    if ($("#interest-style-label")) $("#interest-style-label").textContent = topGarment;
    if ($("#interest-color")) $("#interest-color").textContent = String(colors[topColor] || 0).padStart(2, "0");
    if ($("#interest-color-label")) $("#interest-color-label").textContent = topColor + " preferences";
    if ($("#interest-size")) $("#interest-size").textContent = topSize;
    const barsHost = $("#popular-bars");
    if (barsHost) {
      const max = Math.max.apply(null, Object.keys(counts).map(function (k) { return counts[k]; }).concat([1]));
      barsHost.innerHTML = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 4).map(function (name) {
        const pct = Math.round((counts[name] / max) * 100);
        return '<div class="bar-item"><div class="bar-label"><span>' + name + "</span><strong>" + counts[name] +
          '</strong></div><div class="bar-track"><div class="bar-fill" data-width="' + pct + '%"></div></div></div>';
      }).join("");
      animateBars();
    }
  }
  function setupInterest() {
    if (!$("#interest-form")) return;
    const params = new URLSearchParams(location.search);
    if (params.get("garment")) $("#garment").value = params.get("garment");
    if (params.get("collection")) $("#collection").value = params.get("collection");
    $("#interest-search").addEventListener("input", renderInterest);
    $("#interest-form").addEventListener("submit", function (event) {
      event.preventDefault();
      const customer = $("#customer").value.trim();
      const garment = $("#garment").value;
      const size = $("#size").value;
      const color = $("#color").value.trim();
      const collection = $("#collection").value;
      const status = $("#status").value;
      let valid = true;
      [["customer", customer], ["garment", garment], ["size", size], ["color", color], ["collection", collection]].forEach(function (pair) {
        const err = $("#err-" + pair[0]);
        if (err) err.textContent = pair[1] ? "" : "This field is required.";
        if (!pair[1]) valid = false;
      });
      if (!valid) {
        toast("Please complete the required fields.");
        return;
      }
      const rows = getInterest();
      const next = "CI" + String(rows.length + 1).padStart(3, "0");
      rows.unshift({
        ref: next,
        customer: customer,
        garment: garment,
        size: size,
        color: color,
        collection: collection,
        status: status
      });
      write(KEYS.interest, rows);
      event.target.reset();
      if (params.get("garment")) $("#garment").value = params.get("garment");
      if (params.get("collection")) $("#collection").value = params.get("collection");
      toast("Interest record " + next + " saved on this device.");
      renderInterest();
    });
    renderInterest();
  }
  function renderInventory() {
    const tbody = $("#inventory-body");
    if (!tbody) return;
    const q = (($("#inventory-search") || {}).value || "").toLowerCase();
    const filter = ($("#inventory-status") || {}).value || "all";
    const rows = getInventory().filter(function (row) {
      const status = stockStatus(row.quantity);
      const hay = [row.id, row.garment, row.collection, row.size, row.color, status.label].join(" ").toLowerCase();
      const matchQ = hay.indexOf(q) !== -1;
      const matchStatus = filter === "all" || status.className === filter;
      return matchQ && matchStatus;
    });
    tbody.innerHTML = rows.map(function (row, index) {
      const status = stockStatus(row.quantity);
      return "<tr>" +
        "<td>" + row.id + "</td>" +
        "<td>" + row.garment + "</td>" +
        "<td>" + row.collection + "</td>" +
        "<td>" + row.size + "</td>" +
        "<td>" + row.color + "</td>" +
        "<td>" + row.quantity + "</td>" +
        "<td>" + statusTag(status.label) + "</td>" +
        '<td><button class="btn" data-restock="' + index + '" data-id="' + row.id + '" data-size="' + row.size + '" data-color="' + row.color + '">Restock +1</button></td>' +
      "</tr>";
    }).join("") || '<tr><td colspan="8">No variants match this filter.</td></tr>';
    const all = getInventory();
    const inStock = all.filter(function (r) { return r.quantity > 3; }).length;
    const low = all.filter(function (r) { return r.quantity > 0 && r.quantity <= 3; }).length;
    const out = all.filter(function (r) { return r.quantity <= 0; }).length;
    if ($("#inv-total")) $("#inv-total").textContent = String(all.length);
    if ($("#inv-in")) $("#inv-in").textContent = String(inStock);
    if ($("#inv-low")) $("#inv-low").textContent = String(low);
    if ($("#inv-out")) $("#inv-out").textContent = String(out);
    const total = all.length || 1;
    const setBar = function (id, value) {
      const el = document.getElementById(id);
      if (!el) return;
      const pct = Math.round((value / total) * 100);
      el.setAttribute("data-width", pct + "%");
      const label = document.getElementById(id + "-label");
      if (label) label.textContent = pct + "%";
    };
    setBar("inv-bar-in", inStock);
    setBar("inv-bar-low", low);
    setBar("inv-bar-out", out);
    animateBars();
  }
  function setupInventory() {
    if (!$("#inventory-body")) return;
    $("#inventory-search").addEventListener("input", renderInventory);
    $("#inventory-status").addEventListener("change", renderInventory);
    document.addEventListener("click", function (event) {
      const btn = event.target.closest("[data-restock]");
      if (!btn) return;
      const rows = getInventory();
      const match = rows.find(function (row) {
        return row.id === btn.getAttribute("data-id") &&
          row.size === btn.getAttribute("data-size") &&
          row.color === btn.getAttribute("data-color");
      });
      if (!match) return;
      match.quantity += 1;
      write(KEYS.inventory, rows);
      toast(match.garment + " " + match.size + " / " + match.color + " restocked to " + match.quantity + ".");
      renderInventory();
    });
    renderInventory();
  }
  function setupCollections() {
    const cards = $$("[data-collection-status]");
    if (!cards.length) return;
    $$("[data-filter-collection]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const value = btn.getAttribute("data-filter-collection");
        $$("[data-filter-collection]").forEach(function (b) { b.classList.toggle("is-active", b === btn); });
        cards.forEach(function (card) {
          card.style.display = value === "all" || card.getAttribute("data-collection-status") === value ? "" : "none";
        });
      });
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    setupNav();
    setupCatalogue();
    setupInterest();
    setupInventory();
    setupCollections();
    if ($("#stat-designs")) renderDashboard();
    else animateBars();
  });
})();