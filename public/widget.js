/*!
 * SupportPilot chat widget
 * Usage: <script src="https://YOUR-APP/widget.js" data-bot-id="BOT_ID" defer></script>
 * Optional attributes: data-position="left|right", data-open="true"
 * JS API: window.SupportPilot.open() / .close() / .toggle()
 */
(function () {
  "use strict";
  if (window.SupportPilot) return;

  var script =
    document.currentScript ||
    document.querySelector('script[src*="widget.js"][data-bot-id]');
  if (!script) return;

  var botId = script.getAttribute("data-bot-id");
  if (!botId) return console.warn("[SupportPilot] Missing data-bot-id attribute.");

  var origin = new URL(script.src).origin;
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";
  var isOpen = false;
  var color = "#4f46e5";

  var css =
    ".sp-launcher{position:fixed;bottom:20px;" + side + ":20px;z-index:2147483646;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;" +
    "box-shadow:0 8px 24px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;transition:transform .2s ease;color:#fff}" +
    ".sp-launcher:hover{transform:scale(1.06)}.sp-launcher svg{width:26px;height:26px}" +
    ".sp-frame-wrap{position:fixed;bottom:88px;" + side + ":20px;z-index:2147483647;width:400px;height:640px;max-height:calc(100vh - 110px);" +
    "border-radius:18px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.22);opacity:0;transform:translateY(12px) scale(.98);" +
    "pointer-events:none;transition:opacity .2s ease,transform .2s ease;background:#fff}" +
    ".sp-frame-wrap.sp-open{opacity:1;transform:none;pointer-events:auto}" +
    ".sp-frame-wrap iframe{width:100%;height:100%;border:0}" +
    ".sp-badge{position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid #fff}" +
    "@media (max-width:480px){.sp-frame-wrap{inset:0;width:100%;height:100%;max-height:none;border-radius:0}" +
    ".sp-frame-wrap.sp-open + .sp-launcher{display:none}}";

  var chatIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 1 1 21 11.5z"/></svg>';
  var closeIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function init() {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var wrap = document.createElement("div");
    wrap.className = "sp-frame-wrap";
    wrap.setAttribute("aria-hidden", "true");

    var launcher = document.createElement("button");
    launcher.className = "sp-launcher";
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open chat");
    launcher.style.background = color;
    launcher.innerHTML = chatIcon + '<span class="sp-badge"></span>';

    var iframe = null;
    function ensureIframe() {
      if (iframe) return;
      iframe = document.createElement("iframe");
      iframe.title = "Support chat";
      iframe.allow = "clipboard-write";
      iframe.src = origin + "/embed/" + encodeURIComponent(botId) + "?page=" + encodeURIComponent(location.href);
      wrap.appendChild(iframe);
    }

    function setOpen(open) {
      isOpen = open;
      if (open) ensureIframe();
      wrap.classList.toggle("sp-open", open);
      wrap.setAttribute("aria-hidden", String(!open));
      launcher.innerHTML = open ? closeIcon : chatIcon;
      launcher.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    }

    launcher.addEventListener("click", function () {
      setOpen(!isOpen);
    });
    window.addEventListener("message", function (e) {
      if (e.origin === origin && e.data && e.data.type === "supportpilot:close") setOpen(false);
    });

    document.body.appendChild(wrap);
    document.body.appendChild(launcher);

    // Pick up the bot's brand colour.
    fetch(origin + "/api/widget/" + encodeURIComponent(botId))
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (cfg) {
        if (cfg && cfg.brandColor) launcher.style.background = cfg.brandColor;
      })
      .catch(function () {});

    window.SupportPilot = {
      open: function () {
        setOpen(true);
      },
      close: function () {
        setOpen(false);
      },
      toggle: function () {
        setOpen(!isOpen);
      },
    };

    if (script.getAttribute("data-open") === "true") setOpen(true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
