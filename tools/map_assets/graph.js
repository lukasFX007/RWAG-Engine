/* ============================================================
   Scenario graph renderer for games/nebakov/scenario.json
   - layered DAG layout (longest-path layering + dummy nodes
     for long edges + barycentre crossing reduction)
   - two node presentations: story cards / logic nodes
   - edge labels placed with collision avoidance
   Data is injected as window.__NEBAKOV_DATA__.
   ============================================================ */
(function () {
  "use strict";

  var DATA = window.__NEBAKOV_DATA__;
  var S = DATA.scenes;

  var ICONS = {
    stopy: "👣", lupa: "🔍", koruna: "👑",
    mozek: "🧠", nuz: "🗡️", priroda: "🌿",
    bublina: "💬", svitek: "📜", batoh: "🎒",
    hodiny: "⏳", lebka: "💀"
  };

  var DECK_HUE = {
    P: "#6b5b8a", A: "#3f6e8a", B: "#2f7a63", C: "#7a2e22", D: "#8a5a2e",
    E: "#7f7320", F: "#45592f", G: "#2f6a6f", H: "#6a3060", N: "#6f6754",
    REF: "#6f6754", DEMO: "#7a2e22"
  };

  var CARD_W = 250, LOGIC_W = 196, DUMMY_W = 26, GAP_X = 30;
  var ROW_GAP = { story: 96, logic: 74 };

  var mode = "story";

  // ---------------------------------------------------------- utils

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function paras(raw) {
    if (!raw) return "";
    var t = esc(raw).replace(/&lt;br\s*\/?&gt;/gi, "<br>");
    return t.split(/\n{2,}/).map(function (p) { return p.trim(); })
      .filter(Boolean)
      .map(function (p) { return "<p>" + p.replace(/\n/g, "<br>") + "</p>"; })
      .join("");
  }

  function shortId(id) { return id.replace(/^card_/, "").replace(/^scene_/, "sc."); }

  function condText(disableIf) {
    if (!disableIf || !disableIf.length) return null;
    return disableIf.map(function (c) {
      if (c.type === "reputation") {
        // engine data expresses the LOCK condition; show the requirement to pass
        if (c.operator === "<") return "vyžaduje rep ≥ " + c.value;
        if (c.operator === ">") return "vyžaduje rep ≤ " + c.value;
        if (c.operator === "<=") return "vyžaduje rep > " + c.value;
        if (c.operator === ">=") return "vyžaduje rep < " + c.value;
        return "rep " + c.operator + " " + c.value;
      }
      return c.type;
    }).join(" & ");
  }

  function effectBadges(sc) {
    var out = "";
    (sc.effects || []).forEach(function (ef) {
      if (ef.type === "reputation") {
        var v = ef.value;
        out += '<span class="b ' + (v >= 0 ? "rep-pos" : "rep-neg") + '">rep ' +
          (v > 0 ? "+" : "") + v + "</span>";
      } else if (ef.type === "toast") {
        out += '<span class="b toast">toast</span>';
      }
    });
    return out;
  }

  function stateBadges(sc) {
    var out = "";
    if (sc.id === DATA.trueStart) out += '<span class="b start">vstup P01</span>';
    if (sc.id === DATA.declaredStart) out += '<span class="b appstart">startScene</span>';
    if (!sc.reachable) out += '<span class="b unreach">mimo linku</span>';
    var live = (sc.choices || []).filter(function (c) { return c.goto; });
    if (!live.length) out += '<span class="b term">bez východu</span>';
    if (sc.todo) out += '<span class="b todo">todo</span>';
    return out;
  }

  function stateClasses(sc) {
    var cls = [];
    if (sc.id === DATA.trueStart) cls.push("is-start");
    if (sc.id === DATA.declaredStart) cls.push("is-appstart");
    if (!sc.reachable) cls.push("is-unreach");
    if (!(sc.choices || []).filter(function (c) { return c.goto; }).length) cls.push("is-terminal");
    return cls.join(" ");
  }

  // ---------------------------------------------------------- graph build

  function buildGraph(deck) {
    var nodes = {}, edges = [];
    var ids = Object.keys(S).filter(function (id) { return S[id].deck === deck; });
    ids.forEach(function (id) { nodes[id] = { id: id, kind: "card", w: 0 }; });

    function conn(dir, sceneId, otherDeck) {
      var cid = dir + "::" + sceneId;
      if (!nodes[cid]) nodes[cid] = { id: cid, kind: "conn", dir: dir, ref: sceneId, deck: otherDeck, w: 150 };
      return cid;
    }

    ids.forEach(function (id) {
      var sc = S[id];
      var live = (sc.choices || []).filter(function (c) { return c.goto; });
      if (!live.length) return;

      function target(c) {
        var t = S[c.goto];
        if (t && t.deck === deck) return c.goto;
        return conn("exit", c.goto, t ? t.deck : "?");
      }

      if (live.length >= 2) {
        var dec = "dec::" + id;
        nodes[dec] = { id: dec, kind: "dec", n: live.length, w: 44 };
        edges.push({ from: id, to: dec, label: null });
        live.forEach(function (c, i) {
          edges.push({ from: dec, to: target(c), label: { icon: c.icon, text: c.text, cond: condText(c.disableIf) }, i: i });
        });
      } else {
        var c0 = live[0];
        edges.push({ from: id, to: target(c0), label: { icon: c0.icon, text: c0.text, cond: condText(c0.disableIf) }, i: 0 });
      }
    });

    // inbound from other decks
    Object.keys(S).forEach(function (src) {
      var sc = S[src];
      if (sc.deck === deck) return;
      (sc.choices || []).forEach(function (c) {
        if (!c.goto) return;
        var t = S[c.goto];
        if (t && t.deck === deck) {
          var cid = conn("entry", src, sc.deck);
          edges.push({ from: cid, to: c.goto, label: { icon: c.icon, text: c.text, cond: condText(c.disableIf) } });
        }
      });
    });

    return { nodes: nodes, edges: edges };
  }

  // ---------------------------------------------------------- layering

  function layer(nodeIds, edges) {
    var out = {}, indeg = {};
    nodeIds.forEach(function (id) { out[id] = []; indeg[id] = 0; });
    edges.forEach(function (e) {
      if (out[e.from] && indeg[e.to] !== undefined) { out[e.from].push(e); indeg[e.to]++; }
    });

    var L = {}; nodeIds.forEach(function (id) { L[id] = 0; });
    var q = nodeIds.filter(function (id) { return indeg[id] === 0; });
    var rem = {}; nodeIds.forEach(function (id) { rem[id] = indeg[id]; });
    var i = 0, seen = 0;
    while (i < q.length) {
      var u = q[i++]; seen++;
      out[u].forEach(function (e) {
        if (L[e.to] < L[u] + 1) L[e.to] = L[u] + 1;
        if (--rem[e.to] === 0) q.push(e.to);
      });
    }
    // safety net: any node left by a cycle keeps its longest-path estimate
    if (seen < nodeIds.length) {
      nodeIds.forEach(function (id) {
        if (rem[id] > 0) {
          out[id].forEach(function (e) { if (L[e.to] <= L[id]) L[e.to] = L[id] + 1; });
        }
      });
    }
    return L;
  }

  /* Replace every edge spanning more than one layer by a chain through
     narrow dummy nodes, so the polyline threads between cards instead of
     disappearing underneath them. */
  function addDummies(g, L) {
    var chains = [];
    var extra = [];
    g.edges.forEach(function (e) {
      var span = L[e.to] - L[e.from];
      if (span <= 1) { extra.push(e); return; }
      var prev = e.from, chain = [];
      for (var lv = L[e.from] + 1; lv < L[e.to]; lv++) {
        var did = "d::" + e.from + ">" + e.to + "@" + lv;
        g.nodes[did] = { id: did, kind: "dummy", w: DUMMY_W };
        L[did] = lv;
        chain.push(did);
        extra.push({ from: prev, to: did, label: prev === e.from ? e.label : null, seg: true, i: e.i });
        prev = did;
      }
      extra.push({ from: prev, to: e.to, label: null, seg: true, i: e.i });
      chains.push({ orig: e, chain: chain });
    });
    g.edges = extra;
    return chains;
  }

  /* Barycentre sweeps: order nodes inside each layer by the mean position
     of their neighbours in the adjacent layer. Cuts edge crossings a lot. */
  function order(g, L) {
    var byL = {};
    Object.keys(g.nodes).forEach(function (id) {
      (byL[L[id]] = byL[L[id]] || []).push(id);
    });
    var maxL = 0;
    Object.keys(L).forEach(function (id) { if (L[id] > maxL) maxL = L[id]; });

    var pred = {}, succ = {};
    Object.keys(g.nodes).forEach(function (id) { pred[id] = []; succ[id] = []; });
    g.edges.forEach(function (e) {
      if (succ[e.from]) succ[e.from].push(e.to);
      if (pred[e.to]) pred[e.to].push(e.from);
    });

    for (var lv = 0; lv <= maxL; lv++) {
      if (byL[lv]) byL[lv].sort();
    }

    var pos = {};
    function reindex() {
      for (var lv = 0; lv <= maxL; lv++) {
        (byL[lv] || []).forEach(function (id, k) { pos[id] = k; });
      }
    }
    reindex();

    function sweep(dir) {
      var range = [];
      if (dir > 0) { for (var a = 1; a <= maxL; a++) range.push(a); }
      else { for (var b = maxL - 1; b >= 0; b--) range.push(b); }
      range.forEach(function (lv) {
        var arr = byL[lv] || [];
        var bary = {};
        arr.forEach(function (id) {
          var nb = dir > 0 ? pred[id] : succ[id];
          if (!nb.length) { bary[id] = pos[id]; return; }
          var sum = 0, n = 0;
          nb.forEach(function (x) { if (pos[x] !== undefined) { sum += pos[x]; n++; } });
          bary[id] = n ? sum / n : pos[id];
        });
        arr.sort(function (x, y) {
          if (bary[x] !== bary[y]) return bary[x] - bary[y];
          return pos[x] - pos[y];
        });
        reindex();
      });
    }

    for (var it = 0; it < 4; it++) { sweep(1); sweep(-1); }
    return { byLayer: byL, maxLayer: maxL };
  }

  // ---------------------------------------------------------- node DOM

  function cardEl(sc) {
    var el = document.createElement("div");
    el.className = "card " + stateClasses(sc);
    el.style.setProperty("--deck-hue", DECK_HUE[sc.deck] || "var(--accent)");
    var h = '<div class="card-h"><span class="c-code">' +
      esc(sc.code || shortId(sc.id)) + '</span><span class="c-id">' + esc(sc.id) + "</span></div>";
    if (sc.image) {
      h += DATA.images[sc.image]
        ? '<img class="card-img" src="' + DATA.images[sc.image] + '" alt="">'
        : '<div class="card-img-miss">image: ' + esc(sc.image) + " — v repu chybí</div>";
    }
    h += '<div class="card-t">' + paras(sc.text) + "</div>";
    var badges = effectBadges(sc) + stateBadges(sc);
    if (sc.todo) badges += '<span class="b todo wide">' + esc(sc.todo) + "</span>";
    if (badges) h += '<div class="card-f">' + badges + "</div>";
    el.innerHTML = h;
    return el;
  }

  function logicEl(sc) {
    var el = document.createElement("div");
    el.className = "lnode " + stateClasses(sc);
    el.style.setProperty("--deck-hue", DECK_HUE[sc.deck] || "var(--accent)");
    var live = (sc.choices || []).filter(function (c) { return c.goto; });
    var conds = live.filter(function (c) { return c.disableIf; }).length;
    var h = '<div class="ln-h"><span class="ln-id">' + esc(sc.id) + "</span>" +
      (sc.code ? '<span class="ln-code">' + esc(sc.code) + "</span>" : "") + "</div>";
    var badges = effectBadges(sc) + stateBadges(sc);
    if (conds) badges += '<span class="b cond">' + conds + "× podmínka</span>";
    if (h && badges) h += '<div class="ln-f">' + badges + "</div>";
    h += '<div class="ln-io"><span>in ' + sc.inbound.length + "</span><span>out " + live.length + "</span>" +
      (sc.image ? "<span>img</span>" : "") + "</div>";
    el.innerHTML = h;
    return el;
  }

  function decEl(n) {
    var el = document.createElement("div");
    el.className = "dec";
    el.innerHTML = '<div class="dec-in"><span>' + n.n + "</span></div>";
    return el;
  }

  function connEl(n) {
    var el = document.createElement("div");
    el.className = "conn";
    var ref = S[n.ref] || {};
    var name = ref.code || shortId(n.ref);
    var isExit = n.dir === "exit";
    el.innerHTML = '<div class="conn-in ' + (isExit ? "out" : "in") + '"><b>' +
      (isExit ? "→ " : "← ") + "balíček " + esc(n.deck) + "</b>" + esc(name) +
      '<br><span style="opacity:.75">' + esc(n.ref) + "</span></div>";
    return el;
  }

  function dummyEl() {
    var el = document.createElement("div");
    el.className = "slot dummy";
    el.style.width = DUMMY_W + "px";
    el.style.height = "1px";
    return el;
  }

  function nodeInner(n) {
    if (n.kind === "card") return mode === "story" ? cardEl(S[n.id]) : logicEl(S[n.id]);
    if (n.kind === "dec") return decEl(n);
    if (n.kind === "conn") return connEl(n);
    return null;
  }

  // ---------------------------------------------------------- edges

  function svgEl(name) { return document.createElementNS("http://www.w3.org/2000/svg", name); }

  function defs(svg) {
    var d = svgEl("defs");
    [["ar", "var(--ink-soft)"], ["ar-c", "var(--cond)"]].forEach(function (p) {
      var m = svgEl("marker");
      m.setAttribute("id", p[0]);
      m.setAttribute("markerWidth", "8"); m.setAttribute("markerHeight", "8");
      m.setAttribute("refX", "6.5"); m.setAttribute("refY", "3.5");
      m.setAttribute("orient", "auto");
      var pa = svgEl("path");
      pa.setAttribute("d", "M0,0 L7,3.5 L0,7 Z");
      pa.setAttribute("fill", p[1]);
      m.appendChild(pa); d.appendChild(m);
    });
    svg.appendChild(d);
  }

  /* Labels live in the horizontal band between two layers — that is the only
     place with free space, since columns are only GAP_X apart. Inside a band
     they are packed into as many sub-rows as needed, near their preferred x.
     Returns the height each band actually needs, so the caller can widen the
     row gap and lay out again. */
  var LBL_PAD = 6, LBL_VGAP = 3, LBL_HGAP = 6;

  function packBands(bands, canvasW) {
    var need = {};
    Object.keys(bands).forEach(function (key) {
      var band = bands[key];
      var items = band.items.slice().sort(function (p, q) { return p.x - q.x; });
      var subrows = [];
      items.forEach(function (it) {
        var half = it.w / 2;
        var x = Math.min(Math.max(it.x, half + 2), Math.max(canvasW - half - 2, half + 2));
        var l = x - half, r = x + half;
        var row = 0;
        for (;;) {
          if (!subrows[row]) { subrows[row] = []; }
          var clash = false;
          for (var i = 0; i < subrows[row].length; i++) {
            var o = subrows[row][i];
            if (l < o.r + LBL_HGAP && o.l - LBL_HGAP < r) { clash = true; break; }
          }
          if (!clash) { subrows[row].push({ l: l, r: r }); break; }
          row++;
          if (row > 40) { subrows[row] = [{ l: l, r: r }]; break; }
        }
        it.row = row;
        it.px = l;
      });

      var rowH = items.length ? Math.max.apply(null, items.map(function (i) { return i.h; })) : 0;
      var total = subrows.length ? LBL_PAD * 2 + subrows.length * rowH + (subrows.length - 1) * LBL_VGAP : 0;
      need[key] = total;

      var avail = band.bottom - band.top;
      var startY = band.top + Math.max(LBL_PAD, (avail - (total - LBL_PAD * 2)) / 2);
      items.forEach(function (it) {
        it.el.style.left = Math.round(it.px) + "px";
        it.el.style.top = Math.round(startY + it.row * (rowH + LBL_VGAP)) + "px";
      });
    });
    return need;
  }

  function draw(view) {
    var canvas = view.canvas, svg = view.svg, labels = view.labels;
    var cr = canvas.getBoundingClientRect();

    function box(id) {
      var el = canvas.querySelector('[data-n="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
      if (!el) return null;
      var r = el.getBoundingClientRect();
      return { x: r.left - cr.left, y: r.top - cr.top, w: r.width, h: r.height };
    }

    while (svg.firstChild) svg.removeChild(svg.firstChild);
    labels.textContent = "";

    var W = canvas.scrollWidth, H = canvas.scrollHeight;
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    defs(svg);

    // row geometry: the band between row L and row L+1 is the only free space
    var rowRects = view.rows.map(function (row) {
      var r = row.getBoundingClientRect();
      return { top: r.top - cr.top, bottom: r.bottom - cr.top };
    });

    var bands = {};
    function bandFor(lv) {
      if (lv < 0 || lv + 1 >= rowRects.length) return null;
      if (!bands[lv]) {
        bands[lv] = { top: rowRects[lv].bottom, bottom: rowRects[lv + 1].top, items: [] };
      }
      return bands[lv];
    }

    view.g.edges.forEach(function (e) {
      var a = box(e.from), b = box(e.to);
      if (!a || !b) return;
      var isCond = !!(e.label && e.label.cond);
      var x1 = a.x + a.w / 2, y1 = a.y + a.h;
      var x2 = b.x + b.w / 2, y2 = b.y;
      var dy = Math.max(18, (y2 - y1) / 2);
      var d = "M" + x1 + "," + y1 + " C" + x1 + "," + (y1 + dy) + " " + x2 + "," + (y2 - dy) + " " + x2 + "," + y2;
      var p = svgEl("path");
      p.setAttribute("d", d);
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", isCond ? "var(--cond)" : "var(--ink-soft)");
      p.setAttribute("stroke-width", "1.6");
      if (isCond) p.setAttribute("stroke-dasharray", "5 3");
      var targetIsDummy = view.g.nodes[e.to] && view.g.nodes[e.to].kind === "dummy";
      if (!targetIsDummy) p.setAttribute("marker-end", "url(#" + (isCond ? "ar-c" : "ar") + ")");
      svg.appendChild(p);

      if (e.label && (e.label.text || e.label.icon)) {
        var band = bandFor(view.L[e.from]);
        if (!band) return;
        var el = document.createElement("div");
        el.className = "elabel" + (isCond ? " is-cond" : "");
        var glyph = ICONS[e.label.icon] || "";
        var full = e.label.text || "";
        var cap = mode === "logic" ? 44 : 100;
        var txt = full.length > cap ? full.slice(0, cap - 1).trim() + "…" : full;
        if (txt !== full) el.title = full;   // full wording also lives in the scene table
        el.innerHTML = esc((glyph ? glyph + " " : "") + txt) +
          (e.label.cond ? '<span class="cnd">' + esc(e.label.cond) + "</span>" : "");
        el.style.maxWidth = (mode === "logic" ? 160 : 210) + "px";
        labels.appendChild(el);
        var lr = el.getBoundingClientRect();
        band.items.push({ el: el, w: lr.width, h: lr.height, x: (x1 + x2) / 2 });
      }
    });

    var need = packBands(bands, W);

    // if a band could not fit its labels, widen that row gap and lay out again
    if (view.pass < 3) {
      var grew = false;
      Object.keys(need).forEach(function (key) {
        var lv = Number(key);
        var have = bands[lv].bottom - bands[lv].top;
        if (need[key] > have + 1) {
          var cur = parseFloat(view.rows[lv].style.marginBottom) || 0;
          view.rows[lv].style.marginBottom = Math.ceil(cur + (need[key] - have) + 8) + "px";
          grew = true;
        }
      });
      if (grew) {
        view.pass++;
        draw(view);
        return;
      }
    }
    view.pass = 0;
  }

  // ---------------------------------------------------------- render deck

  var views = {};

  function renderDeck(deck, host) {
    host.textContent = "";
    var g = buildGraph(deck);
    var ids = Object.keys(g.nodes);
    var L = layer(ids, g.edges);
    addDummies(g, L);
    var ord = order(g, L);

    var canvas = document.createElement("div");
    canvas.className = "canvas";

    var nodeW = mode === "story" ? CARD_W : LOGIC_W;
    var rows = [];
    for (var lv = 0; lv <= ord.maxLayer; lv++) {
      var row = document.createElement("div");
      row.className = "row";
      row.style.gap = GAP_X + "px";
      row.style.marginBottom = (lv === ord.maxLayer ? 8 : ROW_GAP[mode]) + "px";
      rows.push(row);
      (ord.byLayer[lv] || []).forEach(function (id) {
        var n = g.nodes[id];
        var slot = document.createElement("div");
        slot.className = "slot";
        slot.setAttribute("data-n", id);
        if (n.kind === "dummy") {
          slot.style.width = DUMMY_W + "px";
        } else if (n.kind === "card") {
          slot.style.width = nodeW + "px";
        } else {
          slot.style.width = (n.w || 120) + "px";
        }
        var inner = nodeInner(n);
        if (inner) slot.appendChild(inner);
        row.appendChild(slot);
      });
      canvas.appendChild(row);
    }

    var svg = svgEl("svg");
    svg.setAttribute("class", "edges");
    canvas.appendChild(svg);
    var labels = document.createElement("div");
    labels.className = "labels";
    canvas.appendChild(labels);

    host.appendChild(canvas);

    var view = { g: g, L: L, rows: rows, canvas: canvas, svg: svg, labels: labels, deck: deck, host: host, pass: 0 };
    views[deck] = view;
    requestAnimationFrame(function () { draw(view); });
  }

  function renderGallery(deck, host) {
    host.textContent = "";
    var wrap = document.createElement("div");
    wrap.className = "gallery";
    Object.keys(S).filter(function (id) { return S[id].deck === deck; }).sort()
      .forEach(function (id) { wrap.appendChild(cardEl(S[id])); });
    host.appendChild(wrap);
  }

  function paint(details, force) {
    var deck = details.getAttribute("data-deck");
    var kind = details.getAttribute("data-kind") || "flow";
    var host = details.querySelector(".scroller");
    if (!details.open) return;
    if (host.dataset.mode === mode && !force) return;
    host.dataset.mode = mode;
    if (kind === "gallery") renderGallery(deck, host);
    else renderDeck(deck, host);
  }

  // ---------------------------------------------------------- spec table

  function buildTable() {
    var tb = document.getElementById("specbody");
    var rows = Object.keys(S).sort(function (a, b) {
      var sa = S[a], sb = S[b];
      if (sa.deck !== sb.deck) return sa.deck.localeCompare(sb.deck);
      return (sa.code || sa.id).localeCompare(sb.code || sb.id);
    });
    var html = "";
    rows.forEach(function (id) {
      var sc = S[id];
      var live = (sc.choices || []).filter(function (c) { return c.goto; });
      var tgts = live.map(function (c) {
        var cond = condText(c.disableIf);
        return '<span class="tgtline"><span class="arrow">' + (ICONS[c.icon] || "→") + " </span>" +
          '<span class="mono">' + esc(c.goto) + "</span>" +
          (cond ? ' <span class="b cond">' + esc(cond) + "</span>" : "") +
          (c.text ? '<span class="ctext">' + esc(c.text) + "</span>" : "") + "</span>";
      }).join("") || '<span class="arrow">—</span>';
      var fx = (sc.effects || []).map(function (ef) {
        return ef.type === "reputation"
          ? '<span class="b ' + (ef.value >= 0 ? "rep-pos" : "rep-neg") + '">rep ' + (ef.value > 0 ? "+" : "") + ef.value + "</span>"
          : '<span class="b toast">toast</span>';
      }).join(" ") || "";
      var flags = "";
      if (id === DATA.trueStart) flags += '<span class="b start">vstup</span> ';
      if (id === DATA.declaredStart) flags += '<span class="b appstart">startScene</span> ';
      if (!sc.reachable) flags += '<span class="b unreach">mimo linku</span> ';
      if (!live.length) flags += '<span class="b term">bez východu</span> ';
      if (sc.todo) flags += '<span class="b todo">todo</span> ';

      var hay = (id + " " + (sc.code || "") + " " + sc.deck + " " + (sc.todo ? "todo " : "") +
        (sc.reachable ? "" : "unreachable mimo ") + (live.length ? "" : "terminal ") +
        live.map(function (c) {
          return c.goto + " " + (c.text || "") + (c.disableIf ? " cond podminka" : "");
        }).join(" ") + " " + (sc.text || "")).toLowerCase();

      html += '<tr data-hay="' + esc(hay) + '"' + (sc.reachable ? "" : ' class="dim"') + ">" +
        '<td class="mono">' + esc(id) + "</td>" +
        '<td class="mono">' + esc(sc.code || "—") + "</td>" +
        "<td>" + esc(sc.deck) + "</td>" +
        '<td class="num">' + sc.inbound.length + "</td>" +
        '<td class="tgt">' + tgts + "</td>" +
        "<td>" + fx + "</td>" +
        "<td>" + flags + "</td>" +
        "</tr>";
    });
    tb.innerHTML = html;
    updateCount();
  }

  function updateCount() {
    var all = document.querySelectorAll("#specbody tr");
    var vis = 0;
    all.forEach(function (tr) { if (tr.style.display !== "none") vis++; });
    var el = document.getElementById("speccount");
    if (el) el.textContent = vis + " / " + all.length + " scén";
  }

  function applyFilter(q) {
    q = (q || "").trim().toLowerCase();
    document.querySelectorAll("#specbody tr").forEach(function (tr) {
      tr.style.display = (!q || tr.getAttribute("data-hay").indexOf(q) !== -1) ? "" : "none";
    });
    updateCount();
  }

  // ---------------------------------------------------------- boot

  document.addEventListener("DOMContentLoaded", function () {
    var folios = Array.prototype.slice.call(document.querySelectorAll("details.folio"));

    folios.forEach(function (d) {
      d.addEventListener("toggle", function () { paint(d); });
    });

    document.querySelectorAll("[data-mode]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = btn.getAttribute("data-mode");
        if (next === mode) return;
        mode = next;
        document.querySelectorAll("[data-mode]").forEach(function (b) {
          b.setAttribute("aria-pressed", String(b.getAttribute("data-mode") === mode));
        });
        folios.forEach(function (d) { if (d.open) paint(d, true); });
      });
    });

    var expandBtn = document.getElementById("expandall");
    if (expandBtn) {
      expandBtn.addEventListener("click", function () {
        var anyClosed = folios.some(function (d) { return !d.open; });
        folios.forEach(function (d) {
          d.open = anyClosed;
          if (anyClosed) paint(d);
        });
        expandBtn.textContent = anyClosed ? "Sbalit vše" : "Rozbalit vše";
      });
    }

    var fi = document.getElementById("specfilter");
    if (fi) fi.addEventListener("input", function () { applyFilter(fi.value); });

    buildTable();
    folios.forEach(function (d) { if (d.open) paint(d); });

    var bar = document.querySelector(".toolbar");
    function syncBarHeight() {
      if (bar) document.documentElement.style.setProperty("--tbh", bar.offsetHeight + "px");
    }
    syncBarHeight();
    window.addEventListener("resize", syncBarHeight);

    var t = null;
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        Object.keys(views).forEach(function (k) {
          var v = views[k];
          if (v.host.isConnected && v.host.closest("details").open) draw(v);
        });
      }, 160);
    });
  });
})();
