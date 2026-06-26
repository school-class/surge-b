let tabs = [];
let activeTabId = null;
const defaultUrl = 'newtab.html';

const tabContainer = document.getElementById('tabs');
const contentArea = document.getElementById('content-area');
const addressBar = document.getElementById('address-bar');
const newTabBtn = document.getElementById('new-tab-btn');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');
const homeBtn = document.getElementById('home-btn');
const externalBtn = document.getElementById('external-btn');
const bookmarkBtn = document.getElementById('bookmark-btn');
const bookmarksMenuBtn = document.getElementById('bookmarks-menu-btn');
const bookmarksSidebar = document.getElementById('bookmarks-sidebar');
const closeBookmarksBtn = document.getElementById('close-bookmarks-btn');
const bookmarksList = document.getElementById('bookmarks-list');

// History Elements
const historyMenuBtn = document.getElementById('history-menu-btn');
const historySidebar = document.getElementById('history-sidebar');
const closeHistoryBtn = document.getElementById('close-history-btn');
const historyList = document.getElementById('history-list');

// Settings Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsSidebar = document.getElementById('settings-sidebar');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const searchEngineSelect = document.getElementById('search-engine-select');

// Mobile Switcher Elements
const mobileTabBtn = document.getElementById('mobile-tab-btn');
const tabCountBadge = document.getElementById('tab-count-badge');
const tabSwitcherOverlay = document.getElementById('tab-switcher-overlay');
const closeSwitcherBtn = document.getElementById('close-switcher-btn');
const newTabSwitcherBtn = document.getElementById('new-tab-switcher-btn');
const tabGrid = document.getElementById('tab-grid');

let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
let history = JSON.parse(localStorage.getItem('history')) || [];

function createTab(url = defaultUrl) {
    const id = Date.now().toString();
    const tab = {
        id,
        url,
        title: '新規タブ'
    };
    tabs.push(tab);

    // Create Tab UI
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.id = `tab-${id}`;
    tabElement.innerHTML = `
        <span id="tab-title-${id}">${tab.title}</span>
        <i class="fas fa-times close-tab" id="close-${id}"></i>
    `;
    tabElement.addEventListener('click', () => switchTab(id));
    tabContainer.appendChild(tabElement);

    // Create Iframe UI
    const iframe = document.createElement('iframe');
    iframe.id = `iframe-${id}`;
    iframe.src = url;
    contentArea.appendChild(iframe);

    // Close button event
    document.getElementById(`close-${id}`).addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(id);
    });

    switchTab(id);
    updateTabSwitcher();
    return id;
}

function switchTab(id) {
    if (activeTabId) {
        document.getElementById(`tab-${activeTabId}`).classList.remove('active');
        document.getElementById(`iframe-${activeTabId}`).classList.remove('active');
    }

    activeTabId = id;
    const activeTab = tabs.find(t => t.id === id);

    document.getElementById(`tab-${id}`).classList.add('active');
    document.getElementById(`iframe-${id}`).classList.add('active');

    // Don't show internal newtab.html in address bar
    if (activeTab.url === 'newtab.html') {
        addressBar.value = '';
    } else {
        addressBar.value = activeTab.url;
    }

    checkBookmarkStatus();
}

function closeTab(id) {
    const index = tabs.findIndex(t => t.id === id);
    if (index === -1) return;

    tabs.splice(index, 1);
    const tabEl = document.getElementById(`tab-${id}`);
    if (tabEl) tabEl.remove();
    document.getElementById(`iframe-${id}`).remove();

    if (activeTabId === id) {
        if (tabs.length > 0) {
            const nextTab = tabs[Math.max(0, index - 1)];
            switchTab(nextTab.id);
        } else {
            activeTabId = null;
            addressBar.value = '';
            createTab(); // Always keep at least one tab
        }
    }
    updateTabSwitcher();
}

newTabBtn.addEventListener('click', () => createTab());

