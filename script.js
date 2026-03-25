let userLearningJourney = { topics: {}, timeline: [] };
let currentState = { mode: 'explore', currentPathId: null, currentPathStep: 0, view: 'categories', category: null, subtopic: null, article: null, difficulty: 'intro' };
let activeSelection = '';

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => document.getElementById('splashScreen').classList.add('hidden'), 1000);
    initTheme();
    loadJourneyData();
    renderCategories();
    setupEvents();
});

function initTheme() {
    const savedTheme = localStorage.getItem('osmosis_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon(true);
    } else {
        document.documentElement.removeAttribute('data-theme');
        updateThemeIcon(false);
    }
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('osmosis_theme', 'light');
        updateThemeIcon(false);
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('osmosis_theme', 'dark');
        updateThemeIcon(true);
    }
}

function updateThemeIcon(isDark) {
    const svg = document.getElementById('themeIcon');
    if (isDark) {
        svg.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    } else {
        svg.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    }
}

function setupEvents() {
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

    document.getElementById('navHome').addEventListener('click', () => {
        document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
        document.getElementById('navHome').classList.add('active');
        goToCategories();
    });

    document.getElementById('navPaths').addEventListener('click', () => {
        document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
        document.getElementById('navPaths').classList.add('active');
        renderPathsList();
    });

    document.getElementById('profileBtn').addEventListener('click', showProfile);
    document.getElementById('backFromProfile').addEventListener('click', goToCategories);
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
    
    document.getElementById('journeyBtn').addEventListener('click', showJourneyDashboard);
    document.getElementById('backFromJourney').addEventListener('click', goToCategories);

    document.getElementById('backToCategories').addEventListener('click', goToCategories);
    document.getElementById('backToPathsList').addEventListener('click', renderPathsList);
    
    document.getElementById('backToPrevious').addEventListener('click', () => {
        if (currentState.mode === 'path') { renderPathDetail(currentState.currentPathId); } 
        else { goToSubtopics(); }
    });

    document.getElementById('nextPathStepBtn').addEventListener('click', () => navigatePathStep(1));
    document.getElementById('prevPathStepBtn').addEventListener('click', () => navigatePathStep(-1));
    document.getElementById('closeModalBtn').addEventListener('click', closeSourceModal);

    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentState.difficulty = e.target.dataset.level;
            renderArticleContent();
        });
    });

    document.addEventListener('selectionchange', () => {
        const text = window.getSelection().toString().trim();
        if (text) activeSelection = text;
    });

    document.getElementById('highlightBtn').addEventListener('click', () => saveNewAnnotation(""));
    document.getElementById('addAnnotationBtn').addEventListener('click', () => {
        saveNewAnnotation(document.getElementById('annotationInput').value.trim());
    });
    
    document.getElementById('annotationInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            saveNewAnnotation(document.getElementById('annotationInput').value.trim());
        }
    });

    document.getElementById('saveReflectionBtn').addEventListener('click', saveReflection);
}

function loadJourneyData() {
    const saved = localStorage.getItem('osmosis_journey');
    if (saved) {
        userLearningJourney = JSON.parse(saved);
    } else {
        Object.keys(topicsData).forEach(domain => {
            userLearningJourney.topics[domain] = { articlesEngaged: 0, annotations: 0, reflections: 0 };
        });
    }
}

function saveJourneyData() {
    localStorage.setItem('osmosis_journey', JSON.stringify(userLearningJourney));
}

function trackEngagement(type, textStr) {
    const domain = currentState.category;
    if (!userLearningJourney.topics[domain]) {
        userLearningJourney.topics[domain] = { articlesEngaged: 0, annotations: 0, reflections: 0 };
    }

    if (type === 'read') {
        userLearningJourney.topics[domain].articlesEngaged += 1;
    } else if (type === 'annotation') {
        userLearningJourney.topics[domain].annotations += 1;
        userLearningJourney.timeline.push({
            date: new Date().toISOString(),
            domain: domain,
            article: currentState.article,
            type: 'Highlight',
            text: textStr.substring(0, 80) + '...'
        });
    } else if (type === 'reflection') {
        userLearningJourney.topics[domain].reflections += 1;
        userLearningJourney.timeline.push({
            date: new Date().toISOString(),
            domain: domain,
            article: currentState.article,
            type: 'Reflection',
            text: textStr
        });
    }
    saveJourneyData();
}

function calculateDepth(domain) {
    const stats = userLearningJourney.topics[domain];
    if (!stats || stats.articlesEngaged === 0) return 'unstarted';
    if (stats.annotations >= 5 && stats.reflections >= 3) return 'sage';
    if (stats.articlesEngaged >= 2 && stats.reflections >= 1) return 'scholar';
    if (stats.articlesEngaged >= 2 || stats.annotations >= 2) return 'student';
    return 'explorer';
}

