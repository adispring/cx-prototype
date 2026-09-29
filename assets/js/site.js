/* HiMakers · 全站公共脚本 */
(function () {
  "use strict";

  /* ---------- 导航滚动态 ---------- */
  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 移动端菜单 ---------- */
  var burger = document.querySelector(".nav-burger");
  var mobileMenu = document.querySelector(".mobile-menu");
  if (burger && mobileMenu) {
    burger.addEventListener("click", function () {
      mobileMenu.classList.toggle("open");
      burger.classList.toggle("open");
    });
    mobileMenu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { mobileMenu.classList.remove("open"); });
    });
  }

  /* ---------- 滚动进入动效 ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- 数字滚动 ---------- */
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; cio.unobserve(el);
        var target = parseFloat(el.getAttribute("data-count"));
        var decimals = (el.getAttribute("data-count").split(".")[1] || "").length;
        var suffix = el.getAttribute("data-suffix") || "";
        var dur = 1400, t0 = null;
        var step = function (t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / dur, 1);
          p = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * p).toFixed(decimals) + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- Toast ---------- */
  window.toast = function (msg) {
    var wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    var t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = '<svg class="t-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' + msg;
    wrap.appendChild(t);
    setTimeout(function () {
      t.style.transition = "opacity .3s ease, transform .3s ease";
      t.style.opacity = "0"; t.style.transform = "translateY(8px)";
      setTimeout(function () { t.remove(); }, 320);
    }, 2200);
  };

  /* ---------- 覆盖层 / 抽屉 / 弹窗 ---------- */
  window.openLayer = function (id) {
    var overlay = document.getElementById("overlay");
    var layer = document.getElementById(id);
    if (overlay) overlay.classList.add("show");
    if (layer) layer.classList.add("show");
    document.body.style.overflow = "hidden";
  };
  window.closeLayers = function () {
    document.querySelectorAll(".drawer.show, .modal.show").forEach(function (el) { el.classList.remove("show"); });
    var overlay = document.getElementById("overlay");
    if (overlay) overlay.classList.remove("show");
    document.body.style.overflow = "";
  };
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) window.closeLayers();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") window.closeLayers(); });

  /* ---------- 购物车（多通道持久化 · 独立购物车页） ----------
     注意：HTML 预览容器是 sandbox iframe（未给 allow-same-origin），页面里读写 localStorage
     会抛 SecurityError。因此这里做三级兜底：URL 负载(#hm=) → window.name → localStorage，
     保证「加入购物车 → 购物车页 → 结算页」的数据在预览里也能带过去。 */
  var CART_KEY = "himakers_cart_v1";
  var BUYNOW_KEY = "himakers_buynow";
  var ORDERS_KEY = "himakers_orders_v1";
  var ADDR_KEY = "himakers_addr_v1";
  /* 一处大对象承载全部持久化数据，window.name / URL 负载都按它整体搬运 */
  var BOX = { cart: [], buynow: [], orders: null, addr: null, misc: {} };
  var cart = BOX.cart;
  var buynow = BOX.buynow;
  var SLOT = {};
  SLOT[CART_KEY] = "cart"; SLOT[BUYNOW_KEY] = "buynow";
  SLOT[ORDERS_KEY] = "orders"; SLOT[ADDR_KEY] = "addr";

  function b64e(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/=+$/, "");
  }
  function b64d(b) {
    var bin = atob(b + "===".slice((b.length + 3) % 4));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function hashPayload() {
    var mt = /[#&]hm=([^&]+)/.exec(location.hash || "");
    if (!mt) return null;
    try { return JSON.parse(b64d(mt[1])); } catch (e) { return null; }
  }
  function namePayload() {
    if (typeof window.name !== "string" || window.name.indexOf("hm:") !== 0) return null;
    try { return JSON.parse(window.name.slice(3)); } catch (e) { return null; }
  }
  function lsGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; }
  }
  function persist() {
    BOX.cart = cart; BOX.buynow = buynow;
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    try { localStorage.setItem(BUYNOW_KEY, JSON.stringify(buynow)); } catch (e) {}
    try { window.name = "hm:" + JSON.stringify(BOX); } catch (e) {}
  }
  /* 通用读写：orders.js 的订单/地址数据、个人中心模块的各类偏好也走这条通道。
     非 SLOT 键统一收进 BOX.misc，这样 window.name 搬运时不会丢。 */
  window.hmBoxGet = function (key, fallback) {
    var slot = SLOT[key];
    if (!slot) {
      if (BOX.misc && Object.prototype.hasOwnProperty.call(BOX.misc, key)) return BOX.misc[key];
      var raw = lsGet(key);
      return raw === null ? fallback : raw;
    }
    if (BOX[slot] !== null && BOX[slot] !== undefined) return BOX[slot];
    var v = lsGet(key);
    return v === null ? fallback : v;
  };
  window.hmBoxSet = function (key, val) {
    var slot = SLOT[key];
    if (slot) BOX[slot] = val;
    else { if (!BOX.misc) BOX.misc = {}; BOX.misc[key] = val; }
    BOX.cart = cart; BOX.buynow = buynow;
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    try { window.name = "hm:" + JSON.stringify(BOX); } catch (e) {}
  };
  /* 把当前数据挂到目标地址上，跨页面（含 sandbox 预览）携带 */
  window.hmHref = function (href) {
    BOX.cart = cart; BOX.buynow = buynow;
    if (!cart.length && !buynow.length && !BOX.orders) return href;
    return href.split("#")[0] + "#hm=" + b64e(JSON.stringify(BOX));
  };
  window.hmBuyNow = function () { return buynow.slice(); };
  window.hmSetBuyNow = function (items) { buynow = items || []; BOX.buynow = buynow; persist(); };
  window.hmGoCart = function () { location.href = window.hmHref("cart.html"); };

  /* 水合：URL 负载 > window.name > localStorage */
  (function hydrate() {
    var p = hashPayload() || namePayload();
    if (p && (p.cart || p.buynow || p.orders || p.addr || p.misc)) {
      BOX.orders = p.orders || null;
      BOX.addr = p.addr || null;
      if (p.misc) BOX.misc = p.misc;
      cart = BOX.cart = p.cart || [];
      buynow = BOX.buynow = p.buynow || [];
    } else {
      cart = BOX.cart = lsGet(CART_KEY) || [];
      buynow = BOX.buynow = lsGet(BUYNOW_KEY) || [];
    }
    if (Object.prototype.toString.call(cart) !== "[object Array]") cart = BOX.cart = [];
    if (Object.prototype.toString.call(buynow) !== "[object Array]") buynow = BOX.buynow = [];
    cart.forEach(function (it) { if (!it.qty) it.qty = 1; if (!it.parts || !it.parts.length) it.parts = []; });
    persist();
  })();
  function saveCart() { persist(); }
  /* 页面里指向购物车 / 结算的链接，统一带上数据负载 */
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var h = a.getAttribute("href") || "";
    if (/^(\.\.?\/)?(cart|checkout)\.html([?#]|$)/.test(h)) {
      var to = window.hmHref(h);
      if (to !== h) { e.preventDefault(); location.href = to; }
    }
  });
  function syncBadge() {
    var n = cart.reduce(function (s, it) { return s + (it.qty || 1); }, 0);
    document.querySelectorAll(".cart-count").forEach(function (b) {
      b.textContent = n > 99 ? "99+" : n;
      b.classList.toggle("show", n > 0);
    });
  }
  /* 随行配件 / 耗材：挂在主品行上的 parts 数组，购物车里以小图 + 名称 + 价格
     逐行展开在主品下方（自由组合、整机套装等「一行 = 一套」的加购都走这里）。 */
  function normParts(list) {
    return (list || []).filter(function (p) { return p && p.name; }).map(function (p) {
      return { name: p.name, spec: p.spec || "", img: p.img || "", price: p.price || 0, qty: p.qty || 1 };
    });
  }
  function normItem(item) {
    return {
      name: item.name, spec: item.spec || "", price: item.price || 0,
      img: item.img || "", qty: item.qty || 1, parts: normParts(item.parts)
    };
  }
  function mergeParts(hit, list) {
    var parts = normParts(list);
    if (!parts.length) return;
    if (!hit.parts) hit.parts = [];
    parts.forEach(function (p) {
      var f = hit.parts.filter(function (x) { return x.name === p.name; })[0];
      if (f) f.qty = (f.qty || 1) + (p.qty || 1);
      else hit.parts.push(p);
    });
  }
  window.Cart = {
    all: function () { return cart.slice(); },
    count: function () { return cart.reduce(function (s, it) { return s + (it.qty || 1); }, 0); },
    total: function () { return cart.reduce(function (s, it) { return s + (it.price || 0) * (it.qty || 1); }, 0); },
    add: function (item) {
      if (!item || !item.name) return;
      var hit = cart.filter(function (it) { return it.name === item.name && it.spec === item.spec; })[0];
      if (hit) { hit.qty = (hit.qty || 1) + (item.qty || 1); mergeParts(hit, item.parts); }
      else cart.push(normItem(item));
      saveCart();
      syncBadge();
      renderCart();
      if (window.renderCartPage) window.renderCartPage();
      toast("已加入购物车 · " + item.name);
    },
    /* 一次加多行（详情页：主机 + 各配件），只弹一次提示 */
    addMany: function (list) {
      list = (list || []).filter(function (it) { return it && it.name; });
      if (!list.length) return;
      list.forEach(function (item) {
        var hit = cart.filter(function (it) { return it.name === item.name && it.spec === item.spec; })[0];
        if (hit) { hit.qty = (hit.qty || 1) + (item.qty || 1); mergeParts(hit, item.parts); }
        else cart.push(normItem(item));
      });
      saveCart();
      syncBadge();
      renderCart();
      if (window.renderCartPage) window.renderCartPage();
      toast(list.length > 1 ? ("已加入购物车 · " + list.length + " 件商品") : ("已加入购物车 · " + list[0].name));
    },
    setQty: function (i, q) {
      if (!cart[i]) return;
      if (q <= 0) cart.splice(i, 1); else cart[i].qty = q;
      saveCart(); syncBadge(); renderCart();
      if (window.renderCartPage) window.renderCartPage();
    },
    remove: function (i) { cart.splice(i, 1); saveCart(); syncBadge(); renderCart(); if (window.renderCartPage) window.renderCartPage(); },
    clear: function () { cart.length = 0; saveCart(); syncBadge(); renderCart(); if (window.renderCartPage) window.renderCartPage(); }
  };
  window.addToCart = function (item) { window.Cart.add(item); };
  window.renderCart = function () {
    syncBadge();
    var body = document.querySelector("#cartDrawer .drawer-body");
    if (!body) return;
    if (!cart.length) {
      body.innerHTML = '<div class="cart-empty"><div style="font-size:40px;margin-bottom:12px">🛒</div>购物车还是空的<br>去商城逛逛好物吧</div>';
      var footBtn = document.querySelector("#cartCheckout");
      if (footBtn) footBtn.disabled = true;
      var subtotal = document.querySelector("#cartSubtotal");
      if (subtotal) subtotal.textContent = "¥0";
      return;
    }
    body.innerHTML = cart.map(function (it, i) {
      var parts = it.parts || [];
      return '<div class="cart-item">' +
        '<img src="' + it.img + '" alt="">' +
        '<div style="flex:1;min-width:0">' +
          '<div class="ci-name">' + it.name + (it.qty > 1 ? ' ×' + it.qty : "") + '</div>' +
          '<div class="ci-spec">' + (it.spec || "") + '</div>' +
          (parts.length ? '<div class="ci-parts">' +
            '<div class="ci-parts-t">含配件与耗材 · ' + (parts.reduce(function (s, p) { return s + (p.qty || 1); }, 0) * (it.qty || 1)) + ' 件</div>' + parts.map(function (p) {
            var n = (p.qty || 1) * (it.qty || 1);
            return '<div class="ci-part" title="' + p.name + '">' +
              '<img src="' + p.img + '" alt="">' +
              '<span class="ci-part-n">' + p.name + '</span>' +
              (n > 1 ? '<span class="ci-part-q">×' + n + '</span>' : '') +
              '<span class="ci-part-pr"><span class="cur">¥</span>' + (p.price || 0).toLocaleString() + '</span>' +
            '</div>';
          }).join("") + '</div>' : '') +
          '<div class="price" style="font-size:15px;margin-top:4px"><span class="cur">¥</span>' + ((it.price || 0) * (it.qty || 1)).toLocaleString() + '</div>' +
        '</div>' +
        '<button class="x-btn" data-remove="' + i + '" title="移除">✕</button>' +
      '</div>';
    }).join("");
    var total = window.Cart.total();
    var subtotal = document.querySelector("#cartSubtotal");
    if (subtotal) subtotal.textContent = "¥" + total.toLocaleString();
    var footBtn = document.querySelector("#cartCheckout");
    if (footBtn) footBtn.disabled = false;
    body.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.Cart.remove(parseInt(btn.getAttribute("data-remove"), 10));
      });
    });
  };
  /* ---------- 消息通知中心 ---------- */
  var NOTIF_ICONS = {
    like: '<path d="M12 20.2S4.6 15.5 4.6 10.4A4.1 4.1 0 0 1 12 7.7a4.1 4.1 0 0 1 7.4 2.7c0 5.1-7.4 9.8-7.4 9.8Z"/>',
    chat: '<path d="M20.5 14.5a2 2 0 0 1-2 2H8.6L4 20.5V5.6a2 2 0 0 1 2-2h12.5a2 2 0 0 1 2 2Z"/>',
    box:  '<path d="M20.5 7.6 12 3.2 3.5 7.6v8.8L12 20.8l8.5-4.4V7.6Z"/><path d="m3.5 7.6 8.5 4.4 8.5-4.4M12 12v8.8"/>',
    gift: '<rect x="3.5" y="8" width="17" height="12.5" rx="2"/><path d="M12 8v12.5M3.5 12.2h17M12 8S10.6 3.6 8.2 3.6a2.2 2.2 0 0 0 0 4.4M12 8s1.4-4.4 3.8-4.4a2.2 2.2 0 0 1 0 4.4"/>'
  };
  var notifs = [
    { cat: "互动", ico: "like", tone: "g", t: "你的作品被收藏", d: "林一 收藏了你发布的《等高线木刻浮雕》", time: "2 分钟前", unread: true },
    { cat: "互动", ico: "chat", tone: "g", t: "收到一条新回复", d: "阿哲：这个功率参数我调了 3 次才对，附了曲线图", time: "1 小时前", unread: true },
    { cat: "订单", ico: "box",  tone: "b", t: "订单已发货", d: "HM-20418 · XCheng X1 套装，预计 9/28 送达", time: "昨天 18:20", unread: true },
    { cat: "系统", ico: "gift", tone: "o", t: "Maker Pass 即将到期", d: "会员 3 天后到期，续费立享 8 折并保留灵感额度", time: "2 天前", unread: false },
    { cat: "系统", ico: "chat", tone: "o", t: "作品入选精选", d: "你投稿的「秋日木作」已进入社区精选合集", time: "3 天前", unread: false }
  ];
  var notifFilter = "全部";
  function notifUnread() {
    return notifs.filter(function (n) { return n.unread; }).length;
  }
  function notifRender() {
    var list = document.querySelector("#notifList");
    var badge = document.querySelector(".notif-count");
    if (!list) return;
    if (badge) {
      var n = notifUnread();
      badge.textContent = n > 99 ? "99+" : n;
      badge.classList.toggle("show", n > 0);
    }
    var cnt = document.querySelector("#notifUnreadCount");
    if (cnt) cnt.textContent = notifUnread() ? notifUnread() + " 条未读" : "全部已读";
    var items = notifs.filter(function (n) { return notifFilter === "全部" || n.cat === notifFilter; });
    if (!items.length) {
      list.innerHTML = '<div class="np-empty">暂无新消息</div>';
      return;
    }
    list.innerHTML = items.map(function (n) {
      return '<div class="np-item' + (n.unread ? " unread" : "") + '" data-t="' + n.t + '">' +
        '<span class="np-ico ' + n.tone + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + NOTIF_ICONS[n.ico] + '</svg></span>' +
        '<div class="np-body">' +
          '<div class="np-t">' + n.t + (n.unread ? '<span class="np-dot"></span>' : "") + '</div>' +
          '<div class="np-d">' + n.d + '</div>' +
          '<div class="np-time">' + n.cat + " · " + n.time + '</div>' +
        '</div></div>';
    }).join("");
    list.querySelectorAll(".np-item").forEach(function (el) {
      el.addEventListener("click", function () {
        var hit = notifs.filter(function (n) { return n.t === el.getAttribute("data-t"); })[0];
        if (hit) hit.unread = false;
        notifRender();
        toast("已读 · " + el.getAttribute("data-t"));
      });
    });
  }
  /* 通知中心：幂等标记放闭包变量（DOM 属性会被预览快照冻进源码，见 buildNotif 注释） */
  var notifBound = false;
  /* 头像菜单同理 */
  var userBound = false;
  function buildNotif() {
    var actions = document.querySelector(".nav-actions");
    if (!actions) return;
    /* 有些页面的结构被「渲染快照」固化进了 HTML：这里优先复用已有标记，没有才创建，
       但**事件一定要绑**（旧写法「已存在就 return」会让通知按钮彻底点不动） */
    var wrap = actions.querySelector(".notif-wrap");
    if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "notif-wrap";
    wrap.innerHTML =
      '<button class="icon-btn" id="notifBtn" title="消息通知" aria-label="消息通知">' +
        '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M18 8.4a6 6 0 1 0-12 0c0 5.2-2 6.8-2 6.8h16s-2-1.6-2-6.8"/><path d="M13.7 19.2a2 2 0 0 1-3.4 0"/></svg>' +
        '<span class="badge-dot notif-count">0</span>' +
      '</button>' +
      '<div class="notif-panel" id="notifPanel" role="dialog" aria-label="消息通知">' +
        '<div class="np-head"><h4>通知中心<span class="np-count" id="notifUnreadCount"></span></h4>' +
          '<button class="np-mark" id="notifMarkAll">全部已读</button></div>' +
        '<div class="np-tabs">' +
          ["全部", "互动", "订单", "系统"].map(function (c, i) {
            return '<button class="np-tab' + (i === 0 ? " on" : "") + '" data-cat="' + c + '">' + c + '</button>';
          }).join("") +
        '</div>' +
        '<div class="np-list" id="notifList"></div>' +
        '<div class="np-foot"><a href="community.html">查看全部消息 →</a></div>' +
      '</div>';
    var cartBtn = actions.querySelector('[data-cart]') || actions.querySelector('[title="购物车"]');
    if (cartBtn) actions.insertBefore(wrap, cartBtn); else actions.appendChild(wrap);
    }

    var btn = wrap.querySelector("#notifBtn");
    var panel = wrap.querySelector("#notifPanel");
    if (!btn || !panel) return;
    /* ⚠️ 幂等标记只能用「闭包变量」，不能用 DOM 属性：预览环境会把渲染后的 DOM 回写进源码，
       属性会被一起冻进 HTML，下次加载就成了「已绑定」→ 事件一个都不绑、组件假死且不报错。 */
    if (notifBound) { notifRender(); return; }
    notifBound = true;
    /* 快照可能把「打开态」也冻进源码，进页面先复位 */
    panel.classList.remove("open");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      panel.classList.toggle("open");
    });
    panel.addEventListener("click", function (e) { e.stopPropagation(); });
    document.addEventListener("click", function () { panel.classList.remove("open"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") panel.classList.remove("open");
    });
    panel.querySelectorAll(".np-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        notifFilter = tab.getAttribute("data-cat");
        panel.querySelectorAll(".np-tab").forEach(function (t) { t.classList.remove("on"); });
        tab.classList.add("on");
        notifRender();
      });
    });
    var markAll = wrap.querySelector("#notifMarkAll");
    if (markAll) markAll.addEventListener("click", function () {
      notifs.forEach(function (n) { n.unread = false; });
      notifRender();
      toast("已全部标记为已读");
    });
    notifRender();
  }

  /* ---------- 购物车入口：统一指向独立购物车页 ---------- */
  function buildCartEntry() {
    document.querySelectorAll(".nav-actions").forEach(function (actions) {
      var btn = actions.querySelector('[onclick*="cartDrawer"]') || actions.querySelector('[title="购物车"]');
      if (!btn) {
        btn = document.createElement("button");
        btn.className = "icon-btn";
        btn.setAttribute("title", "购物车");
        btn.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1.2 12.2a1.8 1.8 0 0 1-1.8 1.8H6.6a1.8 1.8 0 0 1-1.8-1.8L6 7Z"/>' +
          '<path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg><span class="badge-dot cart-count">0</span>';
        var anchor = actions.querySelector(".nav-burger");
        if (anchor) actions.insertBefore(btn, anchor); else actions.appendChild(btn);
      }
      btn.removeAttribute("onclick");
      btn.setAttribute("data-cart", "");
      btn.setAttribute("aria-label", "购物车");
      btn.addEventListener("click", function () { window.hmGoCart(); });
    });
  }

  /* ---------- 账户入口：登录/注册合并为头像菜单 ---------- */
  /* 头像菜单标记：新建与「复用被快照固化的结构」共用同一份，避免两处不同步
     USER_MENU_V 是结构版本号 —— 判定「复用到的是不是最新版」，比逐项比对 href 更耐改 */
  var USER_MENU_V = "4";
  /* 顶栏头像与个人中心用同一张图；用户在个人中心换过头像时，这里跟着换。
     （个人中心模块把自定义头像存在 himakers-avatar-preview-v1，走同一个多通道存储） */
  var AVATAR_SRC = "assets/member/avatar.png";
  var AVATAR_KEY = "himakers-avatar-preview-v1";
  window.hmAvatar = function () {
    try {
      var v = window.hmBoxGet ? window.hmBoxGet(AVATAR_KEY, null) : null;
      if (typeof v === "string" && v) return v;
    } catch (e) {}
    return AVATAR_SRC;
  };
  var USER_MENU_HTML = (function () {
    var ICON = {
      order: '<path d="M6 7h12l1.2 12.2a1.8 1.8 0 0 1-1.8 1.8H6.6a1.8 1.8 0 0 1-1.8-1.8L6 7Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
      spark: '<path d="M12 3.6l1.9 4.7 4.7 1.9-4.7 1.9L12 16.8l-1.9-4.7L5.4 10.2l4.7-1.9L12 3.6Z"/>' +
             '<path d="M18.6 16.4l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6Z"/>',
      chat: '<path d="M20 12.4a6.4 6.4 0 0 1-6.4 6.4H8.6L4.5 21.6v-5.1A6.4 6.4 0 0 1 8.6 6h4.9A6.4 6.4 0 0 1 20 12.4Z"/>' +
            '<path d="M9.5 12.3h.01M13 12.3h.01M16.5 12.3h.01"/>'
    };
    function item(href, label, key) {
      return '<a href="' + href + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ICON[key] + '</svg>' + label + '</a>';
    }
    return '<button class="user-btn" id="userBtn" title="我的账户" aria-label="我的账户" aria-haspopup="true" aria-expanded="false">' +
        '<img src="' + AVATAR_SRC + '" alt="我的账户">' +
      '</button>' +
      '<div class="user-panel" id="userPanel" role="dialog" aria-label="账户菜单" data-hm-v="' + USER_MENU_V + '">' +
        '<a class="up-head" href="member.html" title="进入个人中心">' +
          '<img src="' + AVATAR_SRC + '" alt="">' +
          '<div class="up-info">' +
            '<div class="up-top">' +
              '<span class="up-name">创客小宇</span>' +
              '<span class="up-lv">L2</span>' +
            '</div>' +
            '<div class="up-id">ID 88291034</div>' +
          '</div>' +
        '</a>' +
        '<div class="up-stats">' +
          '<a href="member-points.html"><strong>3,580</strong><span>积分</span></a>' +
          '<a href="member-coupons.html"><strong>5</strong><span>优惠券</span></a>' +
        '</div>' +
        '<div class="up-list">' +
          item("member-creation.html", "创作空间", "spark") +
          item("member-community.html", "社区互动", "chat") +
          item("member-orders.html", "我的订单", "order") +
        '</div>' +
        '<button class="up-out" id="userOut">退出登录</button>' +
      '</div>';
  })();

  function buildUserMenu() {
    var actions = document.querySelector(".nav-actions");
    if (!actions) return;

    /* 同 buildNotif：结构可能已被「渲染快照」固化进 HTML，优先复用，但事件照绑 */
    var wrap = actions.querySelector(".user-wrap");
    if (!wrap) {
      // 移除原来的「登录 / 注册」按钮
      actions.querySelectorAll("a").forEach(function (a) {
        var t = (a.textContent || "").trim();
        if (t === "登录" || t === "注册") a.remove();
      });
      wrap = document.createElement("div");
      wrap.className = "user-wrap";
      wrap.innerHTML = USER_MENU_HTML;
      var anchor = actions.querySelector(".nav-burger");
      if (anchor) actions.insertBefore(wrap, anchor); else actions.appendChild(wrap);
    } else {
      /* 复用的固化结构可能不是最新版 —— 按面板上的结构版本号判定，不一致就整块重刷 */
      var cur = wrap.querySelector("#userPanel");
      if (!cur || cur.getAttribute("data-hm-v") !== USER_MENU_V) {
        wrap.innerHTML = USER_MENU_HTML;
        /* 整块重刷后，源码里可能还冻着旧的登录/注册按钮，一并清掉 */
        actions.querySelectorAll("a").forEach(function (a) {
          var t = (a.textContent || "").trim();
          if (t === "登录" || t === "注册") a.remove();
        });
      }
    }

    var btn = wrap.querySelector("#userBtn");
    var panel = wrap.querySelector("#userPanel");
    if (!btn || !panel) return;
    /* 幂等标记用闭包变量，不用 DOM 属性（属性会被预览快照冻进源码 → 组件假死，见 buildNotif 注释） */
    if (userBound) return;
    userBound = true;
    /* 快照可能把「展开态」冻进源码，进页面先复位 */
    panel.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");

    /* 昵称/头像与个人中心保持同步：头像无论是默认图还是用户自换的，都用同一来源；
       昵称同理（模块把两者存在多通道存储里，见 window.hmAvatar） */
    try {
      var savedName = window.hmBoxGet ? window.hmBoxGet("himakers-profile-name-v1", null) : null;
      if (savedName) wrap.querySelectorAll(".up-name").forEach(function (el) { el.textContent = savedName; });
    } catch (e) {}
    var av = window.hmAvatar();
    wrap.querySelectorAll(".user-btn img, .up-head img").forEach(function (img) { img.src = av; });

    function close() { panel.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
    /* 支持悬停的设备（桌面）：鼠标移入头像即展开下拉框，移出收起；
       触屏设备（无 hover）保持点击切换 */
    var hoverOpen = window.matchMedia && window.matchMedia("(hover: hover)").matches;
    var closeTimer = null;
    function openPanel() {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      panel.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
    }
    function laterClose() {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(function () { closeTimer = null; close(); }, 160);
    }
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (hoverOpen) { openPanel(); return; }
      if (panel.classList.contains("open")) close(); else openPanel();
    });
    panel.addEventListener("click", function (e) { e.stopPropagation(); });
    if (hoverOpen) {
      wrap.addEventListener("mouseenter", openPanel);
      wrap.addEventListener("mouseleave", laterClose);
    }
    document.addEventListener("click", function () {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    var out = wrap.querySelector("#userOut");
    if (out) out.addEventListener("click", function () {
      close();
      location.href = "login.html";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildCartEntry();
    window.renderCart && window.renderCart();
    buildNotif();
    buildUserMenu();
  });
  if (document.readyState !== "loading") { buildCartEntry(); buildNotif(); buildUserMenu(); }
})();
