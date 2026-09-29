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


  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function toast(message) {
    let el = $('.app-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'app-toast';
      hmHost().appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function icon(name) {
    const icons = {
      search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.4-3.4"/></svg>',
      close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
      bell:'<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M10 20h4"/></svg>',
      cart:'<svg viewBox="0 0 24 24"><path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H7"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>',
      heart:'<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
      arrow:'<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>'
    };
    return icons[name] || '';
  }

  function closeFloating() {
    $$('.app-float').forEach(el => el.remove());
  }

  function floatPanel(anchor, html, className = '') {
    closeFloating();
    const panel = document.createElement('div');
    panel.className = `app-float ${className}`;
    panel.innerHTML = html;
    hmHost().appendChild(panel);
    const r = anchor.getBoundingClientRect();
    const width = Math.min(panel.offsetWidth || 320, window.innerWidth - 24);
    let left = Math.min(r.right - width, window.innerWidth - width - 12);
    left = Math.max(12, left);
    panel.style.left = `${left + window.scrollX}px`;
    panel.style.top = `${r.bottom + 10 + window.scrollY}px`;
    setTimeout(() => document.addEventListener('pointerdown', outside, { once: true }), 0);
    function outside(e) {
      if (!panel.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) panel.remove();
      else if (panel.isConnected) setTimeout(() => document.addEventListener('pointerdown', outside, { once: true }), 0);
    }
    return panel;
  }

  function modal({ title, body, actions = '', className = '' }) {
    const overlay = document.createElement('div');
    overlay.className = `app-modal-backdrop ${className}`;
    overlay.innerHTML = `
      <section class="app-modal" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="app-modal-head"><h2>${title}</h2><button class="app-modal-close" type="button" aria-label="关闭">${icon('close')}</button></div>
        <div class="app-modal-body">${body}</div>
        ${actions ? `<div class="app-modal-actions">${actions}</div>` : ''}
      </section>`;
    hmHost().appendChild(overlay);
    const close = () => overlay.remove();
    $('.app-modal-close', overlay).addEventListener('click', close);
    overlay.addEventListener('pointerdown', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
    return { overlay, close };
  }

  // ---------- Shared avatar editing ----------
  const avatarStorage = 'himakers-avatar-preview-v1';
  function applySavedAvatar() {
    const saved = localStorage.getItem(avatarStorage);
    if (!saved) return;
    $$('img[src*="assets/member/avatar.png"], .avatar-mini, .avatar-lg, .overview-avatar, .popover-user-avatar, .post-author img').forEach(img => img.src = saved);
  }
  applySavedAvatar();

  // ---------- Topbar is intentionally visual-only in this prototype ----------

  // ---------- Topbar language switch ----------
  const languageKey = 'himakers-language-v1';
  const languages = [
    { code:'zh-CN', name:'简体中文', short:'中文' },
    { code:'en', name:'English', short:'EN' },
    { code:'zh-TW', name:'繁體中文', short:'繁中' }
  ];
  const currentLanguage = () => languages.find(item => item.code === localStorage.getItem(languageKey)) || languages[0];

  function applyLanguage() {
    const lang = currentLanguage();
    $$('[data-language-label]').forEach(el => el.textContent = lang.short);
    $$('[data-language-switch]').forEach(btn => btn.setAttribute('aria-label', `切换界面语言，当前：${lang.name}`));
    $$('[data-language-current]').forEach(el => el.textContent = `当前：${lang.name}`);
    document.documentElement.setAttribute('lang', lang.code);
  }

  function openLanguageMenu(anchor) {
    const lang = currentLanguage();
    const check = '<svg class="lang-option-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4.5 4.5L19 7"/></svg>';
    const panel = floatPanel(anchor, `
      <div class="lang-menu">
        <strong>界面语言</strong>
        ${languages.map(item => `<button class="lang-option${item.code === lang.code ? ' active' : ''}" type="button" data-language-pick="${item.code}">
          <span>${item.name}</span>
          ${item.code === lang.code ? check : ''}
        </button>`).join('')}
        <p class="lang-note">原型演示：切换仅改变语言标识，页面正文暂未提供多语言版本。</p>
      </div>`, 'lang-float');
    $$('[data-language-pick]', panel).forEach(btn => btn.addEventListener('click', () => {
      const picked = languages.find(item => item.code === btn.dataset.languagePick);
      localStorage.setItem(languageKey, picked.code);
      applyLanguage();
      panel.remove();
      toast(`界面语言已切换为 ${picked.name}`);
    }));
  }

  $$('[data-language-switch]').forEach(btn => btn.addEventListener('click', () => openLanguageMenu(btn)));
  applyLanguage();

  // ---------- Topbar messages: 收到的赞与收藏 / 收到的评论与@ ----------
  const messageReadKey = 'himakers-message-read-v1';
  const messageGroups = [
    {
      key:'received-like-save', label:'收到的赞与收藏',
      items:[
        { id:'ls-1', user:'木作阿北', action:'赞了你的作品', time:'09-21', text:'复古汽车木雕', thumb:'assets/member/post1.jpg', unread:true },
        { id:'ls-2', user:'模型研究所', action:'收藏了你的作品', time:'09-20', text:'木制机械摄影机', thumb:'assets/member/post2.jpg', unread:true },
        { id:'ls-3', user:'Maker_36', action:'赞了你的作品', time:'09-18', text:'蒸汽机车木雕模型', thumb:'assets/member/post3.jpg', unread:true },
        { id:'ls-4', user:'木工小组', action:'收藏了你的作品', time:'09-17', text:'镂空木雕托盘', thumb:'assets/member/post4.jpg' }
      ]
    },
    {
      key:'received-comments', label:'收到的评论与@',
      items:[
        { id:'cm-1', user:'阿木实验室', action:'评论了你的作品', time:'09-22', comment:'这个雕刻层次很漂亮，想看看你后续的拼装和上色过程。', thumb:'assets/member/post1.jpg', unread:true },
        { id:'cm-2', user:'ShapeLab', action:'回复了你的评论', time:'09-20', comment:'可以，下一版我会把榫接结构和雕刻参数也一起整理出来。', quote:'你之前问过这个部位的拼装方式，我补了一版细节。', thumb:'assets/member/post2.jpg', unread:true },
        { id:'cm-3', user:'创客小组', action:'在评论中提到了你', time:'09-18', comment:'@创客小宇 这个镂空纹样和你之前做的木雕系列很像。', thumb:'assets/member/post3.jpg' }
      ]
    }
  ];
  const msgEscape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const readMessageIds = () => {
    try { return new Set(JSON.parse(localStorage.getItem(messageReadKey) || '[]')); } catch (_) { return new Set(); }
  };
  const isMessageUnread = item => !!item.unread && !readMessageIds().has(item.id);
  const unreadMessageCount = () => messageGroups.reduce((sum, group) => sum + group.items.filter(isMessageUnread).length, 0);

  function refreshMessageBadge() {
    const count = unreadMessageCount();
    $$('[data-notify-badge]').forEach(el => {
      el.textContent = count > 99 ? '99+' : String(count);
      el.hidden = count === 0;
    });
    $$('[data-notify-trigger]').forEach(bell => {
      bell.setAttribute('aria-label', count ? `消息，${count} 条未读` : '消息，无未读');
      bell.setAttribute('title', '消息');
    });
  }

  function openMessagePanel(anchor) {
    let activeKey = messageGroups[0].key;
    const panel = floatPanel(anchor, `
      <div class="msg-panel">
        <div class="msg-head">
          <strong>消息</strong>
          <span class="msg-head-meta" data-msg-summary></span>
          <button class="msg-read-all" type="button" data-msg-read-all>全部已读</button>
        </div>
        <div class="msg-tabs" role="tablist" aria-label="消息分类" data-msg-tabs></div>
        <div class="msg-body" data-msg-body></div>
      </div>`, 'msg-float');
    const tabsHost = $('[data-msg-tabs]', panel);
    const body = $('[data-msg-body]', panel);

    function paint() {
      tabsHost.innerHTML = messageGroups.map(group => {
        const active = group.key === activeKey;
        const unread = group.items.filter(isMessageUnread).length;
        return `<button class="msg-tab${active ? ' active' : ''}" type="button" role="tab" aria-selected="${active}" data-msg-tab="${group.key}">
          <span>${msgEscape(group.label)}</span><b>${group.items.length}</b>${unread ? '<i class="msg-tab-dot" aria-hidden="true"></i>' : ''}
        </button>`;
      }).join('');

      const group = messageGroups.find(item => item.key === activeKey) || messageGroups[0];
      body.innerHTML = group.items.map(item => {
        const unread = isMessageUnread(item);
        return `<article class="msg-item${unread ? ' is-unread' : ''}" data-msg-id="${item.id}" tabindex="0">
          <span class="msg-dot" aria-hidden="true"></span>
          <img class="msg-avatar" src="assets/member/avatar.png" alt="${msgEscape(item.user)}头像"/>
          <div class="msg-main">
            <div class="msg-user"><strong>${msgEscape(item.user)}</strong><span>${msgEscape(item.action)} · ${msgEscape(item.time)}</span></div>
            ${item.comment
              ? `<p class="msg-text">${msgEscape(item.comment)}</p>${item.quote ? `<p class="msg-quote">${msgEscape(item.quote)}</p>` : ''}
                 <div class="msg-actions"><button type="button" data-msg-reply>回复</button><button type="button" data-msg-like>赞</button></div>`
              : `<p class="msg-text">${msgEscape(item.text)}</p>`}
          </div>
          <img class="msg-thumb" src="${item.thumb}" alt="${msgEscape(item.text || '作品')}缩略图"/>
        </article>`;
      }).join('') || '<p class="msg-empty">这里还没有消息</p>';

      const unread = unreadMessageCount();
      $('[data-msg-summary]', panel).textContent = unread ? `${unread} 条未读` : '全部已读';
      $('[data-msg-read-all]', panel).disabled = unread === 0;
      refreshMessageBadge();
    }

    function persistRead(set) {
      try { localStorage.setItem(messageReadKey, JSON.stringify([...set])); } catch (_) {}
    }

    panel.addEventListener('click', e => {
      const tab = e.target.closest('[data-msg-tab]');
      if (tab) { activeKey = tab.dataset.msgTab; return paint(); }
      if (e.target.closest('[data-msg-read-all]')) {
        const set = readMessageIds();
        messageGroups.forEach(group => group.items.forEach(item => { if (item.unread) set.add(item.id); }));
        persistRead(set);
        paint();
        return toast('消息已全部标记为已读');
      }
      const item = e.target.closest('[data-msg-id]');
      if (!item) return;
      const liked = e.target.closest('[data-msg-like]');
      if (liked) {
        const on = liked.classList.toggle('is-on');
        liked.textContent = on ? '已赞' : '赞';
        return;
      }
      if (e.target.closest('[data-msg-reply]')) return toast('已打开回复框（原型演示）');
      const set = readMessageIds();
      set.add(item.dataset.msgId);
      persistRead(set);
      paint();
    });

    paint();
  }

  $$('.top-actions > .icon-btn[aria-label="通知"]').forEach(bell => {
    bell.classList.add('notify-trigger');
    bell.setAttribute('data-notify-trigger', '');
    bell.setAttribute('role', 'button');
    bell.setAttribute('tabindex', '0');
    bell.setAttribute('aria-haspopup', 'true');
    const badge = document.createElement('em');
    badge.className = 'notify-badge';
    badge.setAttribute('data-notify-badge', '');
    badge.hidden = true;
    bell.appendChild(badge);
    const openPanel = () => openMessagePanel(bell);
    bell.addEventListener('click', openPanel);
    bell.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openPanel();
    });
  });
  refreshMessageBadge();

  // 指向当前页面自身的链接不触发重新加载：
  // 例如在 member-profile-edit.html 上点击头像 / 昵称（它们同样指向编辑页），
  // 只应保持停留在当前页，而不刷新丢掉尚未保存的表单内容。
  $$('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^[a-z][a-z0-9+.-]*:/i.test(href)) return;
    let target;
    try { target = new URL(href, location.href); } catch (_) { return; }
    if (target.pathname === location.pathname && target.search === location.search) {
      link.addEventListener('click', e => e.preventDefault());
    }
  });

  $$('.popover-logout').forEach(btn => {
    btn.removeAttribute('onclick');
    btn.addEventListener('click', () => {
      const m = modal({
        title:'退出登录',
        body:'<p class="confirm-copy">确定要退出当前账号吗？当前原型不会真正注销账号。</p>',
        actions:'<button class="ghost-btn" type="button" data-cancel>取消</button><button class="danger-btn" type="button" data-confirm>退出登录</button>'
      });
      $('[data-cancel]', m.overlay).addEventListener('click', m.close);
      $('[data-confirm]', m.overlay).addEventListener('click', () => { m.close(); toast('已模拟退出登录'); });
    });
  });

  // ---------- Personal profile basics ----------
  const profileNameKey = 'himakers-profile-name-v1';
  const profileBioKey = 'himakers-profile-bio-v1';
  const profileBirthdayKey = 'himakers-profile-birthday-v1';
  const profileGenderKey = 'himakers-profile-gender-v1';
  const savedProfileName = localStorage.getItem(profileNameKey);
  if (savedProfileName) {
    $$('[data-profile-name]').forEach(el => {
      const level = $('.level', el);
      el.childNodes[0].nodeValue = `${savedProfileName} `;
      if (level && level.parentNode !== el) el.appendChild(level);
    });
    $$('.popover-user-name').forEach(el => {
      const level = $('.popover-user-level', el);
      el.childNodes[0].nodeValue = `${savedProfileName} `;
      if (level && level.parentNode !== el) el.appendChild(level);
    });
  }
  // Profile editing lives on its own page.
  const profileEditForm = $('[data-profile-edit-form]');
  if (profileEditForm) {
    const nameInput = $('[data-profile-edit-name]', profileEditForm);
    const bioInput = $('[data-profile-edit-bio]', profileEditForm);
    const birthdayInput = $('[data-profile-edit-birthday]', profileEditForm);
    const genderInput = $('[data-profile-edit-gender]', profileEditForm);
    const interestWrap = $('[data-interest-tags]', profileEditForm);
    const interestAddButton = $('[data-interest-add]', profileEditForm);
    const profileTagsKey = 'himakers-profile-tags-v2';
    const defaultTags = ['3D 打印','机械结构','激光切割','CNC','AI 创作','模型制作'];
    const avatarPreview = $('[data-profile-edit-avatar]', profileEditForm);
    const avatarButton = $('[data-profile-edit-avatar-button]', profileEditForm);
    const avatarInput = $('[data-profile-edit-avatar-input]', profileEditForm);
    const savedAvatar = localStorage.getItem(avatarStorage);
    const currentName = localStorage.getItem(profileNameKey) || '创客小宇';
    const currentBio = localStorage.getItem(profileBioKey) || '热爱创作，把灵感变成作品。';
    const currentBirthday = localStorage.getItem(profileBirthdayKey) || '';
    const currentGender = localStorage.getItem(profileGenderKey) || '';
    let savedTags;
    try { savedTags = JSON.parse(localStorage.getItem(profileTagsKey) || 'null'); } catch (_) {}
    if (!Array.isArray(savedTags)) savedTags = defaultTags.slice();
    let pendingTags = savedTags.slice();
    let pendingAvatar = savedAvatar || null;
    if (nameInput) nameInput.value = currentName;
    if (bioInput) bioInput.value = currentBio;
    if (birthdayInput) birthdayInput.value = currentBirthday;
    if (genderInput) genderInput.value = currentGender;
    if (savedAvatar && avatarPreview) avatarPreview.src = savedAvatar;

    function renderInterestTags() {
      if (!interestWrap || !interestAddButton) return;
      interestWrap.querySelectorAll('[data-interest-tag-item]').forEach(node => node.remove());
      pendingTags.forEach(tag => {
        const chip = document.createElement('span');
        chip.className = 'interest-tag-chip';
        chip.dataset.interestTagItem = tag;
        chip.append(document.createTextNode(tag));
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'interest-tag-remove';
        remove.dataset.interestRemove = tag;
        remove.setAttribute('aria-label', `删除标签 ${tag}`);
        remove.textContent = '×';
        chip.appendChild(remove);
        interestWrap.insertBefore(chip, interestAddButton);
      });
    }
    renderInterestTags();

    interestWrap?.addEventListener('click', e => {
      const remove = e.target.closest('[data-interest-remove]');
      if (!remove) return;
      pendingTags = pendingTags.filter(tag => tag !== remove.dataset.interestRemove);
      renderInterestTags();
    });
    // 兴趣标签库：点击「+ 添加」弹出标签库，可勾选（含自定义标签）
    const tagLibraryGroups = [
      { title:'创作方式', tags:['3D 打印','激光切割','CNC','手工制作','电子焊接'] },
      { title:'设计工具', tags:['Fusion 360','Blender','SketchUp','Rhino','CAD 制图'] },
      { title:'兴趣方向', tags:['机械结构','电子电路','AI 创作','机器人','开源硬件'] },
      { title:'材料工艺', tags:['PLA','光敏树脂','木材','亚克力','金属加工'] },
      { title:'主题社区', tags:['模型制作','家居好物','教育创客','产品设计','结构实验'] }
    ];
    const interestTagLimit = 8;
    const escapeTag = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

    function openTagLibrary() {
      let picked = pendingTags.slice();
      const m = modal({
        title:'兴趣标签库',
        body:`<div class="tag-library">
          <div class="tag-library-search">
            <span class="tag-library-search-icon" aria-hidden="true">${icon('search')}</span>
            <input type="search" autocomplete="off" spellcheck="false" placeholder="搜索标签，如 3D、Blender、电路" data-tag-search aria-label="搜索标签库">
            <button class="tag-library-search-clear" type="button" data-tag-search-clear aria-label="清空搜索词" hidden>${icon('close')}</button>
          </div>
          <div class="tag-library-selected">
            <span class="tag-library-selected-label">已选 <b data-tag-count>0</b> / ${interestTagLimit}</span>
            <div class="tag-library-selected-list" data-tag-picked-list></div>
          </div>
          <div class="tag-library-groups">
            ${tagLibraryGroups.map(group => `
              <section class="tag-library-group">
                <h4>${escapeTag(group.title)}</h4>
                <div class="tag-library-chips">
                  ${group.tags.map(tag => `<button class="tag-library-chip" type="button" data-tag-pick="${escapeTag(tag)}">${escapeTag(tag)}</button>`).join('')}
                </div>
              </section>`).join('')}
          </div>
          <p class="tag-library-empty" data-tag-empty hidden>没有找到匹配的标签，换个关键词试试</p>
        </div>`,
        actions:'<button class="ghost-btn" type="button" data-cancel>取消</button><button class="primary-btn compact" type="button" data-tag-confirm>确认</button>'
      });

      const pickedList = $('[data-tag-picked-list]', m.overlay);
      const countEl = $('[data-tag-count]', m.overlay);
      const chipButtons = $$('[data-tag-pick]', m.overlay);
      const groupSections = $$('.tag-library-group', m.overlay);
      const searchInput = $('[data-tag-search]', m.overlay);
      const searchClear = $('[data-tag-search-clear]', m.overlay);
      const emptyEl = $('[data-tag-empty]', m.overlay);

      // 命中片段高亮：忽略大小写与空格差异，"fusion360" 也能命中 "Fusion 360"
      function highlightTag(tag, query) {
        const q = query.replace(/\s+/g, '').toLowerCase();
        if (!q) return escapeTag(tag);
        const flat = [];
        for (let i = 0; i < tag.length; i += 1) {
          if (!/\s/.test(tag.charAt(i))) flat.push({ ch: tag.charAt(i).toLowerCase(), at: i });
        }
        const hit = flat.map(item => item.ch).join('').indexOf(q);
        if (hit < 0) return null;
        const start = flat[hit].at;
        const end = flat[hit + q.length - 1].at + 1;
        return `${escapeTag(tag.slice(0, start))}<mark class="tag-library-hit">${escapeTag(tag.slice(start, end))}</mark>${escapeTag(tag.slice(end))}`;
      }

      function paintTagLibrary() {
        const query = (searchInput.value || '').trim();
        countEl.textContent = String(picked.length);
        pickedList.innerHTML = picked.length
          ? picked.map(tag => `<span class="tag-library-tag">${escapeTag(tag)}<button type="button" data-tag-unpick="${escapeTag(tag)}" aria-label="移除标签 ${escapeTag(tag)}">×</button></span>`).join('')
          : '<span class="tag-library-selected-empty">还没有选择标签</span>';
        let matched = 0;
        chipButtons.forEach(btn => {
          const tag = btn.dataset.tagPick;
          const marked = highlightTag(tag, query);
          const on = picked.includes(tag);
          btn.hidden = marked === null;
          btn.classList.toggle('is-selected', on);
          btn.innerHTML = `${on ? '<span class="tag-library-chip-check" aria-hidden="true">✓</span>' : ''}${marked === null ? escapeTag(tag) : marked}`;
          if (marked !== null) matched += 1;
        });
        groupSections.forEach(section => {
          section.hidden = !section.querySelector('[data-tag-pick]:not([hidden])');
        });
        emptyEl.hidden = matched > 0;
        searchClear.hidden = !query;
      }

      function toggleTag(tag) {
        const idx = picked.indexOf(tag);
        if (idx >= 0) { picked.splice(idx, 1); return paintTagLibrary(); }
        if (picked.length >= interestTagLimit) return toast(`最多选择 ${interestTagLimit} 个标签`);
        picked.push(tag);
        paintTagLibrary();
      }

      chipButtons.forEach(btn => btn.addEventListener('click', () => toggleTag(btn.dataset.tagPick)));
      pickedList.addEventListener('click', e => {
        const btn = e.target.closest('[data-tag-unpick]');
        if (btn) toggleTag(btn.dataset.tagUnpick);
      });

      searchInput.addEventListener('input', paintTagLibrary);
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Escape' && searchInput.value) {
          e.preventDefault();
          e.stopPropagation();
          searchInput.value = '';
          return paintTagLibrary();
        }
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const first = chipButtons.find(btn => !btn.hidden);
        if (first) toggleTag(first.dataset.tagPick);
      });
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        paintTagLibrary();
        searchInput.focus();
      });

      $('[data-cancel]', m.overlay).addEventListener('click', m.close);
      $('[data-tag-confirm]', m.overlay).addEventListener('click', () => {
        const changed = picked.length !== pendingTags.length || picked.some((tag, i) => tag !== pendingTags[i]);
        pendingTags = picked.slice();
        renderInterestTags();
        m.close();
        toast(changed ? '兴趣标签已更新，点击“保存”后生效' : '兴趣标签未修改');
      });

      paintTagLibrary();
      if (window.matchMedia('(min-width: 768px)').matches) searchInput.focus();
    }
    interestAddButton?.addEventListener('click', openTagLibrary);
    if (avatarButton && avatarInput) {
      avatarButton.addEventListener('click', () => avatarInput.click());
      avatarInput.addEventListener('change', () => {
        const file = avatarInput.files && avatarInput.files[0];
        if (!file) return;
        if (file.size > 4 * 1024 * 1024) return toast('请选择 4MB 以内的图片');
        const reader = new FileReader();
        reader.onload = () => {
          pendingAvatar = reader.result;
          if (avatarPreview) avatarPreview.src = pendingAvatar;
          toast('头像已选择，保存后生效');
        };
        reader.readAsDataURL(file);
      });
    }

    $('[data-profile-reset]', profileEditForm)?.addEventListener('click', () => {
      if (nameInput) nameInput.value = localStorage.getItem(profileNameKey) || '创客小宇';
      if (bioInput) bioInput.value = localStorage.getItem(profileBioKey) || '热爱创作，把灵感变成作品。';
      if (birthdayInput) birthdayInput.value = localStorage.getItem(profileBirthdayKey) || '';
      if (genderInput) genderInput.value = localStorage.getItem(profileGenderKey) || '';
      try { pendingTags = JSON.parse(localStorage.getItem(profileTagsKey) || 'null') || defaultTags.slice(); } catch (_) { pendingTags = defaultTags.slice(); }
      if (!Array.isArray(pendingTags)) pendingTags = defaultTags.slice();
      renderInterestTags();
      pendingAvatar = localStorage.getItem(avatarStorage) || null;
      if (avatarPreview) avatarPreview.src = pendingAvatar || 'assets/member/avatar.png';
      if (avatarInput) avatarInput.value = '';
      toast('已取消未保存的修改');
    });

    profileEditForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = nameInput?.value.trim() || '';
      const bio = bioInput?.value.trim() || '';
      const birthday = birthdayInput?.value || '';
      const gender = genderInput?.value || '';
      if (!name) return toast('昵称不能为空');
      localStorage.setItem(profileNameKey, name);
      localStorage.setItem(profileBioKey, bio);
      localStorage.setItem(profileBirthdayKey, birthday);
      localStorage.setItem(profileGenderKey, gender);
      localStorage.setItem(profileTagsKey, JSON.stringify(pendingTags));
      if (pendingAvatar) {
        try { localStorage.setItem(avatarStorage, pendingAvatar); } catch (_) {}
        applySavedAvatar();
      }
      toast('个人资料已保存');
    });
  }


  // ---------- Settings information architecture ----------
  const settingsTabs = $$('[data-settings-tab]');
  const settingsPanels = $$('[data-settings-panel]');
  if (settingsTabs.length && settingsPanels.length) {
    function openSettingsPanel(name, updateHash = true) {
      settingsTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.settingsTab === name));
      settingsPanels.forEach(panel => {
        const active = panel.dataset.settingsPanel === name;
        panel.hidden = !active;
        panel.classList.toggle('active', active);
      });
      if (updateHash) history.replaceState(null, '', `#${name}`);
    }
    settingsTabs.forEach(tab => tab.addEventListener('click', () => openSettingsPanel(tab.dataset.settingsTab)));
    const initial = location.hash.replace('#','');
    if (settingsTabs.some(tab => tab.dataset.settingsTab === initial)) openSettingsPanel(initial, false);

    const emailKey = 'himakers-account-email-v1';
    const phoneKey = 'himakers-account-phone-v1';
    const savedEmail = localStorage.getItem(emailKey);
    const savedPhone = localStorage.getItem(phoneKey);
    if (savedEmail) $$('[data-account-email]').forEach(el => el.textContent = savedEmail);
    if (savedPhone) $$('[data-account-phone]').forEach(el => el.textContent = savedPhone);

    // Address book: multiple shipping and billing addresses, each type has its own default.
    const addressBookKey = 'himakers-address-book-v3';
    const addressBookDefaults = {
      shipping: [
        { id:'ship-home', country:'China', firstName:'创客', lastName:'小宇', street:'示例街道 88 号', apt:'HiMakers 创作中心', city:'北京', state:'朝阳区', zip:'100020', countryCode:'+86', phone:'138 2624 6218', isDefault:true },
        { id:'ship-office', country:'China', firstName:'创客', lastName:'小宇', street:'学院路 30 号', apt:'创客实验室 2 层', city:'北京', state:'海淀区', zip:'100083', countryCode:'+86', phone:'138 2624 6218', isDefault:false },
        { id:'ship-studio', country:'China', firstName:'创客', lastName:'小宇', street:'长阳创客社区 A3-108', apt:'', city:'北京', state:'房山区', zip:'102401', countryCode:'+86', phone:'138 2624 6218', isDefault:false }
      ],
      billing: [
        { id:'bill-company', country:'China', firstName:'创客', lastName:'小宇', street:'示例街道 88 号', apt:'HiMakers 创作中心', city:'北京', state:'朝阳区', zip:'100020', countryCode:'+86', phone:'138 2624 6218', isDefault:true },
        { id:'bill-personal', country:'China', firstName:'创客', lastName:'小宇', street:'学院路 30 号', apt:'5 栋 201', city:'北京', state:'海淀区', zip:'100083', countryCode:'+86', phone:'138 2624 6218', isDefault:false }
      ]
    };
    const clone = obj => JSON.parse(JSON.stringify(obj));
    const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    let addressBook;
    try { addressBook = JSON.parse(localStorage.getItem(addressBookKey) || 'null'); } catch (_) {}
    if (!addressBook || !Array.isArray(addressBook.shipping) || !Array.isArray(addressBook.billing)) {
      addressBook = clone(addressBookDefaults);
      localStorage.setItem(addressBookKey, JSON.stringify(addressBook));
    }

    let currentAddressType = 'shipping';
    const addressList = $('[data-address-list]');
    const addressEmpty = $('[data-address-empty]');
    const addressTabs = $$('[data-address-tab]');

    function saveAddressBook() {
      localStorage.setItem(addressBookKey, JSON.stringify(addressBook));
    }

    function normalizeDefaults(type) {
      const list = addressBook[type] || [];
      if (!list.length) return;
      if (!list.some(a => a.isDefault)) list[0].isDefault = true;
      let found = false;
      list.forEach(a => {
        if (a.isDefault && !found) found = true;
        else if (a.isDefault) a.isDefault = false;
      });
    }

    function addressDisplay(addr) {
      return {
        fullName: [addr.firstName, addr.lastName].filter(Boolean).join(' ') || '未填写姓名',
        phone: [addr.countryCode, addr.phone].filter(Boolean).join(' '),
        line1: [addr.street, addr.apt].filter(Boolean).join('，'),
        line2: [addr.city, addr.state, addr.zip].filter(Boolean).join(' · ')
      };
    }

    function renderAddressBook(type = currentAddressType) {
      currentAddressType = type;
      addressTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.addressTab === type));
      ['shipping','billing'].forEach(kind => {
        const count = $(`[data-address-count="${kind}"]`);
        if (count) count.textContent = addressBook[kind].length;
      });
      const list = addressBook[type] || [];
      if (!addressList) return;
      addressList.innerHTML = list.map(addr => {
        const { fullName, phone, line1, line2 } = addressDisplay(addr);
        return `
        <article class="address-card ${addr.isDefault ? 'is-default' : ''}" data-address-id="${esc(addr.id)}">
          <div class="address-card-main">
            <div class="address-card-head">
              <strong>${esc(fullName)}</strong>
              ${addr.isDefault ? '<span class="address-default">默认地址</span>' : ''}
            </div>
            <div class="address-card-phone">${esc(phone)}</div>
            <p>${esc(line1)}</p>
            <small>${esc([addr.country, line2].filter(Boolean).join(' · '))}</small>
          </div>
          <div class="address-card-actions">
            ${addr.isDefault
              ? '<button class="address-action-link is-current-default" type="button" aria-disabled="true">当前默认地址</button>'
              : '<button class="address-action-link" data-set-default type="button">设为默认地址</button>'}
            ${type === 'shipping'
              ? '<button class="address-action-link" data-sync-to-billing type="button">同步到账单地址</button>'
              : ''}
            <button class="address-action-link" data-edit-address type="button">编辑</button>
            <button class="address-action-link danger" data-delete-address type="button">删除</button>
          </div>
        </article>`;
      }).join('');
      if (addressEmpty) addressEmpty.hidden = list.length > 0;
    }

    function addressEditor(type = currentAddressType, id = null) {
      const isNew = !id;
      const source = id ? addressBook[type].find(item => item.id === id) : null;
      const data = source || { country:'China', firstName:'', lastName:'', street:'', apt:'', city:'', state:'', zip:'', countryCode:'+86', phone:'', isDefault:addressBook[type].length === 0 };
      const m = modal({
        title: isNew ? '新增地址' : '编辑地址',
        body:`<div class="settings-modal-form address-modal-form">
          <label>国家 / 地区
            <select data-address-country>
              <option value="China" ${data.country==='China'?'selected':''}>中国</option>
              <option value="United States" ${data.country==='United States'?'selected':''}>美国</option>
              <option value="Singapore" ${data.country==='Singapore'?'selected':''}>新加坡</option>
              <option value="United Kingdom" ${data.country==='United Kingdom'?'selected':''}>英国</option>
            </select>
          </label>
          <div class="settings-modal-grid">
            <label>名字<input data-address-first-name value="${esc(data.firstName)}" placeholder="请输入名字"></label>
            <label>姓氏<input data-address-last-name value="${esc(data.lastName)}" placeholder="请输入姓氏"></label>
          </div>
          <label>街道地址<input data-address-street value="${esc(data.street)}" placeholder="街道、门牌号"></label>
          <label>公寓 / 套房 / 楼栋（选填）<input data-address-apt value="${esc(data.apt)}" placeholder="公寓、套房、楼栋等"></label>
          <div class="settings-modal-grid address-modal-grid-three">
            <label>城市<input data-address-city value="${esc(data.city)}" placeholder="城市"></label>
            <label>省 / 州<input data-address-state value="${esc(data.state)}" placeholder="省 / 州"></label>
            <label>邮政编码<input data-address-zip value="${esc(data.zip)}" placeholder="邮政编码"></label>
          </div>
          <div class="settings-modal-grid address-phone-grid">
            <label>国家区号
              <select data-address-country-code>
                <option value="+86" ${data.countryCode==='+86'?'selected':''}>+86</option>
                <option value="+1" ${data.countryCode==='+1'?'selected':''}>+1</option>
                <option value="+65" ${data.countryCode==='+65'?'selected':''}>+65</option>
                <option value="+44" ${data.countryCode==='+44'?'selected':''}>+44</option>
              </select>
            </label>
            <label>手机号码<input data-address-phone value="${esc(data.phone)}" placeholder="请输入手机号码"></label>
          </div>
          <label class="address-default-check"><input data-address-default-input type="checkbox" ${data.isDefault ? 'checked' : ''}><span>设为${type === 'billing' ? '默认账单地址' : '默认收货地址'}</span></label>
        </div>`,
        actions:'<button class="ghost-btn" type="button" data-cancel>取消</button><button class="primary-btn compact" type="button" data-save-address>保存地址</button>'
      });
      $('[data-cancel]', m.overlay).addEventListener('click', m.close);
      $('[data-save-address]', m.overlay).addEventListener('click', () => {
        const country = $('[data-address-country]', m.overlay).value;
        const firstName = $('[data-address-first-name]', m.overlay).value.trim();
        const lastName = $('[data-address-last-name]', m.overlay).value.trim();
        const street = $('[data-address-street]', m.overlay).value.trim();
        const apt = $('[data-address-apt]', m.overlay).value.trim();
        const city = $('[data-address-city]', m.overlay).value.trim();
        const state = $('[data-address-state]', m.overlay).value.trim();
        const zip = $('[data-address-zip]', m.overlay).value.trim();
        const countryCode = $('[data-address-country-code]', m.overlay).value;
        const phone = $('[data-address-phone]', m.overlay).value.trim();
        const isDefault = $('[data-address-default-input]', m.overlay).checked;
        if (!firstName || !lastName || !street || !city || !state || !zip || !phone) return toast('请填写完整的地址与联系方式');
        const payload = { id: id || `addr-${Date.now()}`, country, firstName, lastName, street, apt, city, state, zip, countryCode, phone, isDefault };
        if (id) {
          const idx = addressBook[type].findIndex(item => item.id === id);
          if (idx >= 0) addressBook[type][idx] = payload;
        } else {
          addressBook[type].push(payload);
        }
        if (isDefault) addressBook[type].forEach(item => { item.isDefault = item.id === payload.id; });
        normalizeDefaults(type);
        saveAddressBook();
        m.close();
        renderAddressBook(type);
        toast(isNew ? '地址已添加' : '地址已更新');
      });
    }

    // 收货地址 → 账单地址：一键复制同步
    function syncAddressToBilling(item) {
      const { fullName, phone, line1, line2 } = addressDisplay(item);
      const isDuplicate = addressBook.billing.some(a =>
        a.country === item.country && a.firstName === item.firstName && a.lastName === item.lastName &&
        a.street === item.street && a.apt === item.apt && a.city === item.city &&
        a.state === item.state && a.zip === item.zip && a.phone === item.phone);
      const makeDefault = addressBook.billing.length === 0;
      const m = modal({
        title: '同步到账单地址',
        body: `<div class="settings-modal-form">
          <p class="address-sync-note">将把这条收货地址复制成一条新的账单地址，原收货地址不受影响。</p>
          <div class="address-sync-preview">
            <strong>${esc(fullName)} · ${esc(phone)}</strong>
            <p>${esc(line1)}</p>
            <small>${esc([item.country, line2].filter(Boolean).join(' · '))}</small>
          </div>
          ${isDuplicate ? '<p class="address-sync-warn">账单地址中已存在内容相同的地址，继续同步会新增一条。</p>' : ''}
          <label class="address-default-check"><input data-sync-as-default type="checkbox" ${makeDefault ? 'checked' : ''}><span>同步后设为默认账单地址</span></label>
        </div>`,
        actions:'<button class="ghost-btn" type="button" data-cancel>取消</button><button class="primary-btn compact" type="button" data-sync-confirm>同步到账单地址</button>'
      });
      $('[data-cancel]', m.overlay).addEventListener('click', m.close);
      $('[data-sync-confirm]', m.overlay).addEventListener('click', () => {
        const asDefault = $('[data-sync-as-default]', m.overlay).checked;
        const payload = { ...item, id: `bill-${Date.now()}`, isDefault: asDefault };
        addressBook.billing.push(payload);
        if (asDefault) addressBook.billing.forEach(a => { a.isDefault = a.id === payload.id; });
        normalizeDefaults('billing');
        saveAddressBook();
        m.close();
        renderAddressBook('billing');
        toast('已同步到账单地址');
      });
    }

    addressTabs.forEach(tab => tab.addEventListener('click', () => renderAddressBook(tab.dataset.addressTab)));
    $('[data-add-address]')?.addEventListener('click', () => addressEditor(currentAddressType));
    addressList?.addEventListener('click', e => {
      const card = e.target.closest('[data-address-id]');
      if (!card) return;
      const id = card.dataset.addressId;
      const item = addressBook[currentAddressType].find(a => a.id === id);
      if (!item) return;
      if (e.target.closest('[data-sync-to-billing]')) return syncAddressToBilling(item);
      if (e.target.closest('[data-edit-address]')) return addressEditor(currentAddressType, id);
      if (e.target.closest('[data-set-default]')) {
        addressBook[currentAddressType].forEach(a => { a.isDefault = a.id === id; });
        saveAddressBook(); renderAddressBook(currentAddressType); toast('默认地址已更新');
        return;
      }
      if (e.target.closest('[data-delete-address]')) {
        const m = modal({
          title:'删除地址',
          body:`<p class="confirm-copy">确定删除「${esc([item.firstName,item.lastName].filter(Boolean).join(' ') || '该地址')}」这条地址吗？</p>`,
          actions:'<button class="ghost-btn" type="button" data-cancel>取消</button><button class="danger-btn" type="button" data-confirm>删除</button>'
        });
        $('[data-cancel]', m.overlay).addEventListener('click', m.close);
        $('[data-confirm]', m.overlay).addEventListener('click', () => {
          addressBook[currentAddressType] = addressBook[currentAddressType].filter(a => a.id !== id);
          normalizeDefaults(currentAddressType);
          saveAddressBook(); m.close(); renderAddressBook(currentAddressType); toast('地址已删除');
        });
      }
    });
    renderAddressBook('shipping');

    function verifyIdentity(purpose, onVerified) {
      const maskedPhone = $('[data-account-phone]')?.textContent || '+86 138****6218';
      const m = modal({
        title:'身份验证',
        body:`<div class="settings-modal-form">
          <div class="verify-note">为了保护账号安全，${purpose}前需要先验证当前身份。验证码将发送至绑定手机号 ${esc(maskedPhone)}。</div>
          <div class="verify-code-row">
            <label>验证码<input type="text" inputmode="numeric" maxlength="6" data-verify-code placeholder="请输入 6 位验证码"></label>
            <button type="button" data-send-verify-code>获取验证码</button>
          </div>
        </div>`,
        actions:'<button class="ghost-btn" type="button" data-cancel>取消</button><button class="primary-btn compact" type="button" data-verify-next>验证并继续</button>'
      });
      $('[data-cancel]', m.overlay).addEventListener('click', m.close);
      const sendBtn = $('[data-send-verify-code]', m.overlay);
      sendBtn.addEventListener('click', () => {
        sendBtn.disabled = true;
        sendBtn.textContent = '已发送';
        toast('验证码已发送（原型演示）');
        setTimeout(() => { sendBtn.disabled = false; sendBtn.textContent = '重新获取'; }, 3000);
      });
      $('[data-verify-next]', m.overlay).addEventListener('click', () => {
        const code = $('[data-verify-code]', m.overlay).value.trim();
        if (!/^\d{6}$/.test(code)) return toast('请输入 6 位验证码');
        m.close();
        onVerified();
      });
    }

    function openEmailEditor() {
      const current = localStorage.getItem(emailKey) || 'maker@himakers.com';
      const m = modal({
        title:'修改绑定邮箱',
        body:`<div class="settings-modal-form">
          <label>新邮箱<input type="email" data-new-email value="${esc(current)}" placeholder="name@example.com"></label>
          <div class="verify-code-row">
            <label>新邮箱验证码<input type="text" inputmode="numeric" maxlength="6" data-new-email-code placeholder="请输入 6 位验证码"></label>
            <button type="button" data-send-new-email-code>获取验证码</button>
          </div>
        </div>`,
        actions:'<button class="ghost-btn" type="button" data-cancel>取消</button><button class="primary-btn compact" type="button" data-save-email>确认修改</button>'
      });
      $('[data-cancel]', m.overlay).addEventListener('click', m.close);
      $('[data-send-new-email-code]', m.overlay).addEventListener('click', e => {
        const email = $('[data-new-email]', m.overlay).value.trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) return toast('请先输入有效的新邮箱');
        e.currentTarget.textContent = '已发送';
        toast('新邮箱验证码已发送（原型演示）');
      });
      $('[data-save-email]', m.overlay).addEventListener('click', () => {
        const value = $('[data-new-email]', m.overlay).value.trim();
        const code = $('[data-new-email-code]', m.overlay).value.trim();
        if (!/^\S+@\S+\.\S+$/.test(value)) return toast('请输入有效邮箱');
        if (!/^\d{6}$/.test(code)) return toast('请输入新邮箱收到的 6 位验证码');
        localStorage.setItem(emailKey, value);
        $$('[data-account-email]').forEach(el => el.textContent = value);
        m.close(); toast('绑定邮箱已更新');
      });
    }

    $('[data-change-email]')?.addEventListener('click', () => verifyIdentity('修改绑定邮箱', openEmailEditor));

    function openPhoneEditor() {
      const current = localStorage.getItem(phoneKey) || '+86 13826246218';
      const m = modal({
        title:'修改绑定手机号',
        body:`<div class="settings-modal-form">
          <div class="settings-modal-grid">
            <label>国家区号<input type="text" data-phone-code value="+86" placeholder="+86"></label>
            <label>新手机号<input type="tel" data-new-phone value="${esc(current.replace(/^\+\d+\s*/, ''))}" placeholder="请输入手机号"></label>
          </div>
          <div class="verify-code-row">
            <label>新手机号验证码<input type="text" inputmode="numeric" maxlength="6" data-new-phone-code placeholder="请输入 6 位验证码"></label>
            <button type="button" data-send-new-phone-code>获取验证码</button>
          </div>
        </div>`,
        actions:'<button class="ghost-btn" type="button" data-cancel>取消</button><button class="primary-btn compact" type="button" data-save-phone>确认修改</button>'
      });
      $('[data-cancel]', m.overlay).addEventListener('click', m.close);
      $('[data-send-new-phone-code]', m.overlay).addEventListener('click', e => {
        const phone = $('[data-new-phone]', m.overlay).value.replace(/\s+/g,'').trim();
        if (!/^\d{6,15}$/.test(phone)) return toast('请先输入有效的新手机号');
        e.currentTarget.textContent = '已发送';
        toast('新手机号验证码已发送（原型演示）');
      });
      $('[data-save-phone]', m.overlay).addEventListener('click', () => {
        const code = $('[data-phone-code]', m.overlay).value.trim() || '+86';
        const phone = $('[data-new-phone]', m.overlay).value.replace(/\s+/g,'').trim();
        const verifyCode = $('[data-new-phone-code]', m.overlay).value.trim();
        if (!/^\d{6,15}$/.test(phone)) return toast('请输入有效手机号');
        if (!/^\d{6}$/.test(verifyCode)) return toast('请输入新手机号收到的 6 位验证码');
        const stored = `${code} ${phone}`;
        localStorage.setItem(phoneKey, stored);
        const masked = phone.length >= 7 ? `${code} ${phone.slice(0,3)}****${phone.slice(-4)}` : stored;
        $$('[data-account-phone]').forEach(el => el.textContent = masked);
        m.close(); toast('绑定手机号已更新');
      });
    }

    $('[data-change-phone]')?.addEventListener('click', () => verifyIdentity('修改绑定手机号', openPhoneEditor));

    function openPasswordEditor() {
      const m = modal({
        title:'设置新密码',
        body:`<div class="settings-modal-form"><label>新密码<input type="password" data-new-password placeholder="至少 8 位"></label><label>确认新密码<input type="password" data-confirm-password placeholder="再次输入新密码"></label></div>`,
        actions:'<button class="ghost-btn" type="button" data-cancel>取消</button><button class="primary-btn compact" type="button" data-save-password>确认修改</button>'
      });
      $('[data-cancel]', m.overlay).addEventListener('click', m.close);
      $('[data-save-password]', m.overlay).addEventListener('click', () => {
        const a = $('[data-new-password]', m.overlay).value;
        const b = $('[data-confirm-password]', m.overlay).value;
        if (a.length < 8) return toast('新密码至少 8 位');
        if (a !== b) return toast('两次输入的密码不一致');
        m.close(); toast('密码已修改（原型演示）');
      });
    }

    $('[data-change-password]')?.addEventListener('click', () => verifyIdentity('修改登录密码', openPasswordEditor));

    $('[data-manage-social]')?.addEventListener('click', () => {
      const m = modal({
        title:'登录方式管理',
        body:`<div class="settings-list">
          <div class="settings-row"><div><strong>微信</strong><span>已绑定</span></div><button type="button" data-social-action="wechat">解绑</button></div>
          <div class="settings-row"><div><strong>手机</strong><span>已绑定</span></div><button type="button" disabled>已绑定</button></div>
          <div class="settings-row"><div><strong>Google</strong><span>未绑定</span></div><button type="button" data-social-action="google">绑定</button></div>
          <div class="settings-row"><div><strong>Apple</strong><span>未绑定</span></div><button type="button" data-social-action="apple">绑定</button></div>
          <div class="settings-row"><div><strong>Facebook</strong><span>未绑定</span></div><button type="button" data-social-action="facebook">绑定</button></div>
        </div>`
      });
      $$('[data-social-action]', m.overlay).forEach(btn => btn.addEventListener('click', () => toast(`${btn.textContent}操作已提交（原型演示）`)));
    });

    $('[data-manage-devices]')?.addEventListener('click', () => {
      const m = modal({
        title:'登录设备',
        body:'<div class="settings-list"><div class="settings-row"><div><strong>Windows · Chrome</strong><span>当前设备 · 新加坡</span></div><button type="button" disabled>当前</button></div><div class="settings-row"><div><strong>iPhone · Safari</strong><span>最近登录：今天 09:42</span></div><button type="button" data-remove-device>退出</button></div></div>'
      });
      $('[data-remove-device]', m.overlay)?.addEventListener('click', e => { e.currentTarget.closest('.settings-row').remove(); toast('已退出该设备'); });
    });

    $('[data-delete-account]')?.addEventListener('click', () => {
      const m = modal({
        title:'注销账号',
        body:'<p class="confirm-copy">注销后账号、作品、订单与个人数据将无法恢复。当前原型仅演示确认流程，不会真的注销。</p>',
        actions:'<button class="ghost-btn" type="button" data-cancel>取消</button><button class="danger-btn" type="button" data-confirm-delete>确认注销</button>'
      });
      $('[data-cancel]', m.overlay).addEventListener('click', m.close);
      $('[data-confirm-delete]', m.overlay).addEventListener('click', () => { m.close(); toast('已模拟提交注销申请'); });
    });

    const prefKey = 'himakers-preferences-v1';
    let prefs = {};
    try { prefs = JSON.parse(localStorage.getItem(prefKey) || '{}') || {}; } catch(_) {}
    $$('[data-pref]').forEach(input => {
      if (Object.prototype.hasOwnProperty.call(prefs, input.dataset.pref)) input.checked = !!prefs[input.dataset.pref];
      input.addEventListener('change', () => {
        prefs[input.dataset.pref] = input.checked;
        localStorage.setItem(prefKey, JSON.stringify(prefs));
        toast('偏好已保存');
      });
    });
    $('[data-language]')?.addEventListener('click', e => openLanguageMenu(e.currentTarget));

    // 帮助与反馈：点「反馈」弹出反馈表单（类型 / 描述 / 截图 / 联系方式）
    const feedbackTypes = ['功能建议', '问题反馈', '内容有误', '其他'];
    const feedbackDescLimit = 500;
    const feedbackShotLimit = 3;
    const feedbackKey = 'himakers-feedback-v1';

    function openFeedbackModal() {
      const fesc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
      let feedbackType = feedbackTypes[0];
      let shots = [];
      const contact = localStorage.getItem('himakers-account-email-v1')
        || localStorage.getItem('himakers-account-phone-v1')
        || 'maker@himakers.com';
      const m = modal({
        title:'帮助与反馈',
        className:'feedback-modal',
        body:`<div class="feedback-form">
          <div class="feedback-block">
            <span class="feedback-label">反馈类型</span>
            <div class="feedback-types" role="group" aria-label="反馈类型">
              ${feedbackTypes.map((item, i) => `<button class="feedback-type${i === 0 ? ' is-active' : ''}" type="button" data-feedback-type="${fesc(item)}">${fesc(item)}</button>`).join('')}
            </div>
          </div>
          <div class="feedback-block">
            <label class="feedback-label" for="feedback-desc">问题描述</label>
            <textarea class="feedback-textarea" id="feedback-desc" maxlength="${feedbackDescLimit}" placeholder="请描述你遇到的问题或想法，越具体越有助于我们定位（例如：在设备绑定页刷新后列表消失）" data-feedback-desc></textarea>
            <div class="feedback-counter"><b data-feedback-count>0</b> / ${feedbackDescLimit}</div>
          </div>
          <div class="feedback-block">
            <span class="feedback-label">上传截图 <i class="feedback-optional">选填，最多 ${feedbackShotLimit} 张</i></span>
            <div class="feedback-shots" data-feedback-shots></div>
            <input type="file" accept="image/*" multiple hidden data-feedback-file>
          </div>
          <div class="feedback-block">
            <label class="feedback-label" for="feedback-contact">联系方式 <i class="feedback-optional">选填，便于我们回复你</i></label>
            <input class="feedback-input" id="feedback-contact" type="text" value="${fesc(contact)}" placeholder="手机号或邮箱" data-feedback-contact>
          </div>
          <p class="feedback-note">提交后我们会尽快查看；当前为原型演示，不会真正上传数据。</p>
        </div>`,
        actions:'<button class="ghost-btn" type="button" data-cancel>取消</button><button class="primary-btn compact" type="button" data-feedback-submit>提交反馈</button>'
      });

      const descInput = $('[data-feedback-desc]', m.overlay);
      const countEl = $('[data-feedback-count]', m.overlay);
      const shotsHost = $('[data-feedback-shots]', m.overlay);
      const fileInput = $('[data-feedback-file]', m.overlay);

      function paintShots() {
        shotsHost.innerHTML = shots.map((src, i) => `<span class="feedback-shot"><img src="${src}" alt="截图 ${i + 1}"/><button type="button" data-shot-remove="${i}" aria-label="移除截图 ${i + 1}">×</button></span>`).join('')
          + (shots.length < feedbackShotLimit ? '<button class="feedback-shot-add" type="button" data-shot-add aria-label="添加截图">+</button>' : '');
      }
      paintShots();

      shotsHost.addEventListener('click', e => {
        if (e.target.closest('[data-shot-add]')) return fileInput.click();
        const remove = e.target.closest('[data-shot-remove]');
        if (!remove) return;
        shots.splice(Number(remove.dataset.shotRemove), 1);
        paintShots();
      });

      fileInput.addEventListener('change', () => {
        const files = [...(fileInput.files || [])];
        fileInput.value = '';
        if (!files.length) return;
        let overflow = false;
        files.forEach(file => {
          if (shots.length >= feedbackShotLimit) { overflow = true; return; }
          if (!/^image\//.test(file.type)) return toast('仅支持图片文件');
          if (file.size > 3 * 1024 * 1024) return toast(`${file.name} 超过 3MB，已跳过`);
          const reader = new FileReader();
          reader.onload = () => { shots.push(reader.result); paintShots(); };
          reader.readAsDataURL(file);
        });
        if (overflow) toast(`最多上传 ${feedbackShotLimit} 张截图`);
      });

      descInput.addEventListener('input', () => { countEl.textContent = String(descInput.value.length); });

      $$('[data-feedback-type]', m.overlay).forEach(btn => btn.addEventListener('click', () => {
        feedbackType = btn.dataset.feedbackType;
        $$('[data-feedback-type]', m.overlay).forEach(item => item.classList.toggle('is-active', item === btn));
      }));

      const stamp = () => {
        const d = new Date();
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
      };

      $('[data-cancel]', m.overlay).addEventListener('click', m.close);
      $('[data-feedback-submit]', m.overlay).addEventListener('click', () => {
        const desc = descInput.value.trim();
        if (desc.length < 5) {
          descInput.focus();
          return toast('请再补充一些描述（至少 5 个字）');
        }
        const id = `FB-${stamp()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        try {
          const list = JSON.parse(localStorage.getItem(feedbackKey) || '[]');
          list.unshift({ id, type: feedbackType, desc, contact: $('[data-feedback-contact]', m.overlay).value.trim(), shots: shots.length, at: new Date().toISOString() });
          localStorage.setItem(feedbackKey, JSON.stringify(list.slice(0, 20)));
        } catch (_) {}
        $('.app-modal-body', m.overlay).innerHTML = `
          <div class="feedback-success">
            <span class="feedback-success-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 13 4.5 4.5L19 7"/></svg></span>
            <strong>反馈已提交，感谢你的建议</strong>
            <p>反馈编号 <b>${id}</b> · 类型：${fesc(feedbackType)}${shots.length ? ` · 截图 ${shots.length} 张` : ''}</p>
            <p class="feedback-success-note">我们会在 1-2 个工作日内通过你留下的联系方式回复。当前为原型演示，数据未真正上传。</p>
          </div>`;
        $('.app-modal-actions', m.overlay).innerHTML = '<button class="primary-btn compact" type="button" data-feedback-done>完成</button>';
        $('[data-feedback-done]', m.overlay).addEventListener('click', () => { m.close(); toast('感谢你的反馈'); });
      });
    }
    $('[data-feedback-open]')?.addEventListener('click', openFeedbackModal);
    $$('[data-about-link]').forEach(btn => btn.addEventListener('click', () => toast(`${btn.dataset.aboutLink}页面暂未接入`)));
  }

  // ---------- Personal home stats ----------
  $$('.over-stat').forEach(stat => {
    const label = $('span', stat)?.textContent.trim();
    if (!label) return;
    stat.classList.add('is-clickable');
    stat.tabIndex = 0;
    const go = () => {
      if (label === '积分') location.href = 'member-points.html';
      else if (label === '优惠券') location.href = 'member-coupons.html';
      else if (label === '设备') toast('当前已绑定 2 台设备');
      else if (label === '钱包') toast('钱包功能需接入支付系统');
      else toast(`${label}：当前为演示数据`);
    };
    stat.addEventListener('click', go);
    stat.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  });

  // ---------- Creation page ----------
  const creationTabs = $$('[data-creation-tab]');
  const creationPanels = {
    works: { grid: $('#worksGrid'), title: '暂无匹配作品', hint: '试试切换类型、状态或搜索关键词' },
    likes: { grid: $('#likedGrid'), title: '还没有点赞的作品', hint: '去社区互动看看，点赞喜欢的作品后会出现在这里' },
    saves: { grid: $('#savedGrid'), title: '还没有收藏的作品', hint: '收藏感兴趣的作品，方便以后找回来' },
    comments: { grid: $('#myCommentsList'), title: '还没有发表过评论', hint: '去社区互动参与讨论，你的评论会记录在这里' }
  };
  const creationSearchPlaceholder = {
    works: '搜索模型名称', likes: '搜索点赞的作品', saves: '搜索收藏的作品', comments: '搜索评论内容'
  };
  const worksGrid = creationPanels.works.grid;
  if (creationTabs.length && worksGrid) {
    const cards = $$('.work-card', worksGrid);
    const toolbar = $('[data-work-toolbar]');
    const filterBtns = $$('[data-work-filter]');
    const searchInput = $('#workSearchInput');
    const emptyState = $('#worksEmpty');
    const emptyTitle = emptyState ? $('strong', emptyState) : null;
    const emptyHint = emptyState ? $('span', emptyState) : null;
    let activeTab = 'works', activeStatus = '全部', activeType = '全部', activeSort = '最新优先', searchQuery = '';
    const filterOptions = {
      status: ['全部','已发布','审核中','草稿'],
      type: ['全部','3D 模型','AI 生成图','激光切割','浮雕版画'],
      sort: ['最新优先','最近编辑','下载最多','收藏最多']
    };
    const filterLabels = { status:'状态', type:'类型', sort:'排序' };

    cards.forEach((card, i) => {
      card.dataset.index = i;
      card.dataset.status = $('.badge', card)?.textContent.trim() || '全部';
      const metrics = $$('.work-metric', card);
      card.dataset.downloads = String(parseInt(metrics[0]?.textContent || '0', 10) || 0);
      card.dataset.saves = String(parseInt(metrics[1]?.textContent || '0', 10) || 0);
    });
    creationTabs.forEach(tab => {
      tab.tabIndex = 0;
      tab.addEventListener('click', () => selectCreationTab(tab.dataset.creationTab));
    });

    function applyWorks() {
      if (activeTab === 'works') {
        const sorted = [...cards].sort((a, b) => {
          if (activeSort === '最近编辑') return (b.dataset.edited || '').localeCompare(a.dataset.edited || '');
          if (activeSort === '下载最多') return Number(b.dataset.downloads || 0) - Number(a.dataset.downloads || 0) || Number(a.dataset.index) - Number(b.dataset.index);
          if (activeSort === '收藏最多') return Number(b.dataset.saves || 0) - Number(a.dataset.saves || 0) || Number(a.dataset.index) - Number(b.dataset.index);
          return (b.dataset.created || '').localeCompare(a.dataset.created || '');
        });
        sorted.forEach(card => worksGrid.appendChild(card));
      }
      const panel = creationPanels[activeTab];
      Object.keys(creationPanels).forEach(key => {
        const grid = creationPanels[key].grid;
        if (grid) grid.hidden = key !== activeTab;
      });
      let visibleCount = 0;
      if (panel && panel.grid) {
        $$('.work-card, .comment-card', panel.grid).forEach(item => {
          const title = ($('.work-title .txt', item)?.textContent || '').toLowerCase();
          const author = ($('.work-author span', item)?.textContent || '').toLowerCase();
          const statusOk = activeTab !== 'works' || activeStatus === '全部' || item.dataset.status === activeStatus;
          const typeOk = activeTab !== 'works' || activeType === '全部' || item.dataset.workType === activeType;
          const searchOk = !searchQuery || title.includes(searchQuery) || author.includes(searchQuery) || item.textContent.toLowerCase().includes(searchQuery);
          item.hidden = !(statusOk && typeOk && searchOk);
          if (!item.hidden) visibleCount += 1;
        });
      }
      if (emptyState) {
        emptyState.hidden = visibleCount !== 0;
        if (emptyTitle && panel) emptyTitle.textContent = panel.title;
        if (emptyHint && panel) emptyHint.textContent = panel.hint;
      }
    }

    function selectCreationTab(name) {
      activeTab = creationPanels[name] ? name : 'works';
      creationTabs.forEach(tab => {
        const on = tab.dataset.creationTab === activeTab;
        tab.classList.toggle('active', on);
        tab.setAttribute('aria-selected', String(on));
      });
      if (toolbar) toolbar.hidden = activeTab !== 'works';
      if (searchInput) searchInput.placeholder = creationSearchPlaceholder[activeTab] || '搜索';
      applyWorks();
    }


    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value.trim().toLowerCase();
        applyWorks();
      });
    }

    function currentFilterValue(kind) {
      if (kind === 'status') return activeStatus;
      if (kind === 'type') return activeType;
      return activeSort;
    }
    function setFilterValue(kind, value) {
      if (kind === 'status') activeStatus = value;
      else if (kind === 'type') activeType = value;
      else activeSort = value;
      const btn = $(`[data-work-filter="${kind}"]`);
      const valueEl = $(`[data-work-filter-value="${kind}"]`, btn);
      if (valueEl) valueEl.textContent = value;
      btn?.classList.toggle('is-filtered', kind !== 'sort' && value !== '全部');
      applyWorks();
    }
    filterBtns.forEach(filterBtn => {
      filterBtn.addEventListener('click', () => {
        const kind = filterBtn.dataset.workFilter;
        const current = currentFilterValue(kind);
        filterBtns.forEach(btn => btn.setAttribute('aria-expanded', String(btn === filterBtn)));
        const panel = floatPanel(filterBtn, `<div class="creation-filter-menu" role="menu" aria-label="${filterLabels[kind]}">${filterOptions[kind].map(x => `<button type="button" class="creation-filter-option ${current===x?'active':''}" data-filter-choice="${x}" role="menuitemradio" aria-checked="${current===x}"><span>${x}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg></button>`).join('')}</div>`, 'creation-filter-float');
        setTimeout(() => {
          const resetExpanded = e => {
            if (!panel.contains(e.target) && !filterBtn.contains(e.target)) {
              filterBtn.setAttribute('aria-expanded','false');
              document.removeEventListener('pointerdown', resetExpanded, true);
            }
          };
          document.addEventListener('pointerdown', resetExpanded, true);
        }, 0);
        $$('.creation-filter-option', panel).forEach(option => option.addEventListener('click', () => {
          setFilterValue(kind, option.dataset.filterChoice);
          filterBtn.setAttribute('aria-expanded','false');
          panel.remove();
        }));
      });
    });



    const createBtn = $('.primary-btn');
    function openCreate() {
      const m = modal({
        title:'开始创作',
        body:`<div class="create-options"><button type="button" data-create="ai"><strong>AI 创造</strong><span>通过文字或图片生成创意方案</span></button><button type="button" data-create="upload"><strong>上传作品</strong><span>上传已有模型或设计文件</span></button></div>`
      });
      $$('[data-create]', m.overlay).forEach(btn => btn.addEventListener('click', () => { m.close(); toast(btn.dataset.create === 'ai' ? '已进入 AI 创造流程（演示）' : '已打开上传作品流程（演示）'); }));
    }
    if (createBtn) createBtn.addEventListener('click', openCreate);
    if (new URLSearchParams(location.search).get('action') === 'create') setTimeout(openCreate, 120);
    applyWorks();
  }

  // ---------- Community cards ----------
  // Card-level detail popups are intentionally disabled.
  // Like/save interactions remain handled inside member-community.html.


  // ---------- Lightweight modules ----------
  function renderOrders() {
    // The current desktop order center is fully handled by orders.js.
    // Keep this legacy renderer disabled so it cannot overwrite the new order UI.
    if ($('[data-order-page="orders"]')) return;
    const card = $('.module-card'); if (!card) return;
    const parent = card.parentElement;
    parent.insertBefore(makeTabs([['all','全部'],['pending','待发货'],['done','已完成']],'order-filter'), card);
    card.innerHTML = `<div class="order-list">
      <article class="order-item" data-state="pending"><div class="order-head"><span>订单号 HM20260922001</span><strong>待发货</strong></div><div class="order-body"><img src="assets/member/work1.jpg" alt="桌面收纳盒"><div><h3>桌面收纳盒模型</h3><p>数量 × 1 · 数字模型</p></div><b>¥29.00</b></div><div class="order-actions"><button class="ghost-btn" data-order-detail>查看详情</button><button class="small-btn" data-order-cancel>取消订单</button></div></article>
      <article class="order-item" data-state="done"><div class="order-head"><span>订单号 HM20260918007</span><strong class="muted">已完成</strong></div><div class="order-body"><img src="assets/member/work5.jpg" alt="手机支架"><div><h3>桌面手机支架</h3><p>数量 × 1 · 数字模型</p></div><b>¥18.00</b></div><div class="order-actions"><button class="ghost-btn" data-order-detail>查看详情</button><button class="small-btn" data-buy-again>再次购买</button></div></article>
    </div>`;
    initModuleTabs('order-filter','.order-item','state');
    $$('[data-order-detail]', card).forEach(b=>b.addEventListener('click',()=>toast('已打开订单详情（演示）')));
    $$('[data-order-cancel]', card).forEach(b=>b.addEventListener('click',()=>{ if(confirm('确定取消这个订单吗？')) { b.closest('.order-item').remove(); toast('订单已取消（演示）'); } }));
    $$('[data-buy-again]', card).forEach(b=>b.addEventListener('click',()=>toast('商品已加入购物车（演示）')));
  }

  function renderPoints() {
    const card = $('.module-card'); if(!card) return;
    card.innerHTML = `<div class="record-list">
      <div class="record-row"><div><strong>每日签到</strong><span>2026-09-22 09:12</span></div><b class="plus">+20</b></div>
      <div class="record-row"><div><strong>作品被下载</strong><span>2026-09-21 18:36</span></div><b class="plus">+10</b></div>
      <div class="record-row"><div><strong>积分兑换优惠券</strong><span>2026-09-18 14:20</span></div><b>-100</b></div>
    </div>`;
    const signRow = document.createElement('div'); signRow.className='module-action-row'; signRow.innerHTML='<button class="small-btn" type="button">今日签到</button>'; const summary=$('.module-summary'); summary?.after(signRow); const sign=$('button',signRow);
    sign.addEventListener('click',()=>{ if(sign.disabled) return; sign.disabled=true; sign.textContent='今日已签到'; toast('签到成功，+20 积分（演示）'); });
  }

  function renderCoupons() {
    const card = $('.module-card'); if(!card) return;
    const parent = card.parentElement;
    const coupons = [
      {state:'available', type:'amount', value:'100', unit:'¥', note:'满 1,000 可用', code:'HMXCC100', title:'设备整机券', desc:'整机与套件类目可用，不与店铺其他优惠同享', expire:'有效期至 2026-09-25 · 仅剩 3 天', soon:true},
      {state:'available', type:'amount', value:'20', unit:'¥', note:'无门槛', code:'HMF20FREE', title:'20 元无门槛券', desc:'商城全品类可用，无最低消费门槛', expire:'有效期至 2026-10-08'},
      {state:'available', type:'discount', value:'9', unit:'折', note:'最高减 ¥50', code:'HMMODEL90', title:'模型素材折扣券', desc:'模板、模型与数字素材类目可用', expire:'有效期至 2026-10-15'},
      {state:'used', type:'amount', value:'50', unit:'¥', note:'满 500 可用', code:'HMALL50', title:'全场通用券', desc:'商城全品类可用，不与店铺其他优惠同享', expire:'已于 2026-09-10 使用'},
      {state:'used', type:'discount', value:'95', unit:'折', note:'最高减 ¥30', code:'HMMAT95', title:'耗材折扣券', desc:'指定耗材、树脂与打印材料类目可用', expire:'已于 2026-09-16 使用'},
      {state:'expired', type:'discount', value:'85', unit:'折', note:'最高减 ¥80', code:'HMPART85', title:'配件折扣券', desc:'耗材、树脂与设备配件类目可用', expire:'已于 2026-08-31 过期'},
      {state:'expired', type:'amount', value:'30', unit:'¥', note:'满 300 可用', code:'HMSEP30', title:'商城满减券', desc:'商城指定商品可用，不与其他满减活动叠加', expire:'已于 2026-09-01 过期'}
    ];
    const counts = {
      available: coupons.filter(item => item.state === 'available').length,
      used: coupons.filter(item => item.state === 'used').length,
      expired: coupons.filter(item => item.state === 'expired').length,
    };

    const oldTabs = $('.coupon-filter', parent); if (oldTabs) oldTabs.remove();
    const tabs = makeTabs([
      ['available', `可用 ${counts.available}`],
      ['used', `已使用 ${counts.used}`],
      ['expired', `已过期 ${counts.expired}`]
    ], 'coupon-filter');
    parent.insertBefore(tabs, card);

    let currentFilter = 'available';

    const renderTicket = (item) => {
      const valueHtml = item.type === 'discount'
        ? `<strong>${item.value}<em>${item.unit}</em></strong>`
        : `<strong><em>${item.unit}</em>${item.value}</strong>`;
      const actionHtml = item.state === 'available'
        ? '<button class="coupon-use-btn" type="button" data-use>立即使用</button>'
        : `<span class="coupon-state">${item.state === 'used' ? '已使用' : '已过期'}</span>`;
      return `<article class="coupon-ticket ${item.state !== 'available' ? 'is-muted' : ''} ${item.type === 'discount' ? 'coupon-ticket-discount' : ''}">
        <div class="coupon-value-panel">${valueHtml}<span>${item.note}</span></div>
        <div class="coupon-main">
          <div class="coupon-copy"><span>券码</span><code>${item.code}</code><button type="button" data-copy-code="${item.code}">复制</button></div>
          <div class="coupon-info"><h3>${item.title}</h3><p>${item.desc}</p><div class="coupon-expire ${item.soon ? 'is-soon' : ''}">${item.expire}</div></div>
        </div>
        ${actionHtml}
      </article>`;
    };

    function bindActions() {
      $$('[data-use]', card).forEach(b=>b.addEventListener('click',()=>toast('已跳转至可使用该优惠券的商品（演示）')));
      $$('[data-copy-code]', card).forEach(btn=>btn.addEventListener('click', async()=>{
        const code=btn.dataset.copyCode;
        try {
          await navigator.clipboard.writeText(code);
        } catch(e) {
          const input=document.createElement('textarea'); input.value=code; input.style.position='fixed'; input.style.opacity='0'; hmHost().appendChild(input); input.select(); document.execCommand('copy'); input.remove();
        }
        const old=btn.textContent; btn.textContent='已复制'; btn.classList.add('copied'); toast(`券码 ${code} 已复制`); setTimeout(()=>{btn.textContent=old;btn.classList.remove('copied')},1200);
      }));
    }

    function renderList() {
      const list = coupons.filter(item => item.state === currentFilter);
      card.innerHTML = `<div class="coupon-grid">${list.map(renderTicket).join('')}</div>`;
      bindActions();
    }

    const tabBtns = $$(`.coupon-filter button`, parent);
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(node => node.classList.toggle('active', node === btn));
        currentFilter = btn.dataset.filter;
        renderList();
      });
    });
    tabBtns.forEach(node => node.classList.toggle('active', node.dataset.filter === currentFilter));
    renderList();
  }

  function makeTabs(items, cls) {
    const wrap=document.createElement('div'); wrap.className=`module-tabs ${cls}`;
    wrap.innerHTML=items.map((x,i)=>`<button type="button" class="${i===0?'active':''}" data-filter="${x[0]}">${x[1]}</button>`).join(''); return wrap;
  }
  function initModuleTabs(cls, itemSel, key) {
    const tabs=$$(`.${cls} button`), items=$$(itemSel);
    const applyFilter = (tab) => {
      if (!tab) return;
      tabs.forEach(t=>t.classList.toggle('active',t===tab));
      const f=tab.dataset.filter;
      items.forEach(item=>{ const show=(f==='all'||item.dataset[key]===f); item.hidden=!show; item.style.display=show?'':'none'; });
    };
    tabs.forEach(tab=>tab.addEventListener('click',()=>applyFilter(tab)));
    applyFilter(tabs.find(tab=>tab.classList.contains('active')) || tabs[0]);
  }


  // ---------- Device center ----------
  function initDevicesPage() {
    const tabs = $$('[data-device-filter]');
    const rows = $$('.device-row[data-device-state]');
    tabs.forEach(tab => tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      const filter = tab.dataset.deviceFilter;
      rows.forEach(row => { row.hidden = !(filter === 'all' || row.dataset.deviceState === filter); });
    }));

    $('[data-device-bind]')?.addEventListener('click', () => {
      const m = modal({
        title:'绑定新设备',
        body:`<div class="settings-modal-form"><label>设备序列号<input type="text" data-bind-sn placeholder="请输入设备 SN" /></label><label>设备名称<input type="text" data-bind-name placeholder="例如：工作室打印机" /></label></div>`,
        actions:'<button class="ghost-btn" type="button" data-cancel>取消</button><button class="primary-btn" type="button" data-confirm-bind>确认绑定</button>'
      });
      $('[data-cancel]', m.overlay).addEventListener('click', m.close);
      $('[data-confirm-bind]', m.overlay).addEventListener('click', () => {
        const sn = $('[data-bind-sn]', m.overlay).value.trim();
        if (!sn) { toast('请输入设备序列号'); return; }
        m.close(); toast('设备绑定成功（演示）');
      });
    });
  }

  const deviceData = {
    'laser-x1': {
      name:'HiMakers Laser X1', model:'Laser X1', sn:'LX1-2026-008521', fw:'v2.3.1',
      ip:'192.168.1.100', wifi:'SIM-Router', laserPower:'40 W', status:'online', statusText:'在线',
      desc:'设备连接正常，可随时开始新的加工任务。', last:'刚刚', image:'assets/member/device-laser-x1.png'
    },
    'printer-p2': {
      name:'HiMakers Doyao Y2', model:'Doyao Y2', sn:'PP2-2026-013407', fw:'v2.3.1',
      ip:'192.168.1.108', wifi:'HiMakers_Studio', laserPower:null, status:'working', statusText:'工作中',
      desc:'设备正在执行加工任务，可在详情中查看剩余时长与控制任务。', last:'正在工作', image:'assets/member/device-printer-p2.png'
    },
    'cnc-c1': {
      name:'HiMakers CNC C1', model:'CNC C1', sn:'CC1-2026-002918', fw:'v2.2.8',
      ip:'192.168.1.126', wifi:'Workshop_2.4G', laserPower:null, status:'offline', statusText:'离线',
      desc:'当前设备未连接，请检查设备电源与网络连接。', last:'2 小时前', image:'assets/member/device-cnc-c1.png'
    }
  };

  function initDeviceDetail() {
    const page = $('[data-device-detail-page]'); if (!page) return;
    const id = new URLSearchParams(location.search).get('id') || 'laser-x1';
    const d = deviceData[id] || deviceData['laser-x1'];
    const status = $('[data-device-status]', page);

    $('[data-device-name]', page).textContent = d.name;
    $('[data-device-sn]', page).textContent = `SN：${d.sn}`;
    $('[data-device-fw]', page).textContent = `固件版本 ${d.fw}`;
    $('[data-device-desc]', page).textContent = d.desc;
    $('[data-info-name]', page).textContent = d.name;
    $('[data-info-model]', page).textContent = d.model;
    $('[data-info-sn]', page).textContent = d.sn;
    $('[data-info-fw]', page).textContent = d.fw;
    $('[data-info-ip]', page).textContent = d.ip;
    $('[data-info-wifi]', page).textContent = d.wifi;
    $('[data-info-last]', page).textContent = d.last;
    const laserPower = $('[data-info-laser-power]', page);
    if (laserPower) laserPower.textContent = d.laserPower || '--';
    $('[data-laser-power-row]', page)?.toggleAttribute('hidden', !d.laserPower);
    $('[data-laser-settings-card]', page)?.toggleAttribute('hidden', id !== 'laser-x1');

    status.className = `device-status ${d.status}`;
    status.innerHTML = `<i></i>${d.statusText}`;
    document.title = `HiMakers · ${d.name}`;

    const visual = $('[data-device-visual]', page);
    if (visual) visual.innerHTML = `<img class="device-detail-product-img" src="${d.image}" alt="${d.name}" />`;

    const state = $('[data-device-current-state]', page);
    const recommendedTasks = [
      {title:'圣诞贺卡雕刻', image:'assets/member/work4.jpg', time:'约 28 分钟'},
      {title:'桌面收纳盒', image:'assets/member/work1.jpg', time:'约 42 分钟'},
      {title:'可调节手机支架', image:'assets/member/work5.jpg', time:'约 36 分钟'}
    ];
    let currentTask = d.status === 'working'
      ? {title:'模块化桌面收纳盒', image:'assets/member/work1.jpg', remaining:'00:18:36', progress:62, paused:false}
      : null;

    function syncDeviceStatus(label, mode='online') {
      status.className = `device-status ${mode}`;
      status.innerHTML = `<i></i>${label}`;
    }

    function renderOfflineState() {
      state.className = 'device-current-state offline';
      state.innerHTML = '<span class="state-dot"></span><div><strong>设备离线</strong><p>最近一次在线为 2 小时前，请检查设备电源和网络连接。</p></div>';
      syncDeviceStatus('离线','offline');
    }

    function renderIdleState() {
      state.className = 'device-current-state';
      state.innerHTML = `
        <div class="device-state-summary">
          <span class="state-dot"></span>
          <div class="state-copy"><strong>设备空闲</strong><p>当前没有正在进行的任务，可以从推荐模型中快速开始加工。</p></div>
        </div>
        <div class="device-recommend-head"><strong>推荐任务</strong><span>根据设备类型与最近创作推荐</span></div>
        <div class="device-recommend-grid">
          ${recommendedTasks.map((task,idx)=>`<article class="device-recommend-item"><img src="${task.image}" alt="${task.title}"><div class="device-recommend-copy"><strong>${task.title}</strong><span>${task.time}</span></div><button class="device-recommend-action" type="button" data-start-recommended="${idx}">去加工</button></article>`).join('')}
        </div>`;
      syncDeviceStatus('在线','online');
      $$('[data-start-recommended]', state).forEach(btn => btn.addEventListener('click', () => {
        const task = recommendedTasks[Number(btn.dataset.startRecommended)] || recommendedTasks[0];
        currentTask = {title:task.title, image:task.image, remaining:'00:29:48', progress:8, paused:false};
        renderWorkingState();
        toast(`已开始加工「${task.title}」`);
      }));
    }

    function renderWorkingState() {
      if (!currentTask) return renderIdleState();
      state.className = 'device-current-state working';
      state.innerHTML = `
        <div class="device-working-task">
          <img class="device-working-thumb" src="${currentTask.image}" alt="${currentTask.title}">
          <div class="device-working-main">
            <div class="device-working-title">${currentTask.title}</div>
            <div class="device-working-kicker">预计剩余时间</div>
            <div class="device-working-time">${currentTask.remaining}</div>
            <div class="device-work-state-note" data-task-state-note>${currentTask.paused ? '任务已暂停' : '设备正在加工中'}</div>
          </div>
          <div class="device-working-actions">
            <button class="device-task-control" type="button" data-task-pause ${currentTask.paused ? 'disabled' : ''}>暂停</button>
            <button class="device-task-control primary" type="button" data-task-resume ${currentTask.paused ? '' : 'disabled'}>继续</button>
          </div>
          <div class="device-work-progress"><div class="device-bar"><i style="width:${currentTask.progress}%"></i></div><strong>${currentTask.progress}%</strong></div>
        </div>`;
      syncDeviceStatus(currentTask.paused ? '已暂停' : '工作中','working');
      const pauseBtn = $('[data-task-pause]', state);
      const resumeBtn = $('[data-task-resume]', state);
      const note = $('[data-task-state-note]', state);
      pauseBtn?.addEventListener('click', () => {
        currentTask.paused = true;
        pauseBtn.disabled = true;
        resumeBtn.disabled = false;
        note.textContent = '任务已暂停';
        syncDeviceStatus('已暂停','working');
        toast('任务已暂停');
      });
      resumeBtn?.addEventListener('click', () => {
        currentTask.paused = false;
        resumeBtn.disabled = true;
        pauseBtn.disabled = false;
        note.textContent = '设备正在加工中';
        syncDeviceStatus('工作中','working');
        toast('任务已继续');
      });
    }

    if (d.status === 'offline') renderOfflineState();
    else if (d.status === 'working') renderWorkingState();
    else renderIdleState();

    $('[data-device-wifi-config]', page)?.addEventListener('click', () => {
      const m = modal({
        title:'Wi‑Fi 配置',
        className:'device-config-modal',
        body:`<div class="settings-modal-form">
          <label>设备加入网络的 Wi‑Fi 名称
            <div class="device-network-row">
              <select data-device-network>
                <option>${d.wifi}</option>
                <option>HiMakers_Studio_5G</option>
                <option>Studio_2.4G</option>
                <option>Office_WiFi</option>
              </select>
              <button class="device-network-refresh" type="button" data-refresh-network>刷新</button>
            </div>
          </label>
          <label>密码<input data-device-network-password type="password" placeholder="请输入 Wi‑Fi 密码"></label>
          <div class="device-config-help"><strong>如何确认是否已经配网成功？</strong><p>配置完成后，设备与当前电脑处于同一网络即可建立连接。如果设备仍显示离线，可重新刷新网络后再次配置。</p></div>
        </div>`,
        actions:'<button class="ghost-btn" type="button" data-cancel>取消</button><button class="primary-btn compact" type="button" data-save-wifi>确定</button>'
      });
      $('[data-cancel]', m.overlay).addEventListener('click', m.close);
      $('[data-refresh-network]', m.overlay).addEventListener('click', e => {
        e.currentTarget.textContent='已刷新';
        setTimeout(()=>{ if(e.currentTarget) e.currentTarget.textContent='刷新'; },900);
      });
      $('[data-save-wifi]', m.overlay).addEventListener('click', () => {
        const network = $('[data-device-network]', m.overlay).value;
        d.wifi = network;
        $('[data-info-wifi]', page).textContent = network;
        m.close(); toast('Wi‑Fi 配置已更新');
      });
    });

    $('[data-device-firmware]', page)?.addEventListener('click', () => {
      const m = modal({
        title:'固件升级',
        body:`<div class="device-firmware-info"><div>当前版本<strong>${d.fw}</strong></div><div>最新版本<strong>${d.fw === 'v2.3.1' ? 'v2.4.0' : 'v2.3.1'}</strong></div></div><p class="confirm-copy" style="margin-top:14px">升级过程中请保持设备通电并连接网络，避免中途断电。</p>`,
        actions:'<button class="ghost-btn" type="button" data-cancel>稍后升级</button><button class="primary-btn compact" type="button" data-upgrade>开始升级</button>'
      });
      $('[data-cancel]', m.overlay).addEventListener('click', m.close);
      $('[data-upgrade]', m.overlay).addEventListener('click', e => {
        e.currentTarget.disabled = true; e.currentTarget.textContent = '升级中…';
        setTimeout(()=>{ m.close(); toast('固件升级完成（演示）'); },900);
      });
    });

    $('[data-device-new-task]', page)?.addEventListener('click', () => {
      const savedModels = [
        {id:'saved-1', title:'灯光万圣节鬼屋', image:'assets/member/work2.jpg', meta:'来自创作空间 · 我的收藏'},
        {id:'saved-2', title:'圣诞吊坠', image:'assets/member/work4.jpg', meta:'来自创作空间 · 我的收藏'},
        {id:'saved-3', title:'桌面手机支架', image:'assets/member/work5.jpg', meta:'来自创作空间 · 我的收藏'},
        {id:'saved-4', title:'桌面收纳盒', image:'assets/member/work1.jpg', meta:'来自创作空间 · 我的收藏'}
      ];
      const m = modal({
        title:'选择收藏模型',
        className:'device-task-modal',
        body:`<p class="device-task-picker-intro">从创作空间收藏过的模型中选择一个，发送到当前设备开始加工。</p><div class="device-task-picker">${savedModels.map(model=>`<button class="device-task-option" type="button" data-task-option="${model.id}"><img src="${model.image}" alt="${model.title}"><span><strong>${model.title}</strong><span>${model.meta}</span></span></button>`).join('')}</div>`,
        actions:'<button class="ghost-btn" type="button" data-cancel>取消</button><button class="primary-btn compact" type="button" data-start-task disabled>开始加工</button>'
      });
      let selected = null;
      $$('[data-task-option]', m.overlay).forEach(btn => btn.addEventListener('click', () => {
        $$('[data-task-option]', m.overlay).forEach(node => node.classList.toggle('selected', node === btn));
        selected = savedModels.find(model => model.id === btn.dataset.taskOption);
        $('[data-start-task]', m.overlay).disabled = false;
      }));
      $('[data-cancel]', m.overlay).addEventListener('click', m.close);
      $('[data-start-task]', m.overlay).addEventListener('click', () => {
        if (!selected) return;
        m.close();
        state.className = 'device-current-state working';
        state.innerHTML = `<span class="state-dot"></span><div style="min-width:0;flex:1"><strong>${selected.title} · 已创建任务</strong><p>模型已发送至设备，等待确认加工参数。</p><div class="device-task-progress"><div class="device-bar"><i style="width:8%"></i></div><strong>8%</strong></div></div>`;
        toast(`已将「${selected.title}」发送到设备`);
      });
    });

    $('[data-rename-device]', page)?.addEventListener('click', () => {
      const m = modal({title:'修改设备名称', body:`<div class="settings-modal-form"><label>设备名称<input type="text" data-device-new-name value="${d.name}" /></label></div>`, actions:'<button class="ghost-btn" type="button" data-cancel>取消</button><button class="primary-btn compact" type="button" data-save-name>保存</button>'});
      $('[data-cancel]', m.overlay).addEventListener('click', m.close);
      $('[data-save-name]', m.overlay).addEventListener('click', () => { const v=$('[data-device-new-name]',m.overlay).value.trim(); if(!v){toast('请输入设备名称');return;} $('[data-device-name]',page).textContent=v; $('[data-info-name]',page).textContent=v; m.close(); toast('设备名称已更新'); });
    });

    $('[data-device-unbind]', page)?.addEventListener('click', () => {
      const m = modal({title:'解绑设备', body:`<p class="confirm-copy">确定要解绑「${d.name}」吗？解绑后设备将从当前账号移除。</p>`, actions:'<button class="ghost-btn" type="button" data-cancel>取消</button><button class="danger-btn" type="button" data-confirm-unbind>确认解绑</button>'});
      $('[data-cancel]',m.overlay).addEventListener('click',m.close);
      $('[data-confirm-unbind]',m.overlay).addEventListener('click',()=>{m.close();toast('设备已解绑（演示）');setTimeout(()=>location.href='member-devices.html',700);});
    });
  }

  const page = location.pathname.split('/').pop();
  if (page === 'member-orders.html') renderOrders();
  if (page === 'member-points.html') renderPoints();
  if (page === 'member-coupons.html') renderCoupons();
  if (page === 'member-devices.html') initDevicesPage();
  if (page === 'member-device-detail.html') initDeviceDetail();
})();
