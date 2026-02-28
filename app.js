// askkara - main app logic
// handles feed, typing effect, sessions, sidebar, theme etc

(function () {
    'use strict';

    var feedBlocks = [];
    var typingTimer = null;
    var isDesktop = window.innerWidth > 768;
    var curSession = Date.now();
    var sessions = [];

    try {
        sessions = JSON.parse(sessionStorage.getItem('kara_sessions') || '[]');
        if (!Array.isArray(sessions)) sessions = [];
    } catch (e) {
        sessions = [];
    }

    // dom refs
    var ambientGlow = document.getElementById('ambientGlow');
    var mainInput = document.getElementById('mainInput');
    var mirrorText = document.getElementById('mirrorText');
    var hintText = document.getElementById('hintText');
    var brandBtn = document.getElementById('brandBtn');

    var viewLanding = document.getElementById('viewLanding');
    var viewResults = document.getElementById('viewResults');
    var feedContainer = document.getElementById('feedContainer');
    var followupInput = document.getElementById('followupInput');

    var historyTrack = document.getElementById('historyTrack');
    var menuBtn = document.getElementById('menuBtn');
    var closeSidebarBtn = document.getElementById('closeSidebarBtn');
    var sidebarPanel = document.getElementById('sidebarPanel');
    var sidebarList = document.getElementById('sidebarList');

    // xss guard - turns < > & etc into safe entities
    function escapeHtml(str) {
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(str));
        return d.innerHTML;
    }

    // ambient glow follows mouse on desktop
    if (isDesktop) {
        window.addEventListener('mousemove', function (e) {
            var gx = (e.clientX / window.innerWidth - 0.5) * 20;
            var gy = (e.clientY / window.innerHeight - 0.5) * 20;
            if (ambientGlow) {
                ambientGlow.style.transform = 'translate(calc(-50% + ' + gx + '%), calc(-50% + ' + gy + '%))';
            }
        });

        window.attachHover = function () {
            var items = document.querySelectorAll('a, button, .hist-dot, .source-item, .sidebar-item');
            for (var i = 0; i < items.length; i++) {
                var el = items[i];
                if (!el.dataset.hasHover) {
                    el.addEventListener('mouseenter', function () { document.body.classList.add('hovering'); });
                    el.addEventListener('mouseleave', function () { document.body.classList.remove('hovering'); });
                    el.dataset.hasHover = 'true';
                }
            }
        };
        window.attachHover();
    }

    // ------  session stuff  ------

    function saveSession() {
        if (feedBlocks.length === 0) return;

        // kick out the old copy first
        sessions = sessions.filter(function (s) { return s.id !== curSession; });

        sessions.unshift({
            id: curSession,
            title: feedBlocks[0].query,
            blocks: feedBlocks.slice(),
            timestamp: Date.now()
        });

        // cap at 15
        if (sessions.length > 15) sessions.pop();

        try {
            sessionStorage.setItem('kara_sessions', JSON.stringify(sessions));
        } catch (e) {
            // quota exceeded probably, whatever
        }
        renderSidebar();
    }

    function renderSidebar() {
        if (sessions.length === 0) {
            sidebarList.innerHTML = '<div style="opacity:0.5; font-size: 0.8rem; padding: 20px 0;">No past conversations.</div>';
            return;
        }

        var html = '';
        for (var i = 0; i < sessions.length; i++) {
            html += '<div class="sidebar-item" data-session="' + sessions[i].id + '">' + escapeHtml(sessions[i].title) + '</div>';
        }
        sidebarList.innerHTML = html;

        // wire up click handlers
        var items = document.querySelectorAll('.sidebar-item');
        for (var j = 0; j < items.length; j++) {
            items[j].addEventListener('click', function () {
                var sid = parseInt(this.getAttribute('data-session'));
                restoreSession(sid);
                sidebarPanel.classList.remove('open');
            });
        }

        if (isDesktop && window.attachHover) window.attachHover();
    }

    function restoreSession(sessionId) {
        var found = null;
        for (var i = 0; i < sessions.length; i++) {
            if (sessions[i].id === sessionId) { found = sessions[i]; break; }
        }
        if (!found) return;

        saveSession();

        curSession = found.id;
        feedBlocks = found.blocks.slice();

        viewLanding.classList.remove('active');
        document.body.classList.remove('typing');
        if (typingTimer) clearTimeout(typingTimer);
        feedContainer.innerHTML = '';

        viewResults.classList.add('active');
        historyTrack.classList.remove('hidden');
        renderHistoryDots();

        for (var i = 0; i < feedBlocks.length; i++) {
            var bd = feedBlocks[i];
            var block = document.createElement('div');
            block.className = 'feed-block visible';
            block.id = bd.id;

            var safe = escapeHtml(bd.query);
            block.innerHTML =
                '<div class="query-huge">' + safe + '</div>' +
                '<div class="sources-strip">' +
                '<div class="strip-label">REF //</div>' +
                '<div class="strip-items">' +
                '<div class="source-item"><span style="opacity:0.5; font-size: 0.7em;">W</span> wikipedia.org</div>' +
                '<div class="source-item"><span style="opacity:0.5; font-size: 0.7em;">G</span> scholar.google</div>' +
                '</div>' +
                '</div>' +
                '<div class="answer-block">' +
                '<p>This is a <strong>simulated response</strong> for "' + safe + '". You can keep adding more questions to build a thread.</p>' +
                '<p>In a real setup, this would connect to actual AI models.<span class="cite-num">[1]</span></p>' +
                '</div>';

            feedContainer.appendChild(block);
        }

        setTimeout(function () {
            viewResults.scrollTop = viewResults.scrollHeight;
        }, 100);
    }

    // ------  navigation  ------

    // brand click = go home
    brandBtn.addEventListener('click', function () {
        saveSession();
        curSession = Date.now();

        if (typingTimer) clearTimeout(typingTimer);
        viewResults.classList.remove('active');
        historyTrack.classList.add('hidden');

        setTimeout(function () {
            mainInput.value = '';
            mirrorText.textContent = '';
            hintText.classList.remove('visible');
            feedContainer.innerHTML = '';
            feedBlocks = [];
            viewLanding.classList.add('active');
            setTimeout(function () { mainInput.focus(); }, 800);
        }, 800);
    });

    menuBtn.addEventListener('click', function () {
        renderSidebar();
        sidebarPanel.classList.add('open');
    });
    closeSidebarBtn.addEventListener('click', function () { sidebarPanel.classList.remove('open'); });

    // mirror input text into the big styled div
    mainInput.addEventListener('input', function () {
        var val = mainInput.value;
        if (val.length > 0) {
            document.body.classList.add('typing');
            hintText.classList.add('visible');
        } else {
            document.body.classList.remove('typing');
            hintText.classList.remove('visible');
        }
        mirrorText.textContent = val;
    });

    mainInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            var q = mainInput.value.trim();
            if (q.length > 0 && q.length < 500) {
                startNewFeed(q);
            }
        }
    });

    // ------  feed  ------

    function startNewFeed(query) {
        saveSession();
        curSession = Date.now();

        document.body.classList.remove('typing');
        feedContainer.innerHTML = '';
        feedBlocks = [];

        viewLanding.classList.remove('active');

        setTimeout(function () {
            viewResults.classList.add('active');
            historyTrack.classList.remove('hidden');
            addBlock(query);
        }, 800);
    }

    function addBlock(query) {
        var id = 'block-' + Date.now();
        feedBlocks.push({ id: id, query: query });
        renderHistoryDots();

        var safe = escapeHtml(query);

        var block = document.createElement('div');
        block.className = 'feed-block';
        block.id = id;

        block.innerHTML =
            '<div class="query-huge">' + safe + '</div>' +
            '<div class="sources-strip">' +
            '<div class="strip-label">REF //</div>' +
            '<div class="strip-items">' +
            '<div class="source-item"><span style="opacity:0.5; font-size: 0.7em;">W</span> wikipedia.org</div>' +
            '<div class="source-item"><span style="opacity:0.5; font-size: 0.7em;">G</span> scholar.google</div>' +
            '</div>' +
            '</div>' +
            '<div class="answer-block"></div>';

        feedContainer.appendChild(block);

        setTimeout(function () {
            block.scrollIntoView({ behavior: 'smooth', block: 'start' });
            block.classList.add('visible');
            if (isDesktop && window.attachHover) window.attachHover();
        }, 100);

        setTimeout(function () {
            typeAnswer(block.querySelector('.answer-block'), safe);
        }, 1100);
    }

    // types out the answer char by char
    // skips through html tags in one jump so they don't render as raw text
    function typeAnswer(container, safeQuery) {
        var html =
            '<p>This is a <strong>simulated response</strong> for "' + safeQuery + '". You can keep adding more questions to build a thread.</p>' +
            '<p>In a real setup, this would connect to actual AI models.<span class="cite-num">[1]</span></p>';

        window._pendingAnswer = html;

        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        var paragraphs = tmp.querySelectorAll('p');
        var pi = 0;

        function doParagraph() {
            if (pi >= paragraphs.length) {
                var c = container.querySelector('.answer-typing-cursor');
                if (c) c.remove();
                viewResults.scrollBy({ top: 100, behavior: 'smooth' });
                return;
            }

            var p = document.createElement('p');
            container.appendChild(p);
            var fullHtml = paragraphs[pi].innerHTML;
            var ci = 0;
            var cursor = document.createElement('span');
            cursor.className = 'answer-typing-cursor';

            function tick() {
                if (ci >= fullHtml.length) {
                    if (cursor.parentNode === p) p.removeChild(cursor);
                    p.innerHTML = fullHtml;
                    pi++;
                    typingTimer = setTimeout(doParagraph, 100);
                    return;
                }

                // skip html tags whole
                if (fullHtml[ci] === '<') {
                    ci++;
                    while (ci < fullHtml.length && fullHtml[ci] !== '>') ci++;
                    if (ci < fullHtml.length) ci++;
                    p.innerHTML = fullHtml.substring(0, ci);
                    p.appendChild(cursor);
                    typingTimer = setTimeout(tick, 5);
                } else {
                    ci++;
                    p.innerHTML = fullHtml.substring(0, ci);
                    p.appendChild(cursor);

                    if (ci % 10 === 0) viewResults.scrollBy(0, 5);

                    // brief pause on sentence endings
                    var delay = 10;
                    var ch = fullHtml[ci - 1];
                    if (ch === '.' || ch === '!' || ch === '?') delay = 80;
                    typingTimer = setTimeout(tick, delay);
                }
            }
            tick();
        }
        doParagraph();
    }

    // followup input
    followupInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && followupInput.value.trim()) {
            var q = followupInput.value.trim();
            if (q.length === 0 || q.length > 500) return;
            followupInput.value = '';

            // if still typing previous answer, just finish it
            if (typingTimer) {
                clearTimeout(typingTimer);
                typingTimer = null;
                var cursors = document.querySelectorAll('.answer-typing-cursor');
                for (var i = 0; i < cursors.length; i++) cursors[i].remove();

                if (feedBlocks.length > 0) {
                    var lastId = feedBlocks[feedBlocks.length - 1].id;
                    var lastEl = document.getElementById(lastId);
                    if (lastEl) {
                        var ab = lastEl.querySelector('.answer-block');
                        if (ab && window._pendingAnswer) {
                            ab.innerHTML = window._pendingAnswer;
                        }
                    }
                }
            }

            addBlock(q);
            followupInput.blur();
            setTimeout(function () { followupInput.focus(); }, 1200);
        }
    });

    // ------  scroll dots  ------

    function renderHistoryDots() {
        var html = '';
        for (var i = 0; i < feedBlocks.length; i++) {
            var cls = (i === feedBlocks.length - 1) ? ' active' : '';
            var title = escapeHtml(feedBlocks[i].query);
            html += '<div class="hist-dot' + cls + '" data-target="' + feedBlocks[i].id + '" data-title="' + title + '"></div>';
        }
        historyTrack.innerHTML = html;

        var dots = document.querySelectorAll('.hist-dot');
        for (var j = 0; j < dots.length; j++) {
            dots[j].addEventListener('click', function () {
                var tid = this.getAttribute('data-target');
                var el = document.getElementById(tid);
                if (el) {
                    var all = document.querySelectorAll('.hist-dot');
                    for (var k = 0; k < all.length; k++) all[k].classList.remove('active');
                    this.classList.add('active');
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }

        if (isDesktop && window.attachHover) window.attachHover();
    }

    // intersection observer to highlight the right dot as you scroll
    var observer = new IntersectionObserver(function (entries) {
        var visible = [];
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) visible.push(entries[i].target.id);
        }

        if (visible.length > 0) {
            var dots = document.querySelectorAll('.hist-dot');
            for (var j = 0; j < dots.length; j++) {
                dots[j].classList.toggle('active', dots[j].getAttribute('data-target') === visible[0]);
            }
        }
    }, { root: viewResults, threshold: 0.3 });

    // monkey-patch appendChild so new blocks get observed automatically
    // kinda hacky but works fine for this
    var _origAppend = feedContainer.appendChild.bind(feedContainer);
    feedContainer.appendChild = function (el) {
        _origAppend(el);
        observer.observe(el);
    };

    setTimeout(function () { mainInput.focus(); }, 1000);

    // ------  theme  ------

    var themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', function () {
            var root = document.documentElement;
            var isLight = root.getAttribute('data-theme') === 'light';
            if (isLight) {
                root.removeAttribute('data-theme');
                localStorage.setItem('kara_theme', 'dark');
            } else {
                root.setAttribute('data-theme', 'light');
                localStorage.setItem('kara_theme', 'light');
            }
        });
    }

})();