function showJourneyDashboard() {
    document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
    const mapContainer = document.getElementById('knowledgeMapContainer');
    mapContainer.innerHTML = '';
    
    let highestDepth = 'unstarted';
    let topDomain = 'None';
    let totalInteractions = 0;

    Object.keys(topicsData).forEach(domain => {
        const depth = calculateDepth(domain);
        const node = document.createElement('div');
        node.className = `map-node node-${depth}`;
        node.textContent = domain;
        mapContainer.appendChild(node);

        const stats = userLearningJourney.topics[domain];
        if (stats) {
            totalInteractions += stats.articlesEngaged + stats.annotations + stats.reflections;
            if (depth === 'sage' || (depth === 'scholar' && highestDepth !== 'sage')) {
                highestDepth = depth;
                topDomain = domain;
            }
        }
    });

    const timelineContainer = document.getElementById('journeyTimeline');
    timelineContainer.innerHTML = '';
    const sortedTimeline = [...userLearningJourney.timeline].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (sortedTimeline.length === 0) {
        timelineContainer.innerHTML = '<p class="subtitle">Read articles and add thoughts to build your timeline.</p>';
    } else {
        sortedTimeline.slice(0, 10).forEach(item => {
            const date = new Date(item.date).toLocaleDateString();
            const div = document.createElement('div');
            div.className = 'timeline-item';
            div.innerHTML = `<div class="timeline-date">${date}</div><div class="timeline-context">${item.domain}: ${item.article}</div><div class="timeline-content">"${item.text}"</div>`;
            timelineContainer.appendChild(div);
        });
    }

    const intelMastery = document.getElementById('insightMastery');
    if (topDomain !== 'None') { intelMastery.textContent = `You are achieving ${highestDepth.toUpperCase()} status in ${topDomain}.`; }
    document.getElementById('insightMomentum').textContent = `${totalInteractions} total interactions powering your map.`;

    switchView('journeyView');
}

function renderCategories() {
    currentState.mode = 'explore';
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';
    Object.keys(topicsData).forEach(category => {
        const card = document.createElement('div');
        card.className = 'category-card glass-panel';
        card.innerHTML = `<h3>${category}</h3><p style="font-family: 'Outfit', sans-serif; font-size: 1rem; color: var(--subtitle-color); margin-bottom: 0;">${topicsData[category].description}</p>`;
        card.addEventListener('click', () => selectCategory(category));
        grid.appendChild(card);
    });
    switchView('categoriesView');
}

function selectCategory(category) {
    currentState.category = category;
    currentState.subtopic = null;
    goToSubtopics();
}

function goToSubtopics() {
    const category = topicsData[currentState.category];
    document.getElementById('subtopicsTitle').textContent = currentState.category;
    document.getElementById('subtopicsDesc').textContent = category.description;

    const grid = document.getElementById('subtopicsGrid');
    grid.innerHTML = '';
    Object.keys(category.subtopics).forEach(subtopic => {
        const card = document.createElement('div');
        card.className = 'subtopic-card glass-panel';
        card.innerHTML = `<h4>${subtopic}</h4><p style="font-family: 'Outfit', sans-serif; font-size: 0.95rem; color: var(--subtitle-color); margin-bottom: 0;">${category.subtopics[subtopic].description}</p>`;
        card.addEventListener('click', () => selectSubtopic(subtopic));
        grid.appendChild(card);
    });

    switchView('subtopicsView');
}

function selectSubtopic(subtopic) {
    currentState.subtopic = subtopic;
    const articles = topicsData[currentState.category].subtopics[subtopic].articles;
    const articleTitle = Object.keys(articles)[0];
    currentState.article = articleTitle;
    currentState.difficulty = 'intro';
    loadArticleView();
}

function renderPathsList() {
    currentState.mode = 'path';
    const grid = document.getElementById('pathsGrid');
    grid.innerHTML = '';
    Object.keys(pathsData).forEach(pathId => {
        const path = pathsData[pathId];
        const card = document.createElement('div');
        card.className = 'category-card glass-panel';
        card.innerHTML = `<div style="font-size: 0.8rem; color: var(--accent); font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">${path.steps.length} Steps</div><h3>${path.title}</h3><p style="font-family: 'Outfit', sans-serif; font-size: 1rem; color: var(--subtitle-color); margin-bottom: 0;">${path.description}</p>`;
        card.addEventListener('click', () => renderPathDetail(pathId));
        grid.appendChild(card);
    });
    switchView('pathsView');
}

