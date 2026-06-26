let tabs = [];
let activeTabId = null;
const defaultUrl = 'https://www.google.com/search?igu=1'; // Using google with igu=1 for iframe support

const tabContainer = document.getElementById('tabs');
const contentArea = document.getElementById('content-area');
const addressBar = document.getElementById('address-bar');
const newTabBtn = document.getElementById('new-tab-btn');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');
const homeBtn = document.getElementById('home-btn');
const bookmarkBtn = document.getElementById('bookmark-btn');
const bookmarksMenuBtn = document.getElementById('bookmarks-menu-btn');
const bookmarksSidebar = document.getElementById('bookmarks-sidebar');
const closeBookmarksBtn = document.getElementById('close-bookmarks-btn');
const bookmarksList = document.getElementById('bookmarks-list');

let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];

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
    addressBar.value = activeTab.url;
    checkBookmarkStatus();
}

function closeTab(id) {
    const index = tabs.findIndex(t => t.id === id);
    if (index === -1) return;

    tabs.splice(index, 1);
    document.getElementById(`tab-${id}`).remove();
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
}

newTabBtn.addEventListener('click', () => createTab());

// Navigation Logic
function navigate(url) {
    if (!activeTabId) return;

    // Simple URL validation
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.includes('.') && !url.includes(' ')) {
            finalUrl = 'https://' + url;
        } else {
            finalUrl = 'https://www.google.com/search?q=' + encodeURIComponent(url) + '&igu=1';
        }
    }

    const activeTab = tabs.find(t => t.id === activeTabId);
    activeTab.url = finalUrl;
    addressBar.value = finalUrl;

    const iframe = document.getElementById(`iframe-${activeTabId}`);
    iframe.src = finalUrl;
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

homeBtn.addEventListener('click', () => {
    navigate(defaultUrl);
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

// Initialize with one tab
window.onload = () => {
    createTab();
};
