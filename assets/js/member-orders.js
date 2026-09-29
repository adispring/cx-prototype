(() => {
  /* ---- 沙箱安全存储代理 ----------------------------------------------------
     预览容器是 sandbox iframe（未给 allow-same-origin），页面里访问 localStorage
     会抛 SecurityError，会把整个脚本从这里打断 —— 表现是「所有交互都没反应，
     但控制台一条报错都没有」。这里包一层：能用真实 localStorage 就用；不能用
     就降级到站点多通道（window.hmBoxGet / hmBoxSet → window.name / URL 负载），
     跨页面依然带得过去。 */
  function hmHost(){ return document.querySelector('.mc-root') || document.body; }
  var localStorage = (function () {
    var mem = {}, real = null;
    try { real = window.localStorage; real.setItem('__hm_probe', '1'); real.removeItem('__hm_probe'); }
    catch (e) { real = null; }
    function put(k, v) {
      mem[k] = v;
      if (window.hmBoxSet) { try { window.hmBoxSet(k, v); } catch (e) {} }
    }
    function get(k) {
      if (Object.prototype.hasOwnProperty.call(mem, k)) return mem[k];
      if (window.hmBoxGet) {
        try {
          var v = window.hmBoxGet(k, undefined);
          if (v !== undefined && v !== null) { mem[k] = v; return v; }
        } catch (e) {}
      }
      return null;
    }
    return {
      getItem: function (k) {
        k = String(k);
        if (real) { try { return real.getItem(k); } catch (e) {} }
        return get(k);
      },
      setItem: function (k, v) {
        k = String(k); v = String(v);
        if (real) { try { real.setItem(k, v); return; } catch (e) {} }
        put(k, v);
      },
      removeItem: function (k) {
        k = String(k);
        if (real) { try { real.removeItem(k); return; } catch (e) {} }
        put(k, '');
      },
      clear: function () {
        if (real) { try { real.clear(); } catch (e) {} }
        mem = {};
      }
    };
  })();


  const DATA = window.HM_ORDER_DATA;
  if (!DATA) return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (value) => String(value ?? '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  const params = new URLSearchParams(location.search);
  const overrideKey = 'himakers-order-status-v2';

  function readOverrides() {
    try { return JSON.parse(localStorage.getItem(overrideKey) || '{}'); } catch (_) { return {}; }
  }
  function setStatus(no, status) {
    const map = readOverrides();
    map[no] = status;
    localStorage.setItem(overrideKey, JSON.stringify(map));
  }
  function orders() {
    const map = readOverrides();
    return DATA.orders.map(base => {
      const o = {...base, status: map[base.no] || base.status};
      if (map[base.no] === 'cancel') { o.shipIcon='x'; o.shipText='订单已取消 · 你主动取消了该订单'; }
      if (map[base.no] === 'done') { o.shipIcon='check'; o.shipText='已确认收货 · 订单已完成'; }
      if (map[base.no] === 'as') { o.shipIcon='alert'; o.shipText='售后申请已提交 · 商家处理中，预计 48h 内响应'; }
      return o;
    });
  }
  function getOrder(no) { return orders().find(o => o.no === no) || orders()[0]; }
  function statusMeta(o) { return DATA.status[o.status] || DATA.status.done; }
  function money(v) { return '¥ ' + v; }
  function qNo() { return params.get('no') || DATA.orders[0].no; }
  function goto(url) { location.href = url; }

  function toast(message) {
    let el = $('.order-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'order-toast';
      hmHost().appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2000);
  }

  function actButton(action, label, tone = 'secondary', no = '') {
    return `<button class="order-btn ${tone}" type="button" data-order-action="${action}" data-no="${esc(no)}">${label}</button>`;
  }
  function isPaidOrder(o) {
    return ['ship','receive','done','as'].includes(o.status);
  }
  function buttonsFor(o) {
    const out = [];
    if (o.status === 'pay') out.push(actButton('cancel','取消订单','ghost',o.no), actButton('pay','去支付','primary',o.no));
    if (o.status === 'ship') out.push(actButton('remind','提醒发货','ghost',o.no), actButton('logistics','查看物流','secondary',o.no));
    if (o.status === 'receive') out.push(actButton('logistics','查看物流','secondary',o.no), actButton('receive','确认收货','primary',o.no));
    if (o.status === 'done') out.push(actButton('logistics','查看物流','ghost',o.no), actButton('rebuy','再次购买','primary',o.no));
    if (isPaidOrder(o) && o.status !== 'as') out.splice(Math.max(0, out.length - (o.status === 'receive' || o.status === 'done' ? 1 : 0)), 0, actButton('aftersale','申请售后','secondary',o.no));
    if (o.status === 'cancel') out.push(actButton('rebuy','再次购买','primary',o.no));
    if (o.status === 'as') out.push(actButton('after-progress','查看售后进度','secondary',o.no), actButton('urge','催促处理','ghost',o.no));
    return out.join('');
  }

  function handleAction(action, no, ctx = {}) {
    const o = getOrder(no);
    if (!o) return;
    if (action === 'pay') return goto(`member-order-detail.html?no=${encodeURIComponent(no)}&action=pay`);
    if (action === 'logistics') return goto(`member-order-logistics.html?no=${encodeURIComponent(no)}`);
    if (action === 'aftersale') return goto(`member-order-aftersale.html?no=${encodeURIComponent(no)}`);
    if (action === 'after-progress') return goto(`member-order-aftersale.html?no=${encodeURIComponent(no)}&mode=progress`);
    if (action === 'remind') return toast('已提醒商家尽快发货');
    if (action === 'rebuy') return toast(`已加入购物车 · ${o.name} × ${o.qty}`);
    if (action === 'urge') return toast('已为你催促商家，预计 24h 内响应');
    if (action === 'cancel') {
      if (window.confirm('确定取消这个订单吗？')) {
        setStatus(no, 'cancel');
        toast('订单已取消');
        ctx.refresh && ctx.refresh();
      }
      return;
    }
    if (action === 'receive') {
      if (ctx.openReceive) return ctx.openReceive(o);
      if (window.confirm(`确认已经收到「${o.name}」吗？`)) {
        setStatus(no, 'done');
        toast('确认收货成功，订单已完成');
        ctx.refresh && ctx.refresh();
      }
    }
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-order-action]');
    if (!b) return;
    handleAction(b.dataset.orderAction, b.dataset.no, {refresh: () => location.reload()});
  });

  // ---------- Order list ----------
  function initList() {
    const listEl = $('#ordList');
    if (!listEl) return;
    const tabsEl = $('#ordTabs');
    const pagerEl = $('#ordPager');
    const emptyEl = $('#ordEmpty');
    const search = $('#ordSearchInput');
    const searchWrap = $('#ordSearch');
    const clear = $('#ordSearchClear');
    const reset = $('#ordEmptyReset');
    const mask = $('#ordMask');
    let confirmNo = '';
    const PAGE = 4;
    const state = {tab:'all', q:'', page:1, loading:false};
    const defs = [['all','全部'],['pay','待付款'],['ship','待发货'],['receive','待收货'],['done','已完成'],['as','售后']];

    const filter = () => {
      const q = state.q.trim().toLowerCase();
      return orders().filter(o => (state.tab === 'all' || o.status === state.tab) && (!q || o.no.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)));
    };
    function renderTabs() {
      const all = orders();
      tabsEl.innerHTML = defs.map(([id,label]) => {
        const n = id === 'all' ? all.length : all.filter(o => o.status === id).length;
        return `<button class="order-tab${state.tab===id?' active':''}" type="button" data-tab="${id}">${label}<span>${n}</span></button>`;
      }).join('');
    }
    function icon(name) {
      const m = {
        truck:'<path d="M3 7h11v8H3z"/><path d="M14 10h4l3 3v2h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
        check:'<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5"/>',
        alert:'<path d="M12 3 2 20h20z"/><path d="M12 9v5"/><path d="M12 17h.01"/>',
        box:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
        clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
        x:'<circle cx="12" cy="12" r="9"/><path d="m9.5 9.5 5 5m0-5-5 5"/>'
      };
      return `<svg viewBox="0 0 24 24" aria-hidden="true">${m[name] || ''}</svg>`;
    }
    function card(o) {
      const st = statusMeta(o);
      return `<article class="order-card-web" data-order-no="${esc(o.no)}" role="link" tabindex="0" aria-label="查看订单 ${esc(o.no)} 详情">
        <header><div><span>订单号</span><b>${esc(o.no)}</b><span class="order-time">下单时间 ${esc(o.time)}</span></div><span class="order-status-chip ${st.tone}">${st.text}</span></header>
        <div class="order-card-body"><img src="${esc(o.img)}" alt="${esc(o.name)}"/><div class="order-card-copy"><strong>${esc(o.name)}</strong><span>规格：${esc(o.spec)}</span><span class="order-card-state">${esc(st.desc)}</span></div><div class="order-card-money"><span>× ${o.qty}</span><b>${money(o.price)}</b><small>实付</small></div></div>
        <footer><div class="order-shipping">${icon(o.shipIcon)}<span>${esc(o.shipText)}</span></div><div class="order-card-actions">${buttonsFor(o)}</div></footer>
      </article>`;
    }
    function skeleton() {
      return `<div class="order-list-skeleton"><i></i><div><i></i><i></i><i></i></div></div>`;
    }
    function renderPager(total, pages) {
      if (!total) { pagerEl.innerHTML=''; return; }
      let html = `<button type="button" data-page="prev" ${state.page===1?'disabled':''}>上一页</button>`;
      for (let i=1;i<=pages;i++) html += `<button type="button" data-page="${i}" class="${i===state.page?'active':''}">${i}</button>`;
      html += `<button type="button" data-page="next" ${state.page===pages?'disabled':''}>下一页</button>`;
      pagerEl.innerHTML = html;
    }
    function render() {
      const all = filter();
      const pages = Math.max(1, Math.ceil(all.length / PAGE));
      state.page = Math.min(state.page, pages);
      const page = all.slice((state.page-1)*PAGE, state.page*PAGE);
      listEl.innerHTML = page.map(card).join('');
      emptyEl.hidden = all.length !== 0;
      if (!all.length) {
        const isSearch = !!state.q.trim();
        $('#ordEmptyText').textContent = isSearch ? '没有找到相关订单' : '暂无订单';
        $('#ordEmptyHint').textContent = isSearch ? '试试其他订单号或商品关键词' : '去商城逛逛，第一笔订单就在路上';
      }
      renderPager(all.length, pages);
    }
    function refresh() { renderTabs(); render(); }
    function softRender() {
      listEl.style.opacity='.45';
      setTimeout(() => { listEl.style.opacity='1'; render(); }, 130);
    }

    tabsEl.addEventListener('click', e => {
      const b = e.target.closest('[data-tab]'); if (!b || state.loading) return;
      state.tab=b.dataset.tab; state.page=1; renderTabs(); softRender();
    });
    search.addEventListener('input', () => { state.q=search.value; searchWrap.classList.toggle('has-value',!!state.q); state.page=1; softRender(); });
    clear.addEventListener('click', () => { search.value=''; state.q=''; searchWrap.classList.remove('has-value'); state.page=1; softRender(); search.focus(); });
    reset.addEventListener('click', () => { state.tab='all'; state.q=''; state.page=1; search.value=''; searchWrap.classList.remove('has-value'); refresh(); });
    pagerEl.addEventListener('click', e => {
      const b=e.target.closest('[data-page]'); if(!b || b.disabled || state.loading) return;
      const all=filter(), pages=Math.max(1,Math.ceil(all.length/PAGE));
      let target=b.dataset.page==='prev'?state.page-1:b.dataset.page==='next'?state.page+1:Number(b.dataset.page);
      if(target<1||target>pages||target===state.page)return;
      state.loading=true; state.page=target; listEl.innerHTML=skeleton();
      setTimeout(()=>{state.loading=false;render();window.scrollTo({top:0,behavior:'smooth'});},360);
    });
    listEl.addEventListener('click', e => {
      const b=e.target.closest('[data-order-action]');
      if(b){
        e.stopPropagation();
        handleAction(b.dataset.orderAction,b.dataset.no,{refresh,openReceive:(o)=>{confirmNo=o.no;$('#ordDlgDesc').textContent=`确认收到「${o.name}」了吗？确认后订单将变为「已完成」。`;mask.classList.add('show');mask.setAttribute('aria-hidden','false');}});
        return;
      }
      const card=e.target.closest('.order-card-web[data-order-no]');
      if(card) goto(`member-order-detail.html?no=${encodeURIComponent(card.dataset.orderNo)}`);
    });
    listEl.addEventListener('keydown', e => {
      if(e.target.closest('[data-order-action]')) return;
      const card=e.target.closest('.order-card-web[data-order-no]');
      if(!card || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      goto(`member-order-detail.html?no=${encodeURIComponent(card.dataset.orderNo)}`);
    });
    $('#ordDlgCancel').addEventListener('click',()=>{mask.classList.remove('show');mask.setAttribute('aria-hidden','true');confirmNo='';});
    $('#ordDlgOk').addEventListener('click',()=>{if(confirmNo){setStatus(confirmNo,'done');toast('确认收货成功，订单已完成');}mask.classList.remove('show');mask.setAttribute('aria-hidden','true');confirmNo='';refresh();});
    mask.addEventListener('click',e=>{if(e.target===mask)$('#ordDlgCancel').click();});
    refresh();
    if (params.get('submitted') === '1') toast('售后申请已提交');
  }

  // ---------- Detail ----------
  function renderDetailActions(o) {
    const el = $('#detailActions'); if (!el) return;
    const detail = [];
    if (o.status === 'pay') detail.push(actButton('cancel','取消订单','ghost',o.no),actButton('pay-now','立即支付','primary',o.no));
    if (o.status === 'ship') detail.push(actButton('remind','提醒发货','ghost',o.no),actButton('logistics','查看物流','secondary',o.no));
    if (o.status === 'receive') detail.push(actButton('logistics','查看物流','secondary',o.no),actButton('receive','确认收货','primary',o.no));
    if (o.status === 'done') detail.push(actButton('logistics','查看物流','ghost',o.no),actButton('rebuy','再次购买','primary',o.no));
    if (isPaidOrder(o) && o.status !== 'as') detail.splice(Math.max(0, detail.length - (o.status === 'receive' || o.status === 'done' ? 1 : 0)), 0, actButton('aftersale','申请售后','secondary',o.no));
    if (o.status === 'cancel') detail.push(actButton('rebuy','再次购买','primary',o.no));
    if (o.status === 'as') detail.push(actButton('after-progress','查看售后进度','secondary',o.no),actButton('urge','催促处理','ghost',o.no));
    el.innerHTML = detail.join('');
  }
  function initDetail() {
    if (!$('#orderDetailPage')) return;
    let o=getOrder(qNo()), st=statusMeta(o);
    $('#detailStatus').textContent=st.text; $('#detailStatusDesc').textContent=st.desc; $('#detailStatusDot').className=`order-status-dot ${st.tone}`;
    $('#detailNo').textContent=o.no; $('#detailTime').textContent=o.time; $('#detailImg').src=o.img; $('#detailImg').alt=o.name; $('#detailName').textContent=o.name; $('#detailSpec').textContent='规格：'+o.spec; $('#detailQty').textContent='数量：× '+o.qty; $('#detailPrice').textContent=money(o.price); $('#detailGoodsAmount').textContent=money(o.price); $('#detailPaid').textContent=money(o.price);
    $('#detailDelivery').textContent=o.status==='pay'||o.status==='cancel'?'暂未进入配送':(o.carrier||'商家配送');
    renderDetailActions(o);
    $('#detailActions').addEventListener('click',e=>{
      const b=e.target.closest('[data-order-action]'); if(!b)return; e.stopPropagation();
      if(b.dataset.orderAction==='pay-now'){toast('已进入模拟支付流程');return;}
      handleAction(b.dataset.orderAction,b.dataset.no,{refresh:()=>location.reload()});
    });
    if(params.get('action')==='pay' && o.status==='pay') setTimeout(()=>toast('订单待付款，可在右侧继续支付'),120);
  }

  // ---------- Logistics ----------
  function logisticsFor(o) {
    if (DATA.logistics[o.no]) return DATA.logistics[o.no];
    const addr='张伟 138****6721 · 广东省深圳市南山区科技园南区 8 栋 1203';
    if(o.status==='ship') return {state:'待揽收',desc:'商家已完成打包，等待快递员揽收',eta:'预计今日 18:00 前揽收',carrier:o.carrier||'顺丰速运',no:o.tracking||'待生成',shipAt:'等待揽收',addr,updated:'最后更新 '+o.time,track:[['商家已完成打包，等待快递员揽收',o.time],['订单支付成功，商家开始备货',o.time]]};
    if(o.status==='receive') return {state:'运输中',desc:o.shipText,eta:'请以承运商最新信息为准',carrier:o.carrier||'顺丰速运',no:o.tracking||'暂无',shipAt:o.time,addr,updated:'物流信息持续更新中',track:[['运输中 · '+o.shipText,o.time],['已揽收 · 商品已交由承运商',o.time],['已下单 · 订单支付成功',o.time]]};
    if(o.status==='done') return {state:'已签收',desc:o.shipText,eta:'订单已完成',carrier:o.carrier||'顺丰速运',no:o.tracking||'暂无',shipAt:o.time,addr,updated:'物流已完成',track:[['已签收 · '+o.shipText,o.time],['派送中 · 快件进入末端配送',o.time],['运输中 · 快件已进入目的城市',o.time],['已揽收 · 商家完成发货',o.time]]};
    return {state:'暂无物流',desc:'当前订单尚未产生可查询的物流信息',eta:'',carrier:'—',no:'—',shipAt:'—',addr,updated:'',track:[['当前暂无物流轨迹','—']]};
  }
  function initLogistics() {
    if(!$('#orderLogisticsPage'))return;
    const o=getOrder(qNo()), l=logisticsFor(o);
    $('#lgState').textContent=l.state; $('#lgStateDesc').textContent=l.desc; $('#lgEta').textContent=l.eta; $('#lgCarrier').textContent=l.carrier; $('#lgNo').textContent=l.no; $('#lgShipAt').textContent=l.shipAt; $('#lgAddr').textContent=l.addr; $('#lgUpdated').textContent=l.updated;
    $('#lgTrack').innerHTML=l.track.map((r,i)=>`<li class="${i===0?'current':''}"><i></i><div><strong>${esc(r[0])}</strong><span>${esc(r[1])}</span></div></li>`).join('');
    $('#lgOrderImg').src=o.img; $('#lgOrderImg').alt=o.name; $('#lgOrderName').textContent=o.name; $('#lgOrderSpec').textContent='规格：'+o.spec; $('#lgOrderNo').textContent='订单号 '+o.no; $('#lgOrderMoney').textContent=money(o.price); $('#lgDetailLink').href=`member-order-detail.html?no=${encodeURIComponent(o.no)}`;
    $('#lgCopy').addEventListener('click',()=>{ if(navigator.clipboard&&navigator.clipboard.writeText&&l.no!=='—') navigator.clipboard.writeText(l.no).then(()=>toast('运单号已复制')); else toast('运单号：'+l.no); });
    $('#lgService').addEventListener('click',()=>toast('已为你接入在线客服（演示）'));
  }

  // ---------- After-sale ----------
  const afterRecordKey = 'himakers-aftersale-record-v1';
  function readAfterRecords() {
    try { return JSON.parse(localStorage.getItem(afterRecordKey) || '{}'); } catch (_) { return {}; }
  }
  function saveAfterRecord(no, record) {
    const map = readAfterRecords();
    map[no] = record;
    localStorage.setItem(afterRecordKey, JSON.stringify(map));
  }
  function defaultAfterRecord(o) {
    return {
      type:'仅退款',
      reason:'商品破损 / 变形',
      refund:o.price,
      desc:'收到商品时外包装有明显挤压，商品边缘出现变形，暂未继续使用。',
      refundMethod:'原支付方式退回',
      submittedAt:o.no==='HM-20260917-011'?'2026-09-17 15:35':'2026-09-23 15:24',
      acceptedAt:o.no==='HM-20260917-011'?'2026-09-17 15:42':'2026-09-23 15:31',
      reviewAt:o.no==='HM-20260917-011'?'2026-09-18 09:20':'预计 24 小时内',
      evidence:'2 张图片凭证'
    };
  }
  function getAfterRecord(o) {
    return readAfterRecords()[o.no] || defaultAfterRecord(o);
  }
  function showAfterProgress(o) {
    const form=$('#afterForm'), box=$('#afterProgress');
    // 售后进度页只展示进度与已提交信息，不保留申请表单。
    if(form) form.remove();
    const r=getAfterRecord(o);
    const isExchange=r.type==='换货';
    const actionLabel=isExchange?'换货处理中':'退款处理中';
    const actionHint=isExchange?'审核通过后商家将安排换货流程':'审核通过后退款将按原支付方式发起';
    const finalHint=isExchange?'新商品发出并确认收货后完成':'退款到账后售后单自动完成';
    box.hidden=false;
    box.innerHTML=`
      <section class="order-section-card after-progress-card">
        <div class="order-section-title">售后进度</div>
        <div class="after-state after-state-detailed">
          <div class="after-state-copy"><span>商家审核中</span><strong>申请已受理，正在核实商品问题</strong><p>商家预计在 24 小时内给出处理方案。${actionHint}。</p></div>
          <div class="after-state-meta"><small>售后单号</small><b>AS-${esc(o.no.replace('HM-',''))}</b><small>预计完成</small><b>1–3 个工作日</b></div>
        </div>
        <ol class="after-timeline detailed">
          <li class="done"><i></i><div><b>售后申请已提交</b><span>${esc(r.submittedAt)}</span><small>申请信息和凭证已提交成功</small></div></li>
          <li class="done"><i></i><div><b>平台已受理</b><span>${esc(r.acceptedAt)}</span><small>售后单已创建并同步给商家</small></div></li>
          <li class="current"><i></i><div><b>商家审核中</b><span>${esc(r.reviewAt)}</span><small>正在核实商品问题与退款条件</small></div></li>
          <li><i></i><div><b>处理方案确认</b><span>待审核完成</span><small>确认退款、退货退款或换货方案</small></div></li>
          <li><i></i><div><b>${actionLabel}</b><span>待处理方案确认</span><small>${isExchange?'商家将安排换货商品并更新物流':'退款将按原支付方式发起'}</small></div></li>
          <li><i></i><div><b>售后完成</b><span>${isExchange?'待换货完成':'待退款到账'}</span><small>${finalHint}</small></div></li>
        </ol>
        <div class="after-progress-actions"><a class="order-btn secondary" href="member-order-detail.html?no=${encodeURIComponent(o.no)}">查看订单详情</a><button class="order-btn ghost" type="button" data-order-action="urge" data-no="${esc(o.no)}">催促处理</button></div>
      </section>
      <section class="order-section-card after-record-card">
        <div class="order-section-title">申请信息</div>
        <div class="after-readonly-grid">
          <div class="after-readonly-item"><span>售后类型</span><strong>${esc(r.type)}</strong></div>
          <div class="after-readonly-item"><span>申请原因</span><strong>${esc(r.reason)}</strong></div>
          <div class="after-readonly-item"><span>${isExchange?'处理金额':'退款金额'}</span><strong class="money">${isExchange?'—':money(r.refund)}</strong></div>
          <div class="after-readonly-item"><span>${isExchange?'处理方式':'退款方式'}</span><strong>${isExchange?'商家安排换货':esc(r.refundMethod)}</strong></div>
          <div class="after-readonly-item"><span>申请时间</span><strong>${esc(r.submittedAt)}</strong></div>
          <div class="after-readonly-item"><span>补充凭证</span><strong>${esc(r.evidence || '未上传')}</strong></div>
        </div>
        <div class="after-readonly-desc"><span>问题描述</span><p>${esc(r.desc || '无')}</p></div>
      </section>`;
  }
  function initAfter() {
    if(!$('#orderAfterPage'))return;
    const o=getOrder(qNo());
    $('#afterImg').src=o.img; $('#afterImg').alt=o.name; $('#afterName').textContent=o.name; $('#afterSpec').textContent='规格：'+o.spec; $('#afterNo').textContent=o.no; $('#afterAmount').textContent=money(o.price); $('#afterRefund').value=o.price.replace(/,/g,'');
    const progress=params.get('mode')==='progress'||o.status==='as';
    if(progress){$('#afterTitle').textContent='售后进度';document.title='HiMakers · 售后进度';showAfterProgress(o);return;}
    const desc=$('#afterDesc'), count=$('#afterCount'); desc.addEventListener('input',()=>count.textContent=desc.value.length);
    $('#afterFiles').addEventListener('change',e=>{ const names=[...e.target.files].slice(0,5).map(f=>`<span>${esc(f.name)}</span>`); $('#afterUploadList').innerHTML=names.join(''); });
    $('#afterForm').addEventListener('submit',e=>{
      e.preventDefault();
      const type=$('input[name="afterType"]:checked'); const reason=$('#afterReason').value;
      if(!type){toast('请选择售后类型');return;}
      if(!reason){toast('请选择退款原因');return;}
      const now=new Date();
      const pad=n=>String(n).padStart(2,'0');
      const ts=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      saveAfterRecord(o.no,{type:type.value,reason,refund:$('#afterRefund').value||o.price,desc:desc.value.trim()||'未填写补充说明',refundMethod:type.value==='换货'?'不涉及退款':'原支付方式退回',submittedAt:ts,acceptedAt:'已自动受理',reviewAt:'预计 24 小时内',evidence:$('#afterFiles').files.length?`${Math.min($('#afterFiles').files.length,5)} 张图片凭证`:'未上传'});
      setStatus(o.no,'as');
      $('#afterTitle').textContent='售后进度'; document.title='HiMakers · 售后进度'; showAfterProgress({...o,status:'as'}); toast('售后申请已提交'); window.scrollTo({top:0,behavior:'smooth'});
    });
  }

  initList(); initDetail(); initLogistics(); initAfter();
})();
