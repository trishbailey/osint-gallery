(function () {
  var DRIVE_ID = /^[A-Za-z0-9_-]{10,}$/;
  var lastTrigger = null;

  var grid = document.getElementById("tool-grid");
  var dialog = document.getElementById("preview-dialog");
  var frame = document.getElementById("preview-frame");
  var title = document.getElementById("preview-title");
  var closeBtn = document.getElementById("preview-close");

  function safeDriveId(value) {
    var id = String(value || "").trim();
    return DRIVE_ID.test(id) ? id : "";
  }

  function canEnter(tool) {
    if (!tool || tool.status !== "live") return false;
    var raw = String(tool.enterUrl || "").trim();
    if (!raw || /REPLACE/i.test(raw)) return false;
    try {
      var url = new URL(raw);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch (err) {
      return false;
    }
  }

  function statusLabel(tool, enterOk) {
    if (tool.status === "soon") return "Coming soon";
    if (tool.status === "preview-soon") return "Preview soon";
    if (!enterOk) return "Link pending";
    return "Live";
  }

  function initials(name) {
    var parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "•";
    return parts
      .slice(0, 2)
      .map(function (part) {
        return part.charAt(0).toUpperCase();
      })
      .join("");
  }

  function setText(id, value, fallback) {
    var node = document.getElementById(id);
    if (!node) return;
    var next = String(value || "").trim();
    if (next) node.textContent = next;
    else if (fallback) node.textContent = fallback;
  }

  function paintName(name) {
    var heading = document.getElementById("site-name");
    if (!heading) return;
    var safe = String(name || "Beacon OSINT Tools").trim() || "Beacon OSINT Tools";
    var initial = safe.charAt(0);
    var rest = safe.slice(1);
    heading.replaceChildren();
    var beam = document.createElement("span");
    beam.className = "beam";
    beam.setAttribute("aria-hidden", "true");
    var nameEl = document.createElement("span");
    nameEl.className = "name";
    var first = document.createElement("span");
    first.className = "first";
    first.textContent = initial;
    var arc = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    arc.setAttribute("class", "arc");
    arc.setAttribute("viewBox", "0 0 48 48");
    arc.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M36.3 13.7A16 16 0 1 0 36.3 34.3");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "3");
    path.setAttribute("stroke-linecap", "round");
    arc.appendChild(path);
    first.prepend(arc);
    nameEl.append(first, document.createTextNode(rest));
    heading.append(beam, nameEl);
    document.title = safe;
  }

  function iconNode(tool) {
    var wrap = document.createElement("div");
    wrap.className = "icon-wrap";
    var src = String(tool.icon || "").trim();
    if (!src) {
      var mono = document.createElement("span");
      mono.className = "monogram";
      mono.textContent = initials(tool.name);
      mono.setAttribute("aria-hidden", "true");
      wrap.appendChild(mono);
      return wrap;
    }
    var img = document.createElement("img");
    img.src = src;
    img.width = 48;
    img.height = 48;
    img.alt = "";
    img.addEventListener("error", function () {
      img.remove();
      var mono = document.createElement("span");
      mono.className = "monogram";
      mono.textContent = initials(tool.name);
      mono.setAttribute("aria-hidden", "true");
      wrap.appendChild(mono);
    });
    wrap.appendChild(img);
    return wrap;
  }

  function enterControl(tool, enterOk) {
    if (enterOk) {
      var link = document.createElement("a");
      link.className = "button button-primary";
      link.href = tool.enterUrl;
      link.textContent = "Enter";
      return link;
    }
    var button = document.createElement("button");
    button.type = "button";
    button.className = "button button-primary";
    button.disabled = true;
    button.textContent = "Enter";
    button.setAttribute(
      "aria-label",
      tool.status === "live"
        ? "Enter unavailable until a live URL is set"
        : "Enter unavailable",
    );
    return button;
  }

  function previewControl(tool) {
    var driveId = safeDriveId(tool.previewDriveId);
    if (!driveId) return null;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "button button-ghost";
    button.textContent = "Preview";
    button.addEventListener("click", function () {
      openPreview(tool, driveId, button);
    });
    return button;
  }

  function renderTool(tool) {
    var enterOk = canEnter(tool);
    var article = document.createElement("article");
    article.className = "tile";
    var heading = document.createElement("h2");
    heading.textContent = tool.name || "Untitled tool";
    var blurb = document.createElement("p");
    blurb.className = "blurb";
    blurb.textContent = tool.blurb || "";
    var status = document.createElement("p");
    status.className = "status";
    status.textContent = statusLabel(tool, enterOk);
    var foot = document.createElement("div");
    foot.className = "tile-foot";
    var actions = document.createElement("div");
    actions.className = "actions";
    actions.appendChild(enterControl(tool, enterOk));
    var preview = previewControl(tool);
    if (preview) actions.appendChild(preview);
    foot.appendChild(actions);
    article.append(iconNode(tool), heading, blurb, status, foot);
    return article;
  }

  function renderTools(tools) {
    grid.replaceChildren();
    if (!tools.length) {
      var empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No tools listed yet.";
      grid.appendChild(empty);
      return;
    }
    tools.forEach(function (tool) {
      grid.appendChild(renderTool(tool));
    });
  }

  function focusables() {
    return Array.prototype.slice
      .call(dialog.querySelectorAll("button, a[href], iframe, [tabindex]"))
      .filter(function (el) {
        return !el.disabled && el.getAttribute("tabindex") !== "-1";
      });
  }

  function openPreview(tool, driveId, trigger) {
    lastTrigger = trigger;
    title.textContent = "Preview of " + (tool.name || "tool");
    frame.replaceChildren();
    var iframe = document.createElement("iframe");
    iframe.src =
      "https://drive.google.com/file/d/" + encodeURIComponent(driveId) + "/preview";
    iframe.title = "Preview of " + (tool.name || "tool");
    iframe.setAttribute("allow", "autoplay");
    iframe.allowFullscreen = true;
    iframe.tabIndex = -1;
    frame.appendChild(iframe);
    if (!dialog.open) dialog.showModal();
    closeBtn.focus();
  }

  function closePreview() {
    if (dialog.open) dialog.close();
  }

  closeBtn.addEventListener("click", closePreview);

  dialog.addEventListener("close", function () {
    frame.replaceChildren();
    if (lastTrigger) lastTrigger.focus();
  });

  dialog.addEventListener("keydown", function (event) {
    if (event.key !== "Tab" || !dialog.open) return;
    var items = focusables();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  fetch("/tools.json", { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error("tools.json did not load");
      return res.json();
    })
    .then(function (data) {
      var site = data.site || {};
      setText("site-eyebrow", site.eyebrow, "OSINT workspace");
      paintName(site.name);
      setText(
        "site-lede",
        site.tagline,
        "Spotlight tools to focus narrowly and deeply on selected target accounts.",
      );
      setText("site-owner", site.owner, "Beacon Intelligence Group");
      renderTools(Array.isArray(data.tools) ? data.tools : []);
    })
    .catch(function () {
      grid.replaceChildren();
      var fail = document.createElement("p");
      fail.className = "empty";
      fail.textContent = "The tool list could not be loaded.";
      grid.appendChild(fail);
    });
})();
