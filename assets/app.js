/* PS5 Jailbreak News dashboard — client-side rendering.
   Fetches dashboard_data.json and renders category-filterable cards.
   Sanitizes all scraped strings before insertion (defense against any
   malicious content that slipped through server-side filtering). */

(function () {
  "use strict";

  const CATEGORY_ORDER = ["All", "Tools", "Apps", "Games", "FW Updates", "News"];
  let allPosts = [];
  let activeCategory = "All";

  const $ = (id) => document.getElementById(id);

  /** Escape text for safe insertion into HTML. */
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /** Only allow http(s) links; otherwise return "#". */
  function safeUrl(url) {
    try {
      const u = new URL(url, window.location.href);
      if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    } catch (_) { /* fall through */ }
    return "#";
  }

  function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function render() {
    const feed = $("feed");
    const posts = activeCategory === "All"
      ? allPosts
      : allPosts.filter((p) => p.category === activeCategory);

    feed.innerHTML = "";
    if (!posts.length) {
      $("empty-state").hidden = false;
      return;
    }
    $("empty-state").hidden = true;

    const frag = document.createDocumentFragment();
    posts.forEach((p) => frag.appendChild(card(p)));
    feed.appendChild(frag);
  }

  function card(p) {
    const el = document.createElement("article");
    el.className = "card" + (p.thumbnail ? "" : " no-thumb");

    const cat = esc(p.category || "News");
    const src = esc((p.source || "").toUpperCase());
    const title = esc(p.title || "Untitled");
    const summary = esc(p.summary || "");
    const author = esc(p.author || "");
    const link = safeUrl(p.link);
    const date = fmtDate(p.timestamp);

    let thumbHtml = "";
    if (p.thumbnail) {
      thumbHtml =
        '<img class="thumb" loading="lazy" alt="" src="' + safeUrl(p.thumbnail) + '" />';
    }

    const highlights = Array.isArray(p.highlights) ? p.highlights.filter(Boolean) : [];
    let highlightsHtml = "";
    if (highlights.length) {
      highlightsHtml =
        '<ul class="highlights">' +
        highlights.map((h) => "<li>" + esc(h) + "</li>").join("") +
        "</ul>";
    }

    el.innerHTML =
      thumbHtml +
      '<div class="card-body">' +
        '<div class="card-meta">' +
          '<span class="badge" data-cat="' + cat + '">' + cat + "</span>" +
          '<span class="source-pill">' + src + "</span>" +
          (date ? '<span class="byline">' + date + "</span>" : "") +
        "</div>" +
        '<h3><a href="' + link + '" target="_blank" rel="noopener">' + title + "</a></h3>" +
        (summary ? '<p class="summary">' + (highlights.length ? "<b>TL;DR:</b> " : "") + summary + "</p>" : "") +
        highlightsHtml +
        (author ? '<p class="byline">' + author + "</p>" : "") +
      "</div>";

    // Apply category color to badge (class-based to match CSS).
    const badge = el.querySelector(".badge");
    if (badge) badge.classList.add((p.category || "News").replace(/\s+/g, "."));
    return el;
  }

  function buildTabs() {
    const tabs = $("tabs");
    tabs.innerHTML = "";
    CATEGORY_ORDER.forEach((cat) => {
      const count = cat === "All"
        ? allPosts.length
        : allPosts.filter((p) => p.category === cat).length;
      if (cat !== "All" && count === 0) return; // hide empty categories

      const btn = document.createElement("button");
      btn.className = "tab" + (cat === activeCategory ? " active" : "");
      btn.innerHTML = esc(cat) + '<span class="count">' + count + "</span>";
      btn.addEventListener("click", () => {
        activeCategory = cat;
        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
        btn.classList.add("active");
        render();
      });
      tabs.appendChild(btn);
    });
  }

  async function load() {
    try {
      const resp = await fetch("dashboard_data.json?_=" + Date.now());
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();

      allPosts = Array.isArray(data.posts) ? data.posts : [];
      $("last-updated").textContent = data.last_updated
        ? "Updated: " + data.last_updated
        : "";

      if (data.ai_overview) {
        $("ai-overview").textContent = data.ai_overview;
        $("overview-section").hidden = false;
      }

      buildTabs();
      render();
    } catch (err) {
      $("error-state").hidden = false;
      $("error-state").textContent =
        "Could not load dashboard data (" + err.message + ").";
      console.error(err);
    }
  }

  document.addEventListener("DOMContentLoaded", load);
})();
