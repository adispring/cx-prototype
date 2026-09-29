/* HiMakers · 订单与地址数据层（原型演示，localStorage 持久化） */
(function () {
  var ORDERS_KEY = "himakers_orders_v1";
  var ADDR_KEY = "himakers_addr_v1";

  function money(n) { return (n || 0).toLocaleString("en-US"); }
  window.money = money;

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function now() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function newId() {
    var d = new Date();
    return "HM-" + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) +
      pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }
  /* 存储走 site.js 的多通道通道（预览 sandbox 里 localStorage 会抛错，改用 window.name 兜底） */
  function read(key, fallback) {
    var v = null;
    if (window.hmBoxGet) v = window.hmBoxGet(key, null);
    else { try { v = JSON.parse(localStorage.getItem(key)); } catch (e) { v = null; } }
    if (v === null || v === undefined) return fallback;
    return v;
  }
  function write(key, val) {
    if (window.hmBoxSet) { window.hmBoxSet(key, val); return; }
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* ---------- 状态字典 ---------- */
  var STATUS = {
    pending:   { label: "待付款", tone: "warn", act: ["去付款", "取消订单"] },
    paid:      { label: "待发货", tone: "info", act: ["申请退款"] },
    shipped:   { label: "待收货", tone: "go",   act: ["查看物流", "确认收货"] },
    done:      { label: "已完成", tone: "ok",   act: ["再次购买", "申请售后"] },
    aftersale: { label: "售后中", tone: "warn", act: ["查看进度"] },
    closed:    { label: "已取消", tone: "mute", act: ["删除订单"] }
  };
  function statusMeta(s) { return STATUS[s] || { label: s || "—", tone: "mute", act: [] }; }

  /* ---------- 默认地址 ---------- */
  var DEFAULT_ADDRS = [
    { id: "a1", name: "陈默", phone: "138 0000 1234", tag: "公司", region: "广东省 深圳市 南山区", detail: "科技园南路 88 号 创新大厦 21 层", def: true },
    { id: "a2", name: "陈默", phone: "139 0000 5678", tag: "家",   region: "广东省 深圳市 福田区", detail: "香蜜湖街道 天鹅堡 3 栋 1802", def: false },
    { id: "a3", name: "林一", phone: "137 0000 2468", tag: "工作室", region: "浙江省 杭州市 西湖区", detail: "文三路 创意园 B 座 402", def: false }
  ];

  /* ---------- 演示订单（含多产品组合订单） ---------- */
  var DEMO_ORDERS = [
    {
      id: "HM-20418",
      createdAt: "2026-09-20 14:32",
      status: "shipped",
      pay: "信用卡 / 借记卡",
      ship: 0,
      discount: 300,
      addr: DEFAULT_ADDRS[0],
      items: [
        { name: "XCheng X1 激光雕刻机", spec: "进阶套装 · 20W 光斑", price: 4999, qty: 1, img: "assets/img/device-laser.png" },
        { name: "认证材质探索包", spec: "木 / 皮革 / 亚克力 共 24 件", price: 299, qty: 1, img: "assets/img/materials-flatlay.png" },
        { name: "旋转雕刻轴 R1", spec: "适配 XCheng X1 · 圆柱体雕刻", price: 899, qty: 1, img: "assets/img/device-laser.png" },
        { name: "PLA 环保耗材", spec: "1kg × 2 · 鼠尾草绿 / 陶土白", price: 258, qty: 2, img: "assets/img/shop/pla-filament.png" }
      ],
      express: {
        company: "顺丰速运",
        no: "SF3029188666",
        steps: [
          { t: "2026-09-21 09:12", d: "已发货 · 深圳宝安揽收点已揽收", done: true },
          { t: "2026-09-21 19:40", d: "运输中 · 已到达 深圳中转场", done: true },
          { t: "2026-09-22 08:05", d: "派送中 · 南山科技园站点 配送员 王师傅 138****6621", done: true },
          { t: "", d: "已签收 · 期待你的开箱作品", done: false }
        ]
      }
    },
    {
      id: "HM-20507",
      createdAt: "2026-09-23 20:18",
      status: "pending",
      pay: "待选择",
      ship: 0,
      discount: 0,
      addr: DEFAULT_ADDRS[1],
      items: [
        { name: "Doyao Y2 Max 3D 打印机", spec: "旗舰套装 · 双喷头", price: 4999, qty: 1, img: "assets/img/device-printer-max.png" },
        { name: "PEI 纹理打印板", spec: "适配 Doyao Y2 / Y2 Max", price: 199, qty: 1, img: "assets/img/models/hex-box.png" }
      ],
      express: null
    },
    {
      id: "HM-20396",
      createdAt: "2026-09-15 11:05",
      status: "done",
      pay: "PayPal",
      ship: 0,
      discount: 60,
      addr: DEFAULT_ADDRS[0],
      items: [
        { name: "UV 光固化树脂 1kg", spec: "高精度 · 8 色", price: 199, qty: 2, img: "assets/img/shop/uv-resin.png" },
        { name: "硬质合金喷头组 ×3", spec: "耐磨 · 3 支装", price: 249, qty: 1, img: "assets/img/models/robot-arm-joint.png" }
      ],
      express: {
        company: "京东物流",
        no: "JD0088123456",
        steps: [
          { t: "2026-09-16 10:20", d: "已发货 · 深圳仓已出库", done: true },
          { t: "2026-09-17 09:00", d: "派送中 · 南山科技园站点", done: true },
          { t: "2026-09-17 15:32", d: "已签收 · 本人签收", done: true }
        ]
      }
    },
    {
      id: "HM-20361",
      createdAt: "2026-09-09 16:44",
      status: "aftersale",
      pay: "Apple Pay",
      ship: 49,
      discount: 0,
      addr: DEFAULT_ADDRS[2],
      items: [
        { name: "CNC C1 雕刻机", spec: "标准版 · 含入门刀组", price: 5999, qty: 1, img: "assets/img/device-cnc.png" }
      ],
      express: {
        company: "德邦物流",
        no: "DP7712009988",
        steps: [
          { t: "2026-09-10 09:30", d: "已发货 · 德邦杭州揽收点", done: true },
          { t: "2026-09-12 14:10", d: "已签收 · 前台代收", done: true }
        ]
      }
    }
  ];

  /* ---------- 订单 API ---------- */
  function ensure() {
    var orders = read(ORDERS_KEY, null);
    if (!orders || !orders.length) { orders = DEMO_ORDERS.slice(); write(ORDERS_KEY, orders); }
    var addrs = read(ADDR_KEY, null);
    if (!addrs || !addrs.length) { addrs = DEFAULT_ADDRS.slice(); write(ADDR_KEY, addrs); }
    return orders;
  }

  function subtotal(o) {
    return (o.items || []).reduce(function (s, it) { return s + (it.price || 0) * (it.qty || 1); }, 0);
  }
  function total(o) { return Math.max(0, subtotal(o) + (o.ship || 0) - (o.discount || 0)); }
  function qty(o) { return (o.items || []).reduce(function (s, it) { return s + (it.qty || 1); }, 0); }

  window.Orders = {
    ensure: ensure,
    all: function () { return ensure().slice().sort(function (a, b) { return b.id < a.id ? -1 : 1; }); },
    get: function (id) { return ensure().filter(function (o) { return o.id === id; })[0] || null; },
    add: function (o) {
      var list = ensure();
      list.unshift(o);
      write(ORDERS_KEY, list);
      return o;
    },
    update: function (id, patch) {
      var list = ensure();
      list.forEach(function (o) { if (o.id === id) Object.keys(patch).forEach(function (k) { o[k] = patch[k]; }); });
      write(ORDERS_KEY, list);
    },
    remove: function (id) {
      var list = ensure().filter(function (o) { return o.id !== id; });
      write(ORDERS_KEY, list);
    },
    reset: function () { write(ORDERS_KEY, DEMO_ORDERS.slice()); write(ADDR_KEY, DEFAULT_ADDRS.slice()); },
    subtotal: subtotal,
    total: total,
    qty: qty,
    statusMeta: statusMeta,
    newId: newId,
    now: now,
    /* 从购物车下单 */
    place: function (opts) {
      var items = (opts.items || []).map(function (it) {
        return { name: it.name, spec: it.spec, price: it.price, qty: it.qty, img: it.img };
      });
      var order = {
        id: newId(),
        createdAt: now(),
        status: opts.status || "pending",
        pay: opts.pay || "信用卡 / 借记卡",
        ship: opts.ship || 0,
        discount: opts.discount || 0,
        addr: opts.addr,
        items: items,
        express: null
      };
      this.add(order);
      return order;
    }
  };

  /* ---------- 地址 API ---------- */
  window.Addr = {
    all: function () { ensure(); return read(ADDR_KEY, DEFAULT_ADDRS.slice()); },
    get: function (id) { return this.all().filter(function (a) { return a.id === id; })[0] || null; },
    def: function () {
      var list = this.all();
      return list.filter(function (a) { return a.def; })[0] || list[0] || null;
    },
    add: function (a) {
      var list = this.all();
      a.id = "a" + Date.now();
      if (a.def) list.forEach(function (x) { x.def = false; });
      list.push(a);
      write(ADDR_KEY, list);
      return a;
    },
    update: function (id, patch) {
      var list = this.all();
      list.forEach(function (a) { if (a.id === id) Object.keys(patch).forEach(function (k) { a[k] = patch[k]; }); });
      if (patch.def) list.forEach(function (a) { if (a.id !== id) a.def = false; });
      write(ADDR_KEY, list);
    },
    remove: function (id) {
      var list = this.all().filter(function (a) { return a.id !== id; });
      if (list.length && !list.some(function (a) { return a.def; })) list[0].def = true;
      write(ADDR_KEY, list);
    },
    setDefault: function (id) { this.update(id, { def: true }); }
  };

  ensure();
})();