function renderPathDetail(pathId) {
    currentState.currentPathId = pathId;
    const path = pathsData[pathId];
    document.getElementById('pathTitle').textContent = path.title;
    document.getElementById('pathDesc').textContent = path.description;

    const container = document.getElementById('pathStepsContainer');
    container.innerHTML = '';

    path.steps.forEach((step, index) => {
        const card = document.createElement('div');
        card.className = 'path-step-card';
        card.innerHTML = `<div class="path-step-number">${index + 1}</div><div class="path-step-info"><h4>${step.label || step.article}</h4><div class="path-step-meta">${step.category} &nbsp;&bull;&nbsp; ${step.subtopic}</div></div>`;
        card.addEventListener('click', () => startPathStep(index));
        container.appendChild(card);
    });

    switchView('pathDetailView');
}

function startPathStep(index) {
    currentState.currentPathStep = index;
    const stepData = pathsData[currentState.currentPathId].steps[index];
    currentState.category = stepData.category;
    currentState.subtopic = stepData.subtopic;
    currentState.article = stepData.article;
    currentState.difficulty = 'intro';
    loadArticleView();
}

function navigatePathStep(direction) {
    const path = pathsData[currentState.currentPathId];
    const newIndex = currentState.currentPathStep + direction;
    if (newIndex >= 0 && newIndex < path.steps.length) { startPathStep(newIndex); }
}

function showProfile() {
    document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
    const profile = JSON.parse(localStorage.getItem('osmosis_profile') || '{"name":"", "bio":""}');
    document.getElementById('profileName').value = profile.name;
    document.getElementById('profileBio').value = profile.bio;
    
    const avatarLetter = profile.name ? profile.name.charAt(0).toUpperCase() : 'U';
    document.getElementById('profileAvatar').textContent = avatarLetter;
    
    switchView('profileView');
}