// Navigation Logic
function navigate(url) {
    if (!activeTabId) return;

    let finalUrl = url.trim();
    if (finalUrl === '') return;

    // Check for common frame-blocking sites
    const blockedSites = ['google.com', 'youtube.com', 'github.com', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com'];
    const isBlocked = blockedSites.some(site => finalUrl.includes(site) && !finalUrl.includes('igu=1'));

    if (isBlocked && !finalUrl.includes('search.html')) {
        if (confirm("このサイトはセキュリティ上の理由でブラウザ内での表示をブロックする可能性があります。別ウィンドウで開きますか？")) {
            window.open(finalUrl, '_blank');
            return;
        }
    }

    const engine = searchEngineSelect.value;

    // Better URL detection
    const isUrl = (str) => {
        try {
            const urlObj = new URL(str.startsWith('http') ? str : 'https://' + str);
            return urlObj.hostname.includes('.');
        } catch {
            return false;
        }
    };

    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        if (isUrl(finalUrl)) {
            finalUrl = 'https://' + finalUrl;
        } else {
            // Search engine logic
            switch(engine) {
                case 'bing':
                    finalUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(finalUrl);
                    break;
                case 'duckduckgo':
                    finalUrl = 'https://duckduckgo.com/?q=' + encodeURIComponent(finalUrl);
                    break;
                case 'surge':
                    finalUrl = 'https://www.surge.f5.si/s/search.html?q=' + encodeURIComponent(finalUrl);
                    break;
                default: // google
                    finalUrl = 'https://www.google.com/search?q=' + encodeURIComponent(finalUrl) + '&igu=1';
            }
        }
    }

    const activeTab = tabs.find(t => t.id === activeTabId);
    activeTab.url = finalUrl;
    addressBar.value = finalUrl;

    const iframe = document.getElementById(`iframe-${activeTabId}`);
    iframe.src = finalUrl;

    // Update tab title if possible (simple heuristic)
    if (finalUrl.includes('example.com')) activeTab.title = 'Example Domain';
    else if (finalUrl.includes('google.com')) activeTab.title = 'Google';
    else if (finalUrl.includes('surge.f5.si')) activeTab.title = 'Surge';
    else activeTab.title = finalUrl.split('/')[2] || finalUrl;

    const tabTitleEl = document.getElementById(`tab-title-${activeTabId}`);
    if (tabTitleEl) tabTitleEl.innerText = activeTab.title;

    addToHistory(finalUrl);
}

function addToHistory(url) {
    if (url === 'newtab.html') return;
    const historyItem = {
        url,
        title: url, // For now, use URL as title
        time: new Date().toLocaleString()
    };
    history.unshift(historyItem);
    if (history.length > 100) history.pop();
    localStorage.setItem('history', JSON.stringify(history));
    updateHistoryList();
}

function updateHistoryList() {
    if (!historyList) return;
    historyList.innerHTML = '';
    history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <strong>${item.title}</strong>
            <span class="url">${item.url}</span>
            <span class="time">${item.time}</span>
        `;
        li.addEventListener('click', () => {
            navigate(item.url);
            historySidebar.classList.add('hidden');
        });
        historyList.appendChild(li);
    });
}

addressBar.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        navigate(addressBar.value);
    }
});

backBtn.addEventListener('click', () => {
    const iframe = document.getElementById(`iframe-${activeTabId}`);
    try {
        iframe.contentWindow.history.back();
    } catch (e) {
        console.error("Cannot access iframe history due to CORS", e);
    }
});

forwardBtn.addEventListener('click', () => {
    const iframe = document.getElementById(`iframe-${activeTabId}`);
    try {
        iframe.contentWindow.history.forward();
    } catch (e) {
        console.error("Cannot access iframe history due to CORS", e);
    }
});

reloadBtn.addEventListener('click', () => {
    const iframe = document.getElementById(`iframe-${activeTabId}`);
    iframe.src = iframe.src;
});

externalBtn.addEventListener('click', () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab && activeTab.url !== 'newtab.html') {
        window.open(activeTab.url, '_blank');
    }
});

homeBtn.addEventListener('click', () => {
    const engine = searchEngineSelect.value;
    if (engine === 'surge') {
        navigate('https://www.surge.f5.si/s/');
    } else {
        navigate(defaultUrl);
    }
});

// Bookmarks Logic
function updateBookmarksList() {
    bookmarksList.innerHTML = '';
    bookmarks.forEach((bookmark, index) => {
        const li = document.createElement('li');
        li.className = 'bookmark-item';
        li.innerHTML = `
            <i class="fas fa-bookmark"></i>
            <span>${bookmark.title || bookmark.url}</span>
            <i class="fas fa-trash-alt delete-bookmark" data-index="${index}" style="margin-left: auto; opacity: 0.5; cursor: pointer;"></i>
        `;
        li.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-bookmark')) {
                navigate(bookmark.url);
                bookmarksSidebar.classList.add('hidden');
            }
        });
        bookmarksList.appendChild(li);
    });

    document.querySelectorAll('.delete-bookmark').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = e.target.dataset.index;
            bookmarks.splice(index, 1);
            saveBookmarks();
            updateBookmarksList();
            checkBookmarkStatus();
        });
    });
}

function saveBookmarks() {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

function checkBookmarkStatus() {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;

    const isBookmarked = bookmarks.some(b => b.url === activeTab.url);
    if (isBookmarked) {
        bookmarkBtn.classList.add('active');
        bookmarkBtn.querySelector('i').classList.replace('far', 'fas');
    } else {
        bookmarkBtn.classList.remove('active');
        bookmarkBtn.querySelector('i').classList.replace('fas', 'far');
    }
}

bookmarkBtn.addEventListener('click', () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    const index = bookmarks.findIndex(b => b.url === activeTab.url);

    if (index === -1) {
        bookmarks.push({
            url: activeTab.url,
            title: activeTab.title
        });
    } else {
        bookmarks.splice(index, 1);
    }

    saveBookmarks();
    updateBookmarksList();
    checkBookmarkStatus();
});

bookmarksMenuBtn.addEventListener('click', () => {
    bookmarksSidebar.classList.toggle('hidden');
    updateBookmarksList();
});

closeBookmarksBtn.addEventListener('click', () => {
    bookmarksSidebar.classList.add('hidden');
});

// History Logic
historyMenuBtn.addEventListener('click', () => {
    historySidebar.classList.toggle('hidden');
    updateHistoryList();
});

closeHistoryBtn.addEventListener('click', () => {
    historySidebar.classList.add('hidden');
});

// Mobile Tab Switcher Logic
function updateTabSwitcher() {
    tabCountBadge.innerText = tabs.length;
    tabGrid.innerHTML = '';

    tabs.forEach(tab => {
        const card = document.createElement('div');
        card.className = `tab-card ${tab.id === activeTabId ? 'active' : ''}`;
        card.innerHTML = `
            <div class="tab-card-header">
                <span>${tab.title}</span>
                <i class="fas fa-times close-card" data-id="${tab.id}"></i>
            </div>
            <div class="tab-card-preview">
                <i class="fas fa-globe"></i>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('close-card')) {
                switchTab(tab.id);
                tabSwitcherOverlay.classList.add('hidden');
            }
        });

        card.querySelector('.close-card').addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(tab.id);
        });

        tabGrid.appendChild(card);
    });
}

mobileTabBtn.addEventListener('click', () => {
    updateTabSwitcher();
    tabSwitcherOverlay.classList.remove('hidden');
});

closeSwitcherBtn.addEventListener('click', () => {
    tabSwitcherOverlay.classList.add('hidden');
});

newTabSwitcherBtn.addEventListener('click', () => {
    createTab();
    tabSwitcherOverlay.classList.add('hidden');
});

// Settings Logic
settingsBtn.addEventListener('click', () => {
    settingsSidebar.classList.toggle('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsSidebar.classList.add('hidden');
});

darkModeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', darkModeToggle.checked);
    localStorage.setItem('darkMode', darkModeToggle.checked);
});

searchEngineSelect.addEventListener('change', () => {
    localStorage.setItem('searchEngine', searchEngineSelect.value);
    // Reload active tab if it's newtab.html to update its placeholder
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab && activeTab.url === 'newtab.html') {
        const iframe = document.getElementById(`iframe-${activeTabId}`);
        iframe.src = iframe.src;
    }
});

// Load Settings
if (localStorage.getItem('darkMode') === 'true') {
    darkModeToggle.checked = true;
    document.body.classList.add('dark-mode');
}
if (localStorage.getItem('searchEngine')) {
    searchEngineSelect.value = localStorage.getItem('searchEngine');
}

// Initialize with one tab
window.onload = () => {
    createTab();
};