function saveProfile() {
    const profile = { name: document.getElementById('profileName').value.trim(), bio: document.getElementById('profileBio').value.trim() };
    localStorage.setItem('osmosis_profile', JSON.stringify(profile));
    
    const avatarLetter = profile.name ? profile.name.charAt(0).toUpperCase() : 'U';
    document.getElementById('profileAvatar').textContent = avatarLetter;
    
    const btn = document.getElementById('saveProfileBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Saved!';
    setTimeout(() => btn.textContent = originalText, 2000);
}

function loadArticleView() {
    document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.difficulty-btn[data-level="intro"]').classList.add('active');

    const navBar = document.getElementById('pathNavBar');
    if (currentState.mode === 'path') {
        const path = pathsData[currentState.currentPathId];
        document.getElementById('currentPathName').textContent = path.title;
        document.getElementById('pathProgress').textContent = `Step ${currentState.currentPathStep + 1} of ${path.steps.length}`;
        document.getElementById('prevPathStepBtn').style.display = currentState.currentPathStep > 0 ? 'block' : 'none';
        
        if (currentState.currentPathStep < path.steps.length - 1) {
            document.getElementById('nextPathStepBtn').textContent = 'Next Step';
            document.getElementById('nextPathStepBtn').style.display = 'block';
            document.getElementById('nextPathStepBtn').onclick = () => navigatePathStep(1);
        } else {
            document.getElementById('nextPathStepBtn').textContent = 'Finish Path';
            document.getElementById('nextPathStepBtn').onclick = renderPathsList;
        }
        navBar.style.display = 'flex';
    } else {
        navBar.style.display = 'none';
    }

    trackEngagement('read', null); 
    renderArticleContent();
    switchView('articleView');
}

function renderArticleContent() {
    const article = topicsData[currentState.category].subtopics[currentState.subtopic].articles[currentState.article];
    const difficulty = currentState.difficulty;

    document.getElementById('articleTitle').textContent = currentState.article;
    const categoryTag = document.getElementById('articleCategory');
    categoryTag.textContent = currentState.category;
    categoryTag.onclick = () => { selectCategory(currentState.category); };
    
    document.getElementById('articleSubtopic').textContent = currentState.subtopic;
    
    const contentSource = article[difficulty];
    const staticContent = document.getElementById('articleContent');
    
    // Render normally
    let rawHtml = contentSource.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('');

    const annotations = getAnnotations();
    annotations.forEach(ann => {
        if (ann.text) {
            const escaped = ann.text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            const regex = new RegExp(`(${escaped})`, 'gi');
            rawHtml = rawHtml.replace(regex, `<mark class="highlighted-text">$1</mark>`);
        }
    });

    staticContent.innerHTML = rawHtml;

    renderSources(article.sources);
    loadAnnotations();
    loadReflections();
}

function renderSources(sources) {
    const panel = document.getElementById('sourcesPanel');
    panel.innerHTML = '<h3>Sources</h3>';
    const list = document.createElement('div');
    list.className = 'sources-list';

    sources.forEach((source) => {
        const item = document.createElement('div');
        item.className = 'source-item';
        item.innerHTML = `<div><div style="font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 1.05rem;">${source.title}</div><div style="font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: var(--subtitle-color); margin-top: 4px;">${source.author} (${source.year}) &nbsp;&bull;&nbsp; ${source.type}</div></div><a href="${source.url}" target="_blank" class="source-btn">Read More</a>`;
        list.appendChild(item);
    });
    panel.appendChild(list);
}

function saveNewAnnotation(noteText) {
    if (!activeSelection) { 
        alert('Please select some text in the article first to highlight it.'); 
        return; 
    }

    const annotations = getAnnotations();
    const exists = annotations.find(a => a.text === activeSelection);
    if (exists && !noteText) { window.getSelection().removeAllRanges(); return; }

    const annotation = { id: Date.now(), text: activeSelection, note: noteText || 'Highlighted', created: new Date().toISOString(), article: currentState.article };
    annotations.push(annotation);
    saveAnnotations(annotations);
    trackEngagement('annotation', annotation.text);
    
    document.getElementById('annotationInput').value = '';
    activeSelection = '';
    window.getSelection().removeAllRanges();
    renderArticleContent();
}

function loadAnnotations() {
    const annotations = getAnnotations();
    const list = document.getElementById('annotationsList');
    list.innerHTML = '';

    if (annotations.length === 0) {
        list.innerHTML = '<p style="color: var(--subtitle-color); font-size: 0.95rem; font-family: \'Outfit\', sans-serif;">No annotations yet. Highlight text and add notes.</p>';
        return;
    }

    annotations.forEach(ann => {
        const item = document.createElement('div');
        item.className = 'annotation-item';
        item.innerHTML = `${ann.text ? `<div class="annotation-quote">"${ann.text}"</div>` : ''}<div style="color: var(--dark-text); font-family: 'Outfit', sans-serif;">${ann.note}</div><button class="back small" onclick="deleteAnnotation(${ann.id})">Remove</button>`;
        list.appendChild(item);
    });
}

function saveReflection() {
    const text = document.getElementById('reflectionInput').value.trim();
    if (!text) { alert('Write something before saving'); return; }

    const reflections = getReflections();
    reflections.push({ id: Date.now(), text: text, created: new Date().toISOString(), article: currentState.article });
    saveReflections(reflections);
    trackEngagement('reflection', text);

    document.getElementById('reflectionInput').value = '';
    loadReflections();
}

function loadReflections() {
    const reflections = getReflections();
    const container = document.getElementById('reflectionHistory');
    container.innerHTML = '';

    if (reflections.length === 0) return;

    const title = document.createElement('h4');
    title.style.marginTop = 'var(--spacing-xl)';
    title.style.paddingTop = 'var(--spacing-md)';
    title.style.borderTop = '1px solid var(--glass-border)';
    title.textContent = 'Your Previous Reflections';
    container.appendChild(title);

    reflections.forEach(reflection => {
        const entry = document.createElement('div');
        entry.className = 'reflection-entry';
        const date = new Date(reflection.created);
        const formatted = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        entry.innerHTML = `<div style="font-family: 'Outfit', sans-serif; font-size: 0.85rem; color: var(--subtitle-color); margin-bottom: 8px;">${formatted}</div><div style="line-height: 1.7; font-family: 'Lora', serif; font-size: 1.05rem;">${reflection.text}</div><button class="back small" onclick="deleteReflection(${reflection.id})">Remove</button>`;
        container.appendChild(entry);
    });
}

function getStorageKey() { return `article_${currentState.category}_${currentState.subtopic}_${currentState.article}`; }
function getAnnotations() { const data = localStorage.getItem(getStorageKey() + '_annotations'); return data ? JSON.parse(data) : []; }
function saveAnnotations(annotations) { localStorage.setItem(getStorageKey() + '_annotations', JSON.stringify(annotations)); }
function deleteAnnotation(id) { saveAnnotations(getAnnotations().filter(a => a.id !== id)); renderArticleContent(); }
function getReflections() { const data = localStorage.getItem(getStorageKey() + '_reflections'); return data ? JSON.parse(data) : []; }
function saveReflections(reflections) { localStorage.setItem(getStorageKey() + '_reflections', JSON.stringify(reflections)); }
function deleteReflection(id) { saveReflections(getReflections().filter(r => r.id !== id)); loadReflections(); }

function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewName).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToCategories() {
    currentState.mode = 'explore';
    currentState.category = null;
    currentState.subtopic = null;
    currentState.article = null;
    switchView('categoriesView');
}

function closeSourceModal() { document.getElementById('sourceModal').classList.remove('active'); }

window.deleteAnnotation = deleteAnnotation;
window.deleteReflection = deleteReflection;
window.closeSourceModal = closeSourceModal;