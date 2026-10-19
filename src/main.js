/**
 * GTD Flow - Main Application Logic
 *
 * This file contains the entire state management, UI rendering, and event handling logic
 * for the GTD Flow application. It has been refactored to work with Vite.
 *
 * Key concepts:
 * 1. State: The `state` object holds the current application data (tasks, projects, etc.).
 * 2. Persistence: `savePersistedData` and `loadPersistedData` sync the state with `localStorage`.
 * 3. Rendering: `renderApp` builds the HTML string based on the current state and injects it into the DOM.
 * 4. Event Binding: `bindEvents` attaches event listeners to the newly rendered DOM elements.
 */

    import { saveFile, getFile, deleteFile } from './ticklerStorage.js';
    import { SHOPPING_CATEGORIES, detectShoppingCategory } from './utils.js';
const STORAGE_KEY = 'gtd_flow_standalone_state_v1';

    const GTD_COLUMNS = [
      { id: 'inbox', title: 'Inbox', shortTitle: 'Inbox', icon: '📥', badgeBg: 'bg-slate-500/15 text-slate-400' },
      { id: 'next', title: 'Nächste Schritte', shortTitle: 'Nächste', icon: '⚡', badgeBg: 'bg-indigo-500/15 text-indigo-400' },
      { id: 'waiting', title: 'Warten auf', shortTitle: 'Warten', icon: '⏳', badgeBg: 'bg-amber-500/15 text-amber-400' },
      { id: 'someday', title: 'Später / Vielleicht', shortTitle: 'Später', icon: '🌱', badgeBg: 'bg-emerald-500/15 text-emerald-400' }
    ];

    const CONTEXT_DEFINITIONS = [
      { id: '@Computer', label: 'Computer', emoji: '💻' },
      { id: '@Zuhause', label: 'Zuhause', emoji: '🏠' },
      { id: '@Unterwegs', label: 'Unterwegs', emoji: '🚗' },
      { id: '@Telefon', label: 'Telefon', emoji: '📞' },
      { id: '⚡ 2-Minuten', label: '2-Minuten', emoji: '⚡' },
      { id: '🔋 Low-Energy', label: 'Low-Energy', emoji: '🔋' }
    ];

    function getRelativeDateString(offsetDays = 0) {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    }

    function formatReadableDate(dateStr) {
      if (!dateStr) return '';
      const today = getRelativeDateString(0);
      const tomorrow = getRelativeDateString(1);
      if (dateStr === today) return '🔥 Heute';
      if (dateStr === tomorrow) return 'Morgen';
      try {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        return dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
      } catch {
        return dateStr;
      }
    }

    const DEFAULT_PROJECTS = [
      { id: 'p1', name: 'Website Launch', icon: '🚀', outcome: "", supportNotes: "", links: [], archived: false },
      { id: 'p2', name: 'Balkon Oase', icon: '🌿', outcome: "", supportNotes: "", links: [], archived: false },
      { id: 'p3', name: 'Steuererklärung', icon: '📊', outcome: "", supportNotes: "", links: [], archived: false },
      { id: 'p4', name: 'Wochenplanung & Haushalt', icon: '🏠', outcome: "", supportNotes: "", links: [], archived: false }
    ];

    const DEFAULT_TASKS = [
      { id: 't1', title: 'Steuerberater wegen Belegen kurz anrufen', status: 'inbox', projectId: 'p3', deadline: getRelativeDateString(1), context: '@Telefon', completed: false, notes: 'Kurz Belege abklären' },
      { id: 't2', title: 'Mobile Navigation in Figma finalisieren', status: 'next', projectId: 'p1', deadline: getRelativeDateString(0), context: '@Computer', completed: false, notes: 'Kontrast & Button-Größen prüfen' },
      { id: 't3', title: 'Blumenerde & Übertöpfe im Baumarkt holen', status: 'next', projectId: 'p2', deadline: getRelativeDateString(3), context: '@Unterwegs', completed: false, notes: '2 Säcke Bio-Erde' },
      { id: 't4', title: 'Küche kurz aufräumen & Spülmaschine starten', status: 'next', projectId: 'p4', deadline: '', context: '⚡ 2-Minuten', completed: false, notes: 'Schneller Dopamin-Start' },
      { id: 't5', title: 'Schreibtisch-Schublade grob durchsortieren', status: 'someday', projectId: 'p4', deadline: '', context: '🔋 Low-Energy', completed: false, notes: 'Perfekt für abends mit Podcast' },
      { id: 't6', title: 'Rückmeldung vom Hosting-Support abwarten', status: 'waiting', projectId: 'p1', deadline: '', context: '@Computer', completed: false, notes: 'Ticket #4092' }
    ];

    const DEFAULT_SHOPPING = [
      { id: 's1', title: 'Avocados, Cherrytomaten & Gurke', category: 'fresh', checked: false },
      { id: 's2', title: 'Frisches Sauerteigbrot', category: 'bakery', checked: false },
      { id: 's3', title: 'Hähnchenbrustfilet (400g) & Lachs', category: 'meat_fish', checked: false },
      { id: 's4', title: 'Hafermilch, Eier & Mozzarella', category: 'fridge', checked: false },
      { id: 's5', title: 'Spaghetti, Basmatireis & Haferflocken', category: 'dry_goods', checked: false },
      { id: 's6', title: 'Dosentomaten, Kidneybohnen & Pesto', category: 'canned', checked: false },
      { id: 's7', title: 'TK-Rahmspinat & TK-Beerenmix', category: 'frozen', checked: false },
      { id: 's8', title: 'Espressobohnen & Mineralwasser', category: 'drinks', checked: false },
      { id: 's9', title: 'Spülmaschinentabs & Küchenrolle', category: 'household', checked: true }
    ];

    function loadPersistedData() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return null;
        return parsed;
      } catch (e) {
        console.error("Failed to parse local storage data. Falling back to defaults.", e);
        // Optionally back up the corrupted data
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) localStorage.setItem(STORAGE_KEY + "_backup", raw);
        } catch(err) {}
        return null;
      }
    }

    const savedData = loadPersistedData();

    // Migration: ensure all loaded projects have the new fields
    let loadedProjects = savedData && Array.isArray(savedData.projects) ? savedData.projects : DEFAULT_PROJECTS;
    loadedProjects = loadedProjects.map(p => ({
      ...p,
      outcome: p.outcome || '',
      supportNotes: p.supportNotes || '',
      links: Array.isArray(p.links) ? p.links : [],
      archived: !!p.archived
    }));

    const state = {
      darkMode: savedData && typeof savedData.darkMode === 'boolean' ? savedData.darkMode : true,
      deviceMode: window.innerWidth < 768 ? 'mobile' : 'pc',
      activeTab: 'board', // 'board' | 'projects' | 'shopping' | 'tickler'
      mobileStatus: 'next',
      selectedContextFilter: 'all',
      selectedProjectFilter: 'all',
      draggedTaskId: null,
      dragOverColId: null,
      quickTitle: '',
      shoppingInput: '',
      supermarketMode: false,
      showCheckedShopping: false,
      newProjectIcon: '🎯',
      newProjectName: '',
      selectedTaskId: null,
      focusTaskId: null,
      showGitHubModal: false,
      showSyncModal: false,
      bulkImportText: '',
      toastMessage: null,
      taskAiResult: null,
      githubSteps: {
        step1: false,
        step2: false,
        step3: false
      },
      projects: loadedProjects,
      tasks: savedData && Array.isArray(savedData.tasks) ? savedData.tasks : DEFAULT_TASKS,
      shoppingItems: savedData && Array.isArray(savedData.shoppingItems) ? savedData.shoppingItems : DEFAULT_SHOPPING,
      ticklerItems: savedData && Array.isArray(savedData.ticklerItems) ? savedData.ticklerItems : [],
      activeTicklerMonth: new Date().getMonth() + 1, // 1-12
      activeTicklerDay: new Date().getDate(), // 1-31
      activeDossierProjectId: null
    };

    function savePersistedData() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          darkMode: state.darkMode,
          projects: state.projects,
          tasks: state.tasks,
          shoppingItems: state.shoppingItems,
          ticklerItems: state.ticklerItems
        }));
      } catch (e) {
        console.error(e);
      }
    }

    let toastTimer = null;
    function showToast(msg) {
      state.toastMessage = msg;
      renderApp();
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        state.toastMessage = null;
        renderApp();
      }, 2600);
    }

    function generateTaskCoachSuggestion(task) {
      const norm = task.title.toLowerCase();
      let suggestedContext = task.context || '@Computer';
      let suggestedStatus = task.status === 'inbox' ? 'next' : task.status;

      if (norm.includes('anrufen') || norm.includes('telefon')) suggestedContext = '@Telefon';
      else if (norm.includes('kaufen') || norm.includes('baumarkt') || norm.includes('abholen')) suggestedContext = '@Unterwegs';
      else if (norm.includes('warten') || norm.includes('rückmeldung')) suggestedStatus = 'waiting';
      else if (norm.includes('kurz') || norm.includes('2 min')) suggestedContext = '⚡ 2-Minuten';

      state.taskAiResult = {
        betterTitle: `${task.title} – ersten 2-Minuten-Schritt starten`,
        suggestedStatus,
        suggestedContext,
        microSteps: [
          `1. Alles Nötige für „${task.title.slice(0, 24)}“ bereitstellen (1 Min)`,
          `2. Den allerersten kleinen Handgriff direkt erledigen (2 Min)`,
          `3. Kurz abhaken & nächsten Schritt markieren`
        ]
      };
      renderApp();
    }

        function downloadBackupJson() {
      const data = JSON.stringify({
        tasks: state.tasks,
        projects: state.projects,
        shoppingItems: state.shoppingItems
      }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gtd-flow-backup-${getRelativeDateString(0)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup-Datei (.json) heruntergeladen 💾');
    }

    function addTask() {
      const title = state.quickTitle.trim();
      if (!title) return;
      const assignedContext = state.selectedContextFilter !== 'all' ? state.selectedContextFilter : '@Computer';
      const assignedProject = state.selectedProjectFilter !== 'all' ? state.selectedProjectFilter : '';
      const targetStatus = state.deviceMode === 'mobile' ? state.mobileStatus : 'inbox';

      state.tasks.unshift({
        id: 't-' + Date.now(),
        title,
        status: targetStatus,
        projectId: assignedProject,
        deadline: '',
        context: assignedContext,
        completed: false,
        notes: ''
      });
      state.quickTitle = '';
      savePersistedData();
      const colName = GTD_COLUMNS.find(c => c.id === targetStatus)?.shortTitle || 'Inbox';
      showToast(`In „${colName}“ gespeichert ✨`);
    }

    function quickAddAsShopping() {
      const title = state.quickTitle.trim();
      if (!title) return;
      const catId = detectShoppingCategory(title);
      const catObj = SHOPPING_CATEGORIES.find(c => c.id === catId);
      state.shoppingItems.unshift({
        id: 's-' + Date.now(),
        title,
        category: catId,
        checked: false
      });
      state.quickTitle = '';
      savePersistedData();
      showToast(`In ${catObj ? catObj.shortLabel : 'Einkauf'} gelegt 🛒`);
    }

    function addShoppingItems() {
      const raw = state.shoppingInput.trim();
      if (!raw) return;
      const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
      parts.forEach((title, idx) => {
        state.shoppingItems.unshift({
          id: `s-${Date.now()}-${idx}`,
          title,
          category: detectShoppingCategory(title),
          checked: false
        });
      });
      state.shoppingInput = '';
      savePersistedData();
      showToast(parts.length === 1 ? `„${parts[0]}“ einsortiert 🛒` : `${parts.length} Artikel einsortiert 🛒`);
    }

    function toggleTaskCompleted(taskId) {
      const t = state.tasks.find(item => item.id === taskId);
      if (!t) return;
      t.completed = !t.completed;
      if (state.focusTaskId === taskId && t.completed) {
        state.focusTaskId = null;
      }
      savePersistedData();
      showToast(t.completed ? 'Erledigt! Stark gemacht 🎉' : 'Wieder geöffnet');
    }

    function promoteInboxToNext(taskId) {
      const t = state.tasks.find(item => item.id === taskId);
      if (!t) return;
      t.status = 'next';
      savePersistedData();
      showToast('Nach „Nächste Schritte“ verschoben ⚡');
    }

    function startRandomFocusTask() {
      const candidates = state.tasks.filter(t => !t.completed && t.status !== "planned" && (t.status === 'next' || t.status === 'inbox'));
      if (candidates.length === 0) {
        showToast('Keine offenen Aufgaben für den Fokus-Modus 🎉');
        return;
      }
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      state.focusTaskId = pick.id;
      renderApp();
    }

    function openGoogleCalendar(task) {
      if (!task) return;
      const text = encodeURIComponent(task.title);
      const project = state.projects.find(p => p.id === task.projectId);
      const details = encodeURIComponent(
        `GTD Kontext: ${task.context || '-'}\nProjekt: ${project ? project.name : 'Kein Projekt'}\nNotiz: ${task.notes || ''}`
      );
      let datesParam = '';
      if (task.deadline) {
        const cleanDate = task.deadline.replace(/-/g, '');
        datesParam = `&dates=${cleanDate}/${cleanDate}`;
      }
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}${datesParam}`;
      window.open(url, '_blank');
    }

    function bulkImportFromText() {
      const raw = state.bulkImportText.trim();
      if (!raw) return;
      const lines = raw.split('\n').map(l => l.replace(/^[-*•\d.)\s]+/, '').trim()).filter(Boolean);
      let tCount = 0;
      let sCount = 0;
      lines.forEach((line, idx) => {
        if (line.toLowerCase().startsWith('einkauf:') || line.toLowerCase().startsWith('kaufen:')) {
          const clean = line.replace(/^(einkauf|kaufen):\s*/i, '').trim();
          state.shoppingItems.unshift({
            id: `s-imp-${Date.now()}-${idx}`,
            title: clean,
            category: detectShoppingCategory(clean),
            checked: false
          });
          sCount++;
        } else {
          state.tasks.unshift({
            id: `t-imp-${Date.now()}-${idx}`,
            title: line,
            status: 'inbox',
            projectId: '',
            deadline: '',
            context: '@Computer',
            completed: false,
            notes: ''
          });
          tCount++;
        }
      });
      state.bulkImportText = '';
      state.showSyncModal = false;
      savePersistedData();
      showToast(`${tCount} Aufgaben & ${sCount} Einkäufe importiert ✨`);
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function renderApp() {
      savePersistedData();
      const d = new Date();
      const currentMonth = d.getMonth() + 1;
      const currentDay = d.getDate();

      const dueTicklers = state.ticklerItems.filter(i => {
        // Simple logic: if target is today, or past days in this month
        return i.targetMonth === currentMonth && i.targetDay <= currentDay;
      });

      const root = document.getElementById('app');
      const dark = state.darkMode;
      document.documentElement.classList.toggle('dark', dark);
      document.body.className = `min-h-screen flex flex-col transition-colors duration-200 ${
        dark ? 'bg-slate-950 text-slate-100' : 'bg-stone-100 text-slate-800'
      }`;

      const bgCard = dark ? 'bg-slate-900 border-slate-800/90' : 'bg-white border-stone-200/90 shadow-sm';
      const bgSubtle = dark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-stone-50 border-stone-200/80';
      const textMuted = dark ? 'text-slate-400' : 'text-slate-500';
      const borderSubtle = dark ? 'border-slate-800/80' : 'border-stone-200';

      let openTasksCount = 0;
      let selectedTask = null;
      let focusTask = null;
      const actionableProjectIds = new Set();

      for (let i = 0; i < state.tasks.length; i++) {
        const t = state.tasks[i];

        if (!t.completed) {
          if (t.status !== 'planned') {
            openTasksCount++;
          }
          if (t.status === 'next' || t.status === 'waiting') {
            actionableProjectIds.add(t.projectId);
          }
        }

        if (t.id === state.selectedTaskId) selectedTask = t;
        if (t.id === state.focusTaskId) focusTask = t;
      }

      let stuckProjectsCount = 0;
      const activeProjects = [];
      for (let i = 0; i < state.projects.length; i++) {
        const p = state.projects[i];
        if (!p.archived) {
          activeProjects.push(p);
          if (!actionableProjectIds.has(p.id)) {
            stuckProjectsCount++;
          }
        }
      }

      let openShoppingCount = 0;
      const checkedShoppingList = [];
      for (let i = 0; i < state.shoppingItems.length; i++) {
        const item = state.shoppingItems[i];
        if (item.checked) {
          checkedShoppingList.push(item);
        } else {
          openShoppingCount++;
        }
      }

      const liveShoppingPreview = state.shoppingInput.trim()
        ? state.shoppingInput.split(',').map(s => s.trim()).filter(Boolean).map(title => {
            const cId = detectShoppingCategory(title);
            const cObj = SHOPPING_CATEGORIES.find(c => c.id === cId) || SHOPPING_CATEGORIES[4];
            return { title, label: cObj.shortLabel };
          })
        : [];

      // Optimize: Pre-calculate tasks grouped by GTD columns instead of O(N*M) filtering inside the template
      const selectedContext = state.selectedContextFilter;
      const selectedProject = state.selectedProjectFilter;
      const isContextAll = selectedContext === 'all';
      const isProjectAll = selectedProject === 'all';

      const groupedTasks = {
        inbox: [], next: [], waiting: [], someday: []
      };

      const renderTasks = state.tasks;
      for (let i = 0; i < renderTasks.length; i++) {
        const t = renderTasks[i];
        if ((isContextAll || t.context === selectedContext) &&
            (isProjectAll || t.projectId === selectedProject)) {
          const arr = groupedTasks[t.status];
          if (arr !== undefined) {
            arr.push(t);
          }
        }
      }

      root.innerHTML = `
        <!-- Top Header -->
        <header class="sticky top-0 z-30 backdrop-blur-md border-b px-3 sm:px-4 py-2.5 ${dark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-stone-200'}">
          <div class="max-w-[1200px] mx-auto flex items-center justify-between gap-1.5">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                ✓
              </div>
              <h1 class="text-sm font-bold tracking-tight hidden xs:block">GTD Flow</h1>
              <div
                class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 flex items-center gap-1 shadow-sm"
                title="Vite Build Setup aktiv"
              >
                <span>⚡ Vite Setup</span>
              </div>
              <button
                id="btn-open-github"
                class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 flex items-center gap-1 transition-all"
              >
                <span>📱 GitHub-Hilfe</span>
              </button>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                id="btn-focus-mode"
                title="ADHS 1-Task Fokus: Blendet alles bis auf 1 Aufgabe aus"
                class="px-2 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 hover:bg-indigo-500/20 flex items-center gap-1"
              >
                <span>🎯</span>
                <span class="hidden sm:inline">Fokus</span>
              </button>

              <button
                id="btn-open-sync"
                class="px-2 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1 ${bgSubtle} hover:border-indigo-500/40"
              >
                <span>📲</span>
                <span class="hidden sm:inline">Import</span>
              </button>

              <div class="flex p-0.5 rounded-xl border ${dark ? 'bg-slate-800 border-slate-700' : 'bg-stone-200/70 border-stone-300'}">
                <button
                  id="btn-mode-pc"
                  title="PC-Ansicht"
                  class="px-1.5 py-1 rounded-lg text-[11px] font-bold ${
                    state.deviceMode === 'pc'
                      ? dark ? 'bg-slate-950 text-indigo-400' : 'bg-white text-indigo-600 shadow-sm'
                      : textMuted
                  }"
                >
                  🖥️
                </button>
                <button
                  id="btn-mode-mobile"
                  title="Handy-Ansicht"
                  class="px-1.5 py-1 rounded-lg text-[11px] font-bold ${
                    state.deviceMode === 'mobile'
                      ? dark ? 'bg-slate-950 text-indigo-400' : 'bg-white text-indigo-600 shadow-sm'
                      : textMuted
                  }"
                >
                  📱
                </button>
              </div>

              <button
                id="btn-toggle-theme"
                class="p-1.5 rounded-xl border text-xs ${
                  dark ? 'bg-slate-800 text-amber-400 border-slate-700' : 'bg-white text-slate-700 border-stone-300'
                }"
              >
                ${dark ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </header>

        <!-- Main Workspace Container -->
        <main class="flex-1 w-full mx-auto p-3 sm:p-5 flex flex-col gap-4 ${state.deviceMode === 'mobile' ? 'max-w-[430px] pb-16' : 'max-w-[1200px]'}">

          <!-- 3-Pillar Navigation -->
          <div class="grid grid-cols-4 p-1 rounded-2xl border ${bgCard}">
            <button
              data-tab="board"
              class="tab-btn py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                state.activeTab === 'board' ? 'bg-indigo-600 text-white shadow-sm' : `${textMuted} hover:text-indigo-400`
              }"
            >
              <span>⚡ Aufgaben</span>
              <span class="text-[10px] px-1.5 rounded-full ${state.activeTab === 'board' ? 'bg-indigo-800 text-indigo-100' : dark ? 'bg-slate-800 text-slate-400' : 'bg-stone-200 text-slate-600'}">
                ${openTasksCount}
              </span>
            </button>

            <button
              data-tab="projects"
              class="tab-btn py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                state.activeTab === 'projects' ? 'bg-indigo-600 text-white shadow-sm' : `${textMuted} hover:text-indigo-400`
              }"
            >
              <span>📁 Projekte</span>
              ${stuckProjectsCount > 0 ? `<span class="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] mr-1"></span>` : ''}
              <span class="text-[10px] px-1.5 rounded-full ${state.activeTab === 'projects' ? 'bg-indigo-800 text-indigo-100' : dark ? 'bg-slate-800 text-slate-400' : 'bg-stone-200 text-slate-600'}">
                ${state.projects.length}
              </span>
            </button>

            <button
              data-tab="shopping"
              class="tab-btn py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                state.activeTab === 'shopping' ? 'bg-emerald-600 text-white shadow-sm' : `${textMuted} hover:text-emerald-400`
              }"
            >
              <span>🛒 Einkauf</span>
              ${openShoppingCount > 0 ? `
                <span class="text-[10px] px-1.5 rounded-full ${state.activeTab === 'shopping' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-500/20 text-emerald-400'}">
                  ${openShoppingCount}
                </span>
              ` : ''}
            </button>
            <button
              data-tab="tickler"
              class="tab-btn py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                state.activeTab === 'tickler' ? 'bg-amber-600 text-white shadow-sm' : `${textMuted} hover:text-amber-400`
              }"
            >
              <span>🗂️ 43 Mappen</span>
            </button>
          </div>

          <!-- TAB 1: GTD BOARD -->
          ${state.activeTab === 'board' ? `
            <div class="flex flex-col gap-3">
            ${dueTicklers.length > 0 ? `
              <div class="rounded-xl border border-amber-500/40 bg-amber-500/15 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm mb-1">
                <div class="flex items-center gap-2 text-amber-500">
                  <span class="text-xl">📂</span>
                  <div class="text-sm font-bold leading-tight">
                    Heute in deiner Tages-Mappe: <span class="bg-amber-500 text-amber-950 px-1.5 rounded-md">${dueTicklers.length}</span> Einträge
                  </div>
                </div>
                <button id="btn-open-due-ticklers" class="px-3 py-1.5 w-full sm:w-auto rounded-lg bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold transition-colors">
                  Ansehen
                </button>
              </div>
            ` : ''}
              <!-- Quick Capture Bar -->
              <form id="form-add-task" class="p-1.5 rounded-2xl border flex items-center gap-2 ${bgCard}">
                <div class="flex-1 flex items-center gap-2 pl-2.5">
                  <span class="text-indigo-400 font-bold text-base">+</span>
                  <input
                    id="input-quick-task"
                    type="text"
                    value="${escapeHtml(state.quickTitle)}"
                    placeholder="Neue Aufgabe (Enter zum Speichern)..."
                    class="w-full bg-transparent py-1.5 text-xs sm:text-sm focus:outline-none placeholder:text-slate-500"
                  />
                </div>
                ${state.quickTitle.trim().length > 1 ? `
                  <button
                    type="button"
                    id="btn-quick-to-shop"
                    class="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-[11px] font-bold flex items-center gap-1 shrink-0 hover:bg-emerald-500/25"
                  >
                    🛒 Einkauf
                  </button>
                ` : ''}
                <button
                  type="submit"
                  class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0"
                >
                  Hinzufügen
                </button>
              </form>

              <!-- Single-Line Combined Filter Bar -->
              <div class="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    data-ctx="all"
                    class="ctx-filter-btn px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                      state.selectedContextFilter === 'all'
                        ? 'bg-indigo-600 text-white'
                        : `${bgCard} ${textMuted} border hover:border-indigo-500/40`
                    }"
                  >
                    Alle Kontexte
                  </button>
                  ${CONTEXT_DEFINITIONS.map(ctx => {
                    const isActive = state.selectedContextFilter === ctx.id;
                    return `
                      <button
                        data-ctx="${escapeHtml(ctx.id)}"
                        class="ctx-filter-btn px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1 border ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : `${bgCard} ${textMuted} hover:border-indigo-500/40`
                        }"
                      >
                        <span>${ctx.emoji}</span>
                        <span>${escapeHtml(ctx.label)}</span>
                      </button>
                    `;
                  }).join('')}
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <select
                    id="select-project-filter"
                    class="text-[11px] font-semibold px-2.5 py-1 rounded-xl border focus:outline-none ${bgCard}"
                  >
                    <option value="all" ${state.selectedProjectFilter === 'all' ? 'selected' : ''}>📁 Alle Projekte</option>
                    ${state.projects.map(p => `
                      <option value="${escapeHtml(p.id)}" ${state.selectedProjectFilter === p.id ? 'selected' : ''}>
                        ${p.icon} ${escapeHtml(p.name)}
                      </option>
                    `).join('')}
                  </select>

                  ${(state.selectedContextFilter !== 'all' || state.selectedProjectFilter !== 'all') ? `
                    <button
                      id="btn-reset-filters"
                      title="Filter zurücksetzen"
                      class="px-2 py-1 rounded-xl bg-indigo-500/15 text-indigo-400 text-[11px] font-bold hover:bg-indigo-500/25"
                    >
                      ↺ Reset
                    </button>
                  ` : ''}
                </div>
              </div>

              <!-- Mobile Column Switcher -->
              ${state.deviceMode === 'mobile' ? `
                <div class="grid grid-cols-4 p-1 rounded-xl border ${bgCard}">
                  ${GTD_COLUMNS.map(col => {
                    const count = groupedTasks[col.id] ? groupedTasks[col.id].filter(t => !t.completed).length : 0;
                    const active = state.mobileStatus === col.id;
                    return `
                      <button
                        data-mobcol="${col.id}"
                        class="mob-col-btn py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                          active ? 'bg-indigo-600 text-white' : textMuted
                        }"
                      >
                        <span class="truncate">${escapeHtml(col.shortTitle)}</span>
                        <span class="text-[10px] opacity-75">(${count})</span>
                      </button>
                    `;
                  }).join('')}
                </div>
              ` : ''}

              <!-- Columns Grid -->
              <div class="${state.deviceMode === 'pc' ? 'grid grid-cols-1 md:grid-cols-4 gap-3.5' : 'space-y-3'}">
                ${GTD_COLUMNS.filter(col => state.deviceMode === 'pc' || col.id === state.mobileStatus).map(col => {
                  const colTasks = groupedTasks[col.id] || [];
                  return `
                    <div
                      data-coldrop="${col.id}"
                      class="gtd-col-drop rounded-2xl border p-3 flex flex-col gap-2.5 min-h-[280px] transition-all ${bgCard}"
                    >
                      <div class="flex items-center justify-between border-b pb-2 ${borderSubtle}">
                        <div class="flex items-center gap-1.5">
                          <span class="text-xs">${col.icon}</span>
                          <h3 class="font-bold text-xs">${escapeHtml(col.title)}</h3>
                        </div>
                        <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${col.badgeBg}">
                          ${colTasks.filter(t => !t.completed).length}
                        </span>
                      </div>

                      <div class="space-y-2 flex-1">
                        ${colTasks.length > 0 ? colTasks.map(task => {
                          const project = state.projects.find(p => p.id === task.projectId);
                          const ctxObj = CONTEXT_DEFINITIONS.find(c => c.id === task.context);
                          return `
                            <div
                              draggable="true"
                              data-taskid="${task.id}"
                              class="task-card group border p-2.5 rounded-xl cursor-pointer transition-all hover:border-indigo-500/50 ${bgSubtle} ${
                                task.completed ? 'opacity-45' : ''
                              }"
                            >
                              <div class="flex items-start justify-between gap-2">
                                <div class="flex items-start gap-2.5 min-w-0">
                                  <button
                                    data-checktask="${task.id}"
                                    class="btn-check-task mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                      task.completed
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'border-slate-400 hover:border-indigo-400'
                                    }"
                                  >
                                    ${task.completed ? '<span class="text-[10px] font-bold">✓</span>' : ''}
                                  </button>
                                  <span class="text-xs font-medium leading-snug ${task.completed ? 'line-through text-slate-500' : ''}">
                                    ${escapeHtml(task.title)}
                                  </span>
                                </div>

                                ${task.status === 'inbox' && !task.completed ? `
                                  <button
                                    data-promotetask="${task.id}"
                                    title="Nach Nächste Schritte verschieben"
                                    class="btn-promote-task px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 text-[10px] font-bold shrink-0 hover:bg-indigo-500/25"
                                  >
                                    →
                                  </button>
                                ` : ''}
                              </div>

                              ${(task.context || project || task.deadline) ? `
                                <div class="flex items-center gap-2 flex-wrap pt-2 mt-1.5 border-t text-[10px] ${borderSubtle} ${textMuted}">
                                  ${task.context ? `
                                    <span class="font-medium">${ctxObj ? ctxObj.emoji : ''} ${escapeHtml(ctxObj ? ctxObj.label : task.context)}</span>
                                  ` : ''}
                                  ${project ? `
                                    <span class="text-indigo-400 font-medium truncate max-w-[125px]">• ${project.icon} ${escapeHtml(project.name)}</span>
                                  ` : ''}
                                  ${task.deadline ? `
                                    <span class="text-amber-400 font-semibold ml-auto">${formatReadableDate(task.deadline)}</span>
                                  ` : ''}
                                </div>
                              ` : ''}
                            </div>
                          `;
                        }).join('') : `
                          <div class="h-24 flex items-center justify-center text-center p-3 text-[11px] text-slate-500 border border-dashed rounded-xl ${borderSubtle}">
                            Leer
                          </div>
                        `}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <!-- TAB 2: PROJECTS -->
          ${state.activeTab === 'projects' ? `
            <div class="space-y-4">
              <form id="form-add-project" class="p-2 rounded-2xl border flex gap-2 items-center ${bgCard}">
                <input
                  id="input-proj-icon"
                  type="text"
                  value="${escapeHtml(state.newProjectIcon)}"
                  maxlength="2"
                  class="w-10 text-center py-1.5 rounded-xl border text-sm ${bgSubtle}"
                />
                <input
                  id="input-proj-name"
                  type="text"
                  value="${escapeHtml(state.newProjectName)}"
                  placeholder="Neues Projekt anlegen..."
                  class="flex-1 px-2 py-1.5 bg-transparent text-xs sm:text-sm focus:outline-none"
                />
                <button
                  type="submit"
                  class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0"
                >
                  + Projekt
                </button>
              </form>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                ${state.projects.map(proj => {
                  const projTasks = state.tasks.filter(t => t.projectId === proj.id && !t.completed);
                  const nextStepTask = projTasks.find(t => t.status === 'next') || projTasks[0];
                  return `
                    <div class="border rounded-2xl p-4 flex flex-col gap-3 ${bgCard}">
                      ${(() => {
                        const isStuck = !proj.archived && !state.tasks.some(t => t.projectId === proj.id && !t.completed && (t.status === 'next' || t.status === 'waiting'));
                        if (!isStuck) return '';
                        return `
                          <div class="mb-1 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 flex flex-col gap-2">
                            <div class="flex items-center gap-1.5 text-amber-500 text-xs font-semibold">
                              <span>⚠️</span>
                              <span>Kein aktiver nächster Schritt definiert!</span>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                              <button data-action="dossier" data-projid="${proj.id}" class="btn-proj-action px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold hover:bg-amber-500/30 transition-colors">
                                ⚡ Schritt anlegen
                              </button>
                              <button data-action="archive" data-projid="${proj.id}" class="btn-proj-action px-2 py-1 rounded border border-amber-500/30 text-amber-400 text-[10px] font-bold hover:bg-amber-500/20 transition-colors">
                                ✅ Abschließen
                              </button>
                            </div>
                          </div>
                        `;
                      })()}
                      <div class="flex items-center justify-between border-b pb-2.5 ${borderSubtle}">
                        <div class="flex items-center gap-2">
                          <span class="text-xl">${proj.icon}</span>
                          <div>
                            <h3 class="font-bold text-sm">${escapeHtml(proj.name)}</h3>
                            <p class="text-[10px] ${textMuted}">${projTasks.length} aktive Schritte</p>
                          </div>
                        </div>
                        <button data-action="dossier" data-projid="${proj.id}" class="btn-proj-action p-1.5 rounded-lg border hover:bg-slate-500/10 ${bgSubtle} text-xs transition-colors" title="Projekt-Dossier öffnen">
                          📂 Öffnen
                        </button>
                        <button
                          data-filterproj="${proj.id}"
                          class="btn-filter-proj text-[11px] font-bold text-indigo-400 hover:underline"
                        >
                          Filtern →
                        </button>
                      </div>

                      ${nextStepTask ? `
                        <div class="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 space-y-1">
                          <span class="text-[9px] font-bold uppercase tracking-wider text-indigo-400 block">
                            ⚡ Nächster Schritt
                          </span>
                          <p class="text-xs font-semibold">${escapeHtml(nextStepTask.title)}</p>
                        </div>
                      ` : `
                        <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-400">
                          Kein nächster Schritt offen
                        </div>
                      `}

                      <div class="space-y-1.5 flex-1">
                        ${projTasks.map(t => `
                          <div
                            data-taskid="${t.id}"
                            class="task-card text-xs p-2 rounded-xl border flex justify-between items-center gap-2 cursor-pointer hover:border-indigo-500/40 ${bgSubtle}"
                          >
                            <div class="flex items-center gap-2 min-w-0">
                              <button
                                data-checktask="${t.id}"
                                class="btn-check-task w-3.5 h-3.5 rounded-full border border-slate-400 shrink-0 hover:border-emerald-500"
                              ></button>
                              <span class="truncate">${escapeHtml(t.title)}</span>
                            </div>
                            <span class="text-[10px] shrink-0 ${textMuted}">${escapeHtml(t.context)}</span>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <!-- TAB 3: SHOPPING LIST -->
          ${state.activeTab === 'shopping' ? `
            <div class="space-y-3.5">
              <form id="form-add-shopping" class="p-2 rounded-2xl border space-y-2 ${bgCard}">
                <div class="flex items-center gap-2">
                  <span class="ml-2 text-sm">🛒</span>
                  <input
                    id="input-shopping"
                    type="text"
                    value="${escapeHtml(state.shoppingInput)}"
                    placeholder="Was brauchst du? (z.B. Milch, Äpfel, Nudeln, TK-Pizza)..."
                    class="flex-1 py-1.5 bg-transparent text-xs sm:text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    id="btn-supermarket-mode"
                    class="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1 shrink-0 ${
                      state.supermarketMode ? 'bg-emerald-600 text-white border-emerald-500' : `${bgSubtle} ${textMuted}`
                    }"
                  >
                    👁️ <span class="hidden sm:inline">Laden-Modus</span>
                  </button>
                  <button
                    type="submit"
                    class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0"
                  >
                    + Reinlegen
                  </button>
                </div>

                ${liveShoppingPreview.length > 0 ? `
                  <div class="flex items-center gap-1.5 flex-wrap px-2 pb-1">
                    ${liveShoppingPreview.map(item => `
                      <span class="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-medium">
                        ${escapeHtml(item.title)} → ${escapeHtml(item.label)}
                      </span>
                    `).join('')}
                  </div>
                ` : ''}
              </form>

              <div class="${state.deviceMode === 'pc' && !state.supermarketMode ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-2.5'}">
                ${SHOPPING_CATEGORIES.map(cat => {
                  const catItems = state.shoppingItems.filter(i => i.category === cat.id && !i.checked);
                  if (catItems.length === 0) return '';
                  return `
                    <div class="rounded-2xl border overflow-hidden ${bgCard}">
                      <div class="px-3.5 py-2 text-xs font-bold flex justify-between items-center border-b ${borderSubtle}">
                        <span>${cat.label}</span>
                        <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                          ${catItems.length}
                        </span>
                      </div>
                      <div class="divide-y ${dark ? 'divide-slate-800/60' : 'divide-stone-100'}">
                        ${catItems.map(item => `
                          <div
                            data-shopid="${item.id}"
                            class="shop-item-row px-3.5 flex items-center gap-3 cursor-pointer hover:bg-emerald-500/10 transition-colors ${
                              state.supermarketMode ? 'py-4 text-base font-bold' : 'py-2.5 text-xs sm:text-sm font-medium'
                            }"
                          >
                            <div class="rounded-md border-2 border-emerald-500 shrink-0 ${state.supermarketMode ? 'w-6 h-6' : 'w-4 h-4'}"></div>
                            <span class="leading-snug">${escapeHtml(item.title)}</span>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              ${checkedShoppingList.length > 0 ? `
                <div class="p-3 rounded-2xl border ${bgCard}">
                  <div class="flex items-center justify-between">
                    <button
                      id="btn-toggle-checked-shop"
                      class="text-xs font-bold flex items-center gap-1.5 ${textMuted}"
                    >
                      <span>${state.showCheckedShopping ? '▼' : '▶'} ✓ Im Einkaufswagen (${checkedShoppingList.length})</span>
                    </button>
                    <button
                      id="btn-clear-checked-shop"
                      class="text-[11px] font-semibold text-rose-400 hover:underline"
                    >
                      🗑️ Leeren
                    </button>
                  </div>
                  ${state.showCheckedShopping ? `
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2.5">
                      ${checkedShoppingList.map(item => `
                        <div
                          data-shopid="${item.id}"
                          class="shop-item-row px-3 py-1.5 rounded-xl border flex items-center gap-2 cursor-pointer opacity-50 hover:opacity-90 ${bgSubtle}"
                        >
                          <span class="text-emerald-500 text-xs font-bold">✓</span>
                          <span class="text-xs line-through truncate">${escapeHtml(item.title)}</span>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          ` : ''}

        </main>


          <!-- TAB 4: TICKLER FILE -->
          ${state.activeTab === 'tickler' ? `
            <div class="space-y-4">
              <div class="flex items-center gap-2 p-3 rounded-2xl border ${bgCard}">
                <select id="select-tickler-month" class="flex-1 p-2 rounded-xl border text-sm font-bold focus:outline-none ${bgSubtle}">
                  ${Array.from({length:12}, (_,i) => i+1).map(m => `<option value="${m}" ${state.activeTicklerMonth === m ? 'selected' : ''}>Monat ${m}</option>`).join('')}
                </select>
                <select id="select-tickler-day" class="flex-1 p-2 rounded-xl border text-sm font-bold focus:outline-none ${bgSubtle}">
                  ${Array.from({length:31}, (_,i) => i+1).map(d => `<option value="${d}" ${state.activeTicklerDay === d ? 'selected' : ''}>Tag ${d}</option>`).join('')}
                </select>
              </div>

              <div class="p-4 rounded-2xl border ${bgCard}">
                <h3 class="font-bold text-amber-500 mb-3 flex items-center gap-2">
                  <span>📂</span>
                  Inhalt für den ${state.activeTicklerDay}. (Monat ${state.activeTicklerMonth})
                </h3>

                <div class="space-y-2 mb-4">
                  ${(() => {
                    const items = state.ticklerItems.filter(i => i.targetMonth === state.activeTicklerMonth && i.targetDay === state.activeTicklerDay);
                    if (items.length === 0) return `<p class="text-xs ${textMuted} italic">Diese Mappe ist leer.</p>`;
                    return items.map(item => `
                      <div class="flex items-start justify-between gap-2 p-2.5 rounded-xl border ${bgSubtle}">
                        <div class="flex-1 min-w-0">
                          <p class="text-xs font-bold truncate">${escapeHtml(item.title)}</p>
                          ${item.notes ? `<p class="text-[10px] ${textMuted} mt-1">${escapeHtml(item.notes)}</p>` : ''}
                          ${item.attachmentIds && item.attachmentIds.length > 0 ? `
                            <div class="mt-1.5 flex items-center gap-1">
                              ${item.attachmentIds.map(att => `
                                <button class="btn-open-file text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20" data-fileid="${att.id}">
                                  📎 ${escapeHtml(att.name)}
                                </button>
                              `).join('')}
                            </div>
                          ` : ''}
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                          <button class="btn-tickler-to-next px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold hover:bg-indigo-500/20" data-ticklerid="${item.id}">
                            ⚡ Ins Board
                          </button>
                          <button class="btn-del-tickler p-1 rounded text-red-400 hover:bg-red-500/10" data-ticklerid="${item.id}">
                            ✕
                          </button>
                        </div>
                      </div>
                    `).join('');
                  })()}
                </div>

                <form id="form-add-tickler" class="flex items-center gap-2 border-t pt-3 ${borderSubtle}">
                  <input type="text" id="input-tickler-title" placeholder="Neue Wiedervorlage..." class="flex-1 p-2 rounded-lg border text-xs focus:outline-none ${bgSubtle}">
                  <label class="px-2 py-1 rounded bg-slate-500/10 cursor-pointer hover:bg-slate-500/20 text-xs flex items-center justify-center border ${borderSubtle}">
                    📎 Datei
                    <input type="file" id="input-tickler-file" class="hidden">
                  </label>
                  <button type="submit" class="px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold shrink-0">Einlegen</button>
                </form>
              </div>
            </div>
          ` : ''}
          <!-- GITHUB MOBILE APP GUIDE MODAL -->
        ${state.showGitHubModal ? `
          <div id="modal-github-backdrop" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div class="w-full max-w-lg rounded-3xl p-5 border shadow-2xl space-y-4 my-auto ${bgCard}" onclick="event.stopPropagation()">
              <div class="flex items-center justify-between border-b pb-3 ${borderSubtle}">
                <h3 class="font-bold text-sm flex items-center gap-2 text-emerald-400">
                  📱 Anleitung genau für deine GitHub-Handy-App („Gtd-Flow“)
                </h3>
                <button id="btn-close-github" class="p-1 rounded-lg text-slate-400 hover:text-white">✕</button>
              </div>

              <div class="space-y-2.5 text-xs">
                <!-- Schritt 1 -->
                <div data-ghstep="step1" class="gh-step-row p-3 rounded-2xl border cursor-pointer flex items-start gap-3 ${bgSubtle} ${state.githubSteps.step1 ? 'border-emerald-500/50 bg-emerald-500/5' : ''}">
                  <div class="mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${state.githubSteps.step1 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-500'}">
                    ${state.githubSteps.step1 ? '✓' : '1'}
                  </div>
                  <div class="space-y-1.5 flex-1">
                    <span class="font-bold block">Schritt 1: Kompletten App-Code hier kopieren</span>
                    <p class="${textMuted}">Auf dem iPhone geht Kopieren & Einfügen viel schneller als eine Datei herunterzuladen:</p>
                    <div class="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        id="btn-copy-html"
                        onclick="event.stopPropagation()"
                        class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center gap-1.5 shadow-sm"
                      >
                        📋 Kompletten Code kopieren
                      </button>
                      <button
                        type="button"
                        id="btn-download-html"
                        onclick="event.stopPropagation()"
                        class="px-3 py-1.5 rounded-xl border font-bold text-[11px] inline-flex items-center gap-1.5 ${bgCard}"
                      >
                        📥 Oder als index.html laden
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Schritt 2 -->
                <div data-ghstep="step2" class="gh-step-row p-3 rounded-2xl border cursor-pointer flex items-start gap-3 ${bgSubtle} ${state.githubSteps.step2 ? 'border-emerald-500/50 bg-emerald-500/5' : ''}">
                  <div class="mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${state.githubSteps.step2 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-500'}">
                    ${state.githubSteps.step2 ? '✓' : '2'}
                  </div>
                  <div class="space-y-1">
                    <span class="font-bold block">Schritt 2: In deiner GitHub-App auf „+“ oder „Code“ tippen</span>
                    <p class="${textMuted}">
                      Tippe in deinem Screenshot von <strong>Gtd-Flow</strong> oben rechts auf das <strong><code>+</code></strong> (oder unten auf <strong><code>Code</code></strong>) → wähle <strong>„Neue Datei erstellen“</strong>.<br/>
                      Tippe als Dateinamen exakt <strong><code>index.html</code></strong> ein, füge den kopierten Code unten ein und tippe oben rechts auf <strong>Commit</strong> (Speichern).
                    </p>
                  </div>
                </div>

                <!-- Schritt 3 -->
                <div data-ghstep="step3" class="gh-step-row p-3 rounded-2xl border cursor-pointer flex items-start gap-3 ${bgSubtle} ${state.githubSteps.step3 ? 'border-emerald-500/50 bg-emerald-500/5' : ''}">
                  <div class="mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${state.githubSteps.step3 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-500'}">
                    ${state.githubSteps.step3 ? '✓' : '3'}
                  </div>
                  <div class="space-y-1">
                    <span class="font-bold block">Schritt 3: Webseite im Safari-Browser freischalten</span>
                    <p class="${textMuted}">
                      <strong>Wichtig:</strong> Die GitHub-Handy-App versteckt den Schalter für kostenlose Webseiten. Tippe deshalb in der GitHub-App oben rechts auf die <strong>drei Punkte (<code>...</code>)</strong> → <strong>Teilen / In Safari öffnen</strong>.<br/>
                      Tippe dort im Browser oben auf <strong>Settings → Pages</strong>, stelle unter <em>Branch</em> von <code>None</code> auf <strong><code>main</code></strong> → <strong>Save</strong>. Nach 1 Minute ist dein App-Link live!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- SYNC & IMPORT MODAL -->
        ${state.showSyncModal ? `
          <div id="modal-sync-backdrop" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-md rounded-3xl p-5 border shadow-2xl space-y-4 ${bgCard}" onclick="event.stopPropagation()">
              <div class="flex items-center justify-between border-b pb-3 ${borderSubtle}">
                <h3 class="font-bold text-sm flex items-center gap-2">
                  📲 Schnelleingabe aus dem Chat & Backup
                </h3>
                <button id="btn-close-sync" class="p-1 rounded-lg text-slate-400 hover:text-white">✕</button>
              </div>

              <div class="space-y-3 text-xs">
                <div class="space-y-1.5">
                  <label class="font-bold block text-indigo-400">
                    Liste aus dem Chat einfügen (1 Eintrag pro Zeile):
                  </label>
                  <textarea
                    id="textarea-bulk-import"
                    rows="4"
                    placeholder="Steuerberater anrufen&#10;Einkauf: Hafermilch&#10;Einkauf: Spaghetti"
                    class="w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:border-indigo-500 ${bgSubtle}"
                  >${escapeHtml(state.bulkImportText)}</textarea>
                  <button
                    id="btn-run-bulk-import"
                    class="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                  >
                    📥 Liste sofort importieren
                  </button>
                </div>

                <div class="pt-2 border-t flex flex-col sm:flex-row gap-2 ${borderSubtle}">
                  <button
                    id="btn-download-backup"
                    class="flex-1 py-2 px-3 rounded-xl border font-bold ${bgSubtle} hover:border-indigo-500/40"
                  >
                    💾 Daten-Backup (.json)
                  </button>

                </div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- 1-TASK FOCUS OVERLAY -->
        ${focusTask ? `
          <div id="modal-focus-backdrop" class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-md rounded-3xl p-6 border shadow-2xl text-center space-y-5 ${bgCard}" onclick="event.stopPropagation()">
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-400 text-xs font-bold">
                🎯 1-Task Fokus-Modus (Alles andere ist ausgeblendet)
              </div>
              <div class="space-y-2 py-2">
                <h2 class="text-lg sm:text-xl font-bold leading-snug">${escapeHtml(focusTask.title)}</h2>
                <div class="flex items-center justify-center gap-2 text-xs text-indigo-400 font-semibold">
                  <span>${escapeHtml(focusTask.context)}</span>
                  ${focusTask.notes ? `<span>• ${escapeHtml(focusTask.notes)}</span>` : ''}
                </div>
              </div>
              <div class="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  id="btn-focus-complete"
                  class="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg"
                >
                  ✓ Jetzt erledigt!
                </button>
                <button
                  id="btn-focus-next"
                  class="px-4 py-3 rounded-2xl border text-xs font-bold ${bgSubtle}"
                >
                  🎲 Andere Aufgabe
                </button>
                <button
                  id="btn-focus-close"
                  class="px-4 py-3 rounded-2xl border text-xs font-semibold ${textMuted}"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- TASK DETAIL & AI COACH MODAL -->
        ${selectedTask ? `
          <div id="modal-task-backdrop" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
            <div class="w-full max-w-[500px] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border space-y-4 my-auto max-h-[92vh] overflow-y-auto ${bgCard}" onclick="event.stopPropagation()">
              <div class="flex items-center justify-between border-b pb-3 ${borderSubtle}">
                <h3 class="font-bold text-xs uppercase tracking-wider text-indigo-400">
                  Aufgabe bearbeiten & klären
                </h3>
                <button id="btn-close-task-modal" class="p-1 rounded-lg text-slate-400 hover:text-indigo-400">✕</button>
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase ${textMuted}">Aufgabe</label>
                <input
                  id="input-edit-task-title"
                  type="text"
                  value="${escapeHtml(selectedTask.title)}"
                  class="w-full font-bold text-sm p-3 rounded-xl border focus:outline-none focus:border-indigo-500 ${bgSubtle}"
                />
              </div>

              <!-- Assistive AI Coach Box -->
              <div class="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/30 space-y-2.5">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-bold text-violet-400">✨ KI-Starthilfe (Optional)</span>
                  <button
                    id="btn-run-task-ai"
                    class="px-2.5 py-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold"
                  >
                    In 3 kleine Schritte teilen
                  </button>
                </div>

                ${state.taskAiResult ? `
                  <div class="space-y-2 pt-1 text-xs">
                    ${state.taskAiResult.microSteps.map((step) => `
                      <div class="flex items-center justify-between gap-2 text-[11px] px-2.5 py-1.5 rounded-lg border ${bgSubtle}">
                        <span>${escapeHtml(step)}</span>
                        <button
                          data-microstep="${escapeHtml(step)}"
                          class="btn-add-microstep text-[10px] font-bold text-indigo-400 hover:underline shrink-0"
                        >
                          + Als Task
                        </button>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>

              <!-- GTD Column Switcher -->
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold uppercase ${textMuted}">GTD Liste (Spalte)</label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  ${GTD_COLUMNS.map(col => `
                    <button
                      data-editstatus="${col.id}"
                      class="btn-edit-status py-2 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                        selectedTask.status === col.id ? 'bg-indigo-600 text-white border-indigo-500' : `${bgSubtle} ${textMuted}`
                      }"
                    >
                      ${escapeHtml(col.shortTitle)}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- GTD Context Switcher -->
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold uppercase ${textMuted}">GTD Kontext & Energie</label>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  ${CONTEXT_DEFINITIONS.map(ctx => `
                    <button
                      data-editctx="${escapeHtml(ctx.id)}"
                      class="btn-edit-ctx py-2 px-2.5 rounded-xl text-[11px] font-bold border text-left truncate transition-all ${
                        selectedTask.context === ctx.id ? 'bg-indigo-600 text-white border-indigo-500' : `${bgSubtle} ${textMuted}`
                      }"
                    >
                      ${ctx.emoji} ${escapeHtml(ctx.label)}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Project & Deadline -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="text-[10px] font-bold uppercase ${textMuted}">Verknüpftes Projekt</label>
                  <select id="select-edit-project" class="w-full p-2.5 rounded-xl border text-xs font-semibold ${bgSubtle}">
                    <option value="">Kein Projekt</option>
                    ${state.projects.map(p => `
                      <option value="${escapeHtml(p.id)}" ${selectedTask.projectId === p.id ? 'selected' : ''}>
                        ${p.icon} ${escapeHtml(p.name)}
                      </option>
                    `).join('')}
                  </select>
                </div>

                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <label class="text-[10px] font-bold uppercase ${textMuted}">Deadline</label>
                    <div class="flex gap-1">
                      <button id="btn-date-today" type="button" class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 font-bold">Heute</button>
                      <button id="btn-date-tomorrow" type="button" class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 font-bold">Morgen</button>
                    </div>
                  </div>
                  <input
                    id="input-edit-deadline"
                    type="date"
                    value="${escapeHtml(selectedTask.deadline || '')}"
                    class="w-full p-2.5 rounded-xl border text-xs font-semibold ${bgSubtle}"
                  />
                </div>
              </div>

              <!-- Short Notes -->
              <div class="space-y-1">
                <label class="text-[10px] font-bold uppercase ${textMuted}">Kurze Notiz (Stichpunkte)</label>
                <input
                  id="input-edit-notes"
                  type="text"
                  value="${escapeHtml(selectedTask.notes || '')}"
                  placeholder="Maximal 3–5 Stichworte..."
                  class="w-full p-2.5 rounded-xl border text-xs ${bgSubtle}"
                />
              </div>

              <!-- Action Footer -->
              <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t ${borderSubtle}">
                <div class="flex items-center gap-2 flex-wrap">
                  <button
                    id="btn-gcal-export"
                    class="px-3 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 text-xs font-bold"
                  >
                    📅 G-Kalender
                  </button>
                  <button
                    id="btn-move-to-shop"
                    class="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold"
                  >
                    🛒 Auf Einkaufsliste
                  </button>
                </div>
                <button
                  id="btn-delete-task"
                  class="px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
                >
                  🗑️ Löschen
                </button>
              </div>
            </div>
          </div>
        ` : ''}


        <!-- PROJECT DOSSIER MODAL -->
        ${(() => {
          if (!state.activeDossierProjectId) return '';
          const p = state.projects.find(x => x.id === state.activeDossierProjectId);
          if (!p) return '';
          const pTasks = state.tasks.filter(t => t.projectId === p.id && !t.completed);

          return `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
              <div id="modal-dossier-backdrop" class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer transition-opacity"></div>
              <div class="relative w-full max-w-[500px] max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border ${bgCard} shadow-indigo-500/10">

                <div class="flex items-center justify-between p-4 border-b ${borderSubtle}">
                  <div class="flex items-center gap-2.5">
                    <span class="text-2xl">${p.icon}</span>
                    <div>
                      <h2 class="font-bold text-lg leading-tight">${escapeHtml(p.name)}</h2>
                      <p class="text-[10px] ${textMuted}">Projekt Dossier</p>
                    </div>
                  </div>
                  <button id="btn-close-dossier" class="p-1.5 rounded-lg border hover:bg-slate-500/10 ${bgSubtle}">
                    ✕
                  </button>
                </div>

                <div class="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar">

                  <div class="space-y-1.5">
                    <label class="text-[11px] font-bold uppercase tracking-wider text-indigo-400">🎯 Gewünschtes Ergebnis (Outcome)</label>
                    <textarea
                      id="input-dossier-outcome"
                      rows="2"
                      placeholder="Wann ist dieses Projekt erfolgreich abgeschlossen?"
                      class="w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:border-indigo-500/50 resize-none ${bgSubtle}"
                    >${escapeHtml(p.outcome)}</textarea>
                  </div>


                  <div class="space-y-2">
                    <label class="text-[11px] font-bold uppercase tracking-wider text-sky-400">📎 Dateien & Anhänge</label>
                    <div class="flex items-center gap-2 flex-wrap">
                      ${p.links && p.links.length > 0 ? p.links.map(l => `
                        <button class="btn-open-proj-file text-[10px] px-2 py-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 flex items-center gap-1" data-fileid="${l.id}">
                          📎 ${escapeHtml(l.name || l.title || 'Datei')}
                        </button>
                      `).join('') : '<span class="text-xs text-slate-500 italic">Keine Dateien angehängt.</span>'}
                    </div>
                    <label class="inline-block mt-2 px-2 py-1 rounded bg-slate-500/10 cursor-pointer hover:bg-slate-500/20 text-[10px] font-bold border border-slate-700 text-slate-300">
                      + Datei hochladen
                      <input type="file" id="input-dossier-file" class="hidden" data-projid="${p.id}">
                    </label>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[11px] font-bold uppercase tracking-wider text-amber-400">📋 Notizen & Material</label>
                    <textarea
                      id="input-dossier-notes"
                      rows="3"
                      placeholder="Gedanken, Checklisten, Kontakte..."
                      class="w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:border-amber-500/50 resize-y min-h-[80px] ${bgSubtle}"
                    >${escapeHtml(p.supportNotes)}</textarea>
                  </div>

                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <label class="text-[11px] font-bold uppercase tracking-wider text-emerald-400">⚡ Projektschritte (${pTasks.length})</label>
                    </div>

                    <div class="space-y-2">
                      ${pTasks.map(t => `
                        <div class="flex items-center gap-2 p-2 rounded-xl border ${t.status === 'planned' ? 'bg-slate-500/5 border-slate-500/20' : 'bg-slate-500/10 border-indigo-500/30'}">
                          <button class="btn-check-task w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors border-slate-400 hover:border-indigo-400" data-checktask="${t.id}"></button>
                          <span class="text-xs font-medium flex-1 truncate ${t.status === 'planned' ? textMuted : ''}">${escapeHtml(t.title)}</span>
                          <button class="btn-toggle-planned px-2 py-1 rounded text-[10px] font-bold transition-all border ${t.status === 'planned' ? 'bg-slate-800 text-slate-400 border-slate-700 hover:border-indigo-500/50' : 'bg-indigo-600 text-white border-indigo-500 shadow-sm'}" data-taskid="${t.id}">
                            ${t.status === 'planned' ? '📋 Vorgeplant' : '⚡ Nächster'}
                          </button>
                        </div>
                      `).join('')}
                    </div>


                    <form id="form-dossier-add-task" class="flex flex-col gap-2 mt-2 border-t border-slate-700 pt-3">
                      <div class="flex items-center gap-2">
                        <input type="text" id="input-dossier-new-task" placeholder="Neuer Schritt..." class="flex-1 p-2 rounded-lg border text-xs focus:outline-none ${bgSubtle}">
                        <select id="select-dossier-task-status" class="p-2 rounded-lg border text-xs focus:outline-none ${bgSubtle}">
                          <option value="planned">📋 Vorgeplant</option>
                          <option value="next">⚡ Nächster Schritt</option>
                        </select>
                        <button type="submit" class="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold shrink-0">Hinzufügen</button>
                      </div>
                    </form>
                  </div>

                </div>
              </div>
            </div>
          `;
        })()}
<!-- TOAST NOTIFICATION -->
        ${state.toastMessage ? `
          <div class="fixed bottom-5 right-5 z-50 bg-slate-900 text-white border border-indigo-500/40 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold">
            ${escapeHtml(state.toastMessage)}
          </div>
        ` : ''}
      `;

      bindEvents();
    }

    function bindEvents() {
      const on = (id, evt, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(evt, fn);
      };

      on('btn-open-github', 'click', () => { state.showGitHubModal = true; renderApp(); });
      on('btn-close-github', 'click', () => { state.showGitHubModal = false; renderApp(); });
      on('modal-github-backdrop', 'click', () => { state.showGitHubModal = false; renderApp(); });

      document.querySelectorAll('.gh-step-row').forEach(row => {
        row.addEventListener('click', () => {
          const stepKey = row.getAttribute('data-ghstep');
          state.githubSteps[stepKey] = !state.githubSteps[stepKey];
          renderApp();
        });
      });

      on('btn-open-sync', 'click', () => { state.showSyncModal = true; renderApp(); });
      on('btn-close-sync', 'click', () => { state.showSyncModal = false; renderApp(); });
      on('modal-sync-backdrop', 'click', () => { state.showSyncModal = false; renderApp(); });
      on('textarea-bulk-import', 'input', (e) => { state.bulkImportText = e.target.value; });
      on('btn-run-bulk-import', 'click', bulkImportFromText);
      on('btn-download-backup', 'click', downloadBackupJson);

      on('btn-focus-mode', 'click', startRandomFocusTask);
      on('btn-focus-close', 'click', () => { state.focusTaskId = null; renderApp(); });
      on('modal-focus-backdrop', 'click', () => { state.focusTaskId = null; renderApp(); });

      on('btn-close-dossier', 'click', () => { state.activeDossierProjectId = null; renderApp(); });
      on('modal-dossier-backdrop', 'click', () => { state.activeDossierProjectId = null; renderApp(); });

      on('input-dossier-outcome', 'input', (e) => {
        const p = state.projects.find(x => x.id === state.activeDossierProjectId);
        if (p) { p.outcome = e.target.value; savePersistedData(); }
      });
      on('input-dossier-notes', 'input', (e) => {
        const p = state.projects.find(x => x.id === state.activeDossierProjectId);
        if (p) { p.supportNotes = e.target.value; savePersistedData(); }
      });

      on('input-dossier-file', 'change', async (e) => {
        const fileInput = e.target;
        const projId = fileInput.getAttribute('data-projid');
        if (fileInput.files.length > 0 && projId) {
          const file = fileInput.files[0];
          const fileId = 'file-' + Date.now();
          try {
            await saveFile(fileId, file, file.name, file.type);
            const p = state.projects.find(x => x.id === projId);
            if (p) {
              if (!p.links) p.links = [];
              p.links.push({ id: fileId, name: file.name, url: '' });
              savePersistedData();
              showToast('Datei zum Projekt hinzugefügt 📎');
              renderApp();
            }
          } catch(err) {
            console.error(err);
            showToast('Fehler beim Speichern der Datei');
          }
        }
      });

      document.querySelectorAll('.btn-open-proj-file').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const fId = btn.getAttribute('data-fileid');
          try {
            const fileData = await getFile(fId);
            if (fileData && fileData.blob) {
              const url = URL.createObjectURL(fileData.blob);
              window.open(url, '_blank');
            } else {
              showToast('Datei nicht gefunden.');
            }
          } catch (err) {
            console.error(err);
            showToast('Fehler beim Öffnen der Datei.');
          }
        });
      });


      on('select-tickler-month', 'change', (e) => { state.activeTicklerMonth = parseInt(e.target.value, 10); renderApp(); });
      on('select-tickler-day', 'change', (e) => { state.activeTicklerDay = parseInt(e.target.value, 10); renderApp(); });
      on('btn-open-due-ticklers', 'click', () => {
        const d = new Date();
        state.activeTab = 'tickler';
        state.activeTicklerMonth = d.getMonth() + 1;
        state.activeTicklerDay = d.getDate();
        renderApp();
      });

      on('form-add-tickler', 'submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('input-tickler-title');
        if (!input || !input.value.trim()) return;

        const fileInput = document.getElementById('input-tickler-file');
        const attachmentIds = [];
        if (fileInput && fileInput.files.length > 0) {
          const file = fileInput.files[0];
          const fileId = 'file-' + Date.now();
          try {
            await saveFile(fileId, file, file.name, file.type);
            attachmentIds.push({ id: fileId, name: file.name });
            showToast('Datei lokal gespeichert 📎');
          } catch(err) {
            console.error(err);
            showToast('Fehler beim Speichern der Datei');
          }
        }

        state.ticklerItems.push({
          id: 'tk-' + Date.now(),
          title: input.value.trim(),
          notes: '',
          targetMonth: state.activeTicklerMonth,
          targetDay: state.activeTicklerDay,
          attachmentIds: attachmentIds,
          createdAt: new Date().toISOString()
        });
        savePersistedData();
        renderApp();
      });

      document.querySelectorAll('.btn-del-tickler').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tId = btn.getAttribute('data-ticklerid');
          state.ticklerItems = state.ticklerItems.filter(x => x.id !== tId);
          savePersistedData();
          renderApp();
        });
      });


      document.querySelectorAll('.btn-open-file').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const fId = btn.getAttribute('data-fileid');
          try {
            const fileData = await getFile(fId);
            if (fileData && fileData.blob) {
              const url = URL.createObjectURL(fileData.blob);
              window.open(url, '_blank');
              // Optional: revokeObjectURL nach Zeit x
            } else {
              showToast('Datei nicht gefunden.');
            }
          } catch (err) {
            console.error(err);
            showToast('Fehler beim Öffnen der Datei.');
          }
        });
      });
      document.querySelectorAll('.btn-tickler-to-next').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tId = btn.getAttribute('data-ticklerid');
          const item = state.ticklerItems.find(x => x.id === tId);
          if (item) {
            state.tasks.unshift({
              id: 't-tk-' + Date.now(),
              title: item.title,
              status: 'next',
              projectId: '',
              context: '⚡ 2-Minuten',
              deadline: '',
              completed: false,
              notes: item.notes
            });
            state.ticklerItems = state.ticklerItems.filter(x => x.id !== tId);
            savePersistedData();
            showToast('Als nächste Aufgabe ins Board gelegt ✨');
            renderApp();
          }
        });
      });
on('form-dossier-add-task', 'submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('input-dossier-new-task');
        const statusSelect = document.getElementById('select-dossier-task-status');
        if (!input || !input.value.trim() || !state.activeDossierProjectId) return;
        const taskStatus = statusSelect ? statusSelect.value : 'planned';
        state.tasks.unshift({
          id: 't-dos-' + Date.now(),
          title: input.value.trim(),
          status: taskStatus,
          projectId: state.activeDossierProjectId,
          context: '⚡ 2-Minuten',
          deadline: '',
          completed: false,
          notes: ''
        });
        savePersistedData();
        renderApp();
      });

      document.querySelectorAll('.btn-toggle-planned').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tId = btn.getAttribute('data-taskid');
          const t = state.tasks.find(x => x.id === tId);
          if (t) {
            t.status = (t.status === 'planned') ? 'next' : 'planned';
            savePersistedData();
            renderApp();
          }
        });
      });

      on('btn-focus-next', 'click', startRandomFocusTask);
      on('btn-focus-complete', 'click', () => {
        if (state.focusTaskId) toggleTaskCompleted(state.focusTaskId);
      });

      on('btn-mode-pc', 'click', () => { state.deviceMode = 'pc'; renderApp(); });
      on('btn-mode-mobile', 'click', () => { state.deviceMode = 'mobile'; renderApp(); });
      on('btn-toggle-theme', 'click', () => { state.darkMode = !state.darkMode; renderApp(); });

      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.activeTab = btn.getAttribute('data-tab');
          renderApp();
        });
      });

      const quickInput = document.getElementById('input-quick-task');
      if (quickInput) {
        quickInput.addEventListener('input', (e) => {
          const hadBtn = state.quickTitle.trim().length > 1;
          state.quickTitle = e.target.value;
          const hasBtn = state.quickTitle.trim().length > 1;
          if (hadBtn !== hasBtn) {
            const pos = quickInput.selectionStart;
            renderApp();
            const restored = document.getElementById('input-quick-task');
            if (restored) {
              restored.focus();
              restored.setSelectionRange(pos, pos);
            }
          }
        });
      }
      on('form-add-task', 'submit', (e) => { e.preventDefault(); addTask(); });
      on('btn-quick-to-shop', 'click', quickAddAsShopping);

      document.querySelectorAll('.ctx-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const ctx = btn.getAttribute('data-ctx');
          state.selectedContextFilter = (state.selectedContextFilter === ctx && ctx !== 'all') ? 'all' : ctx;
          renderApp();
        });
      });
      on('select-project-filter', 'change', (e) => {
        state.selectedProjectFilter = e.target.value;
        renderApp();
      });
      on('btn-reset-filters', 'click', () => {
        state.selectedContextFilter = 'all';
        state.selectedProjectFilter = 'all';
        renderApp();
      });

      document.querySelectorAll('.mob-col-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.mobileStatus = btn.getAttribute('data-mobcol');
          renderApp();
        });
      });


      document.querySelectorAll('.btn-proj-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.getAttribute('data-action');
          const projId = btn.getAttribute('data-projid');
          if (action === 'archive') {
            const p = state.projects.find(x => x.id === projId);
            if (p) {
              p.archived = true;
              savePersistedData();
              renderApp();
            }
          } else if (action === 'dossier') {
            state.activeDossierProjectId = projId;
            renderApp();
          }
        });
      });
      document.querySelectorAll('.btn-check-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleTaskCompleted(btn.getAttribute('data-checktask'));
        });
      });

      document.querySelectorAll('.btn-promote-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          promoteInboxToNext(btn.getAttribute('data-promotetask'));
        });
      });

      document.querySelectorAll('.task-card').forEach(card => {
        const taskId = card.getAttribute('data-taskid');
        card.addEventListener('click', () => {
          state.selectedTaskId = taskId;
          state.taskAiResult = null;
          renderApp();
        });
        card.addEventListener('dragstart', () => {
          state.draggedTaskId = taskId;
        });
      });

      document.querySelectorAll('.gtd-col-drop').forEach(colEl => {
        const colId = colEl.getAttribute('data-coldrop');
        colEl.addEventListener('dragover', (e) => e.preventDefault());
        colEl.addEventListener('drop', () => {
          if (!state.draggedTaskId) return;
          const t = state.tasks.find(item => item.id === state.draggedTaskId);
          if (t) {
            t.status = colId;
            savePersistedData();
            const colObj = GTD_COLUMNS.find(c => c.id === colId);
            showToast(`Verschoben nach „${colObj ? colObj.shortTitle : colId}“`);
          }
          state.draggedTaskId = null;
        });
      });

      on('input-proj-icon', 'input', (e) => { state.newProjectIcon = e.target.value; });
      on('input-proj-name', 'input', (e) => { state.newProjectName = e.target.value; });
      on('form-add-project', 'submit', (e) => {
        e.preventDefault();
        if (!state.newProjectName.trim()) return;
        state.projects.push({
          id: 'p-' + Date.now(),
          name: state.newProjectName.trim(),
          icon: state.newProjectIcon || '🎯'
        });
        state.newProjectName = '';
        savePersistedData();
        showToast('Projekt angelegt ✨');
      });

      document.querySelectorAll('.btn-filter-proj').forEach(btn => {
        btn.addEventListener('click', () => {
          state.selectedProjectFilter = btn.getAttribute('data-filterproj');
          state.activeTab = 'board';
          renderApp();
        });
      });

      const shopInput = document.getElementById('input-shopping');
      if (shopInput) {
        shopInput.addEventListener('input', (e) => {
          const pos = shopInput.selectionStart;
          state.shoppingInput = e.target.value;
          renderApp();
          const restored = document.getElementById('input-shopping');
          if (restored) {
            restored.focus();
            restored.setSelectionRange(pos, pos);
          }
        });
      }
      on('form-add-shopping', 'submit', (e) => { e.preventDefault(); addShoppingItems(); });
      on('btn-supermarket-mode', 'click', () => { state.supermarketMode = !state.supermarketMode; renderApp(); });

      document.querySelectorAll('.shop-item-row').forEach(row => {
        row.addEventListener('click', () => {
          const id = row.getAttribute('data-shopid');
          const item = state.shoppingItems.find(i => i.id === id);
          if (item) {
            item.checked = !item.checked;
            savePersistedData();
            renderApp();
          }
        });
      });

      on('btn-toggle-checked-shop', 'click', () => {
        state.showCheckedShopping = !state.showCheckedShopping;
        renderApp();
      });
      on('btn-clear-checked-shop', 'click', () => {
        state.shoppingItems = state.shoppingItems.filter(i => !i.checked);
        savePersistedData();
        showToast('Einkaufswagen geleert ✨');
      });

      const selectedTask = state.tasks.find(t => t.id === state.selectedTaskId);
      if (selectedTask) {
        on('btn-close-task-modal', 'click', () => { state.selectedTaskId = null; renderApp(); });
        on('modal-task-backdrop', 'click', () => { state.selectedTaskId = null; renderApp(); });

        on('input-edit-task-title', 'input', (e) => { selectedTask.title = e.target.value; savePersistedData(); });
        on('input-edit-notes', 'input', (e) => { selectedTask.notes = e.target.value; savePersistedData(); });
        on('select-edit-project', 'change', (e) => { selectedTask.projectId = e.target.value; renderApp(); });
        on('input-edit-deadline', 'change', (e) => { selectedTask.deadline = e.target.value; renderApp(); });

        on('btn-date-today', 'click', () => { selectedTask.deadline = getRelativeDateString(0); renderApp(); });
        on('btn-date-tomorrow', 'click', () => { selectedTask.deadline = getRelativeDateString(1); renderApp(); });

        document.querySelectorAll('.btn-edit-status').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedTask.status = btn.getAttribute('data-editstatus');
            renderApp();
          });
        });

        document.querySelectorAll('.btn-edit-ctx').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedTask.context = btn.getAttribute('data-editctx');
            renderApp();
          });
        });

        on('btn-run-task-ai', 'click', () => generateTaskCoachSuggestion(selectedTask));
        document.querySelectorAll('.btn-add-microstep').forEach(btn => {
          btn.addEventListener('click', () => {
            const stepText = btn.getAttribute('data-microstep');
            state.tasks.unshift({
              id: 't-sub-' + Date.now(),
              title: stepText,
              status: 'next',
              projectId: selectedTask.projectId,
              context: '⚡ 2-Minuten',
              deadline: '',
              completed: false,
              notes: ''
            });
            savePersistedData();
            showToast('Als 2-Minuten-Aufgabe angelegt ✨');
          });
        });

        on('btn-gcal-export', 'click', () => openGoogleCalendar(selectedTask));
        on('btn-move-to-shop', 'click', () => {
          const catId = detectShoppingCategory(selectedTask.title);
          state.shoppingItems.unshift({
            id: 's-' + Date.now(),
            title: selectedTask.title,
            category: catId,
            checked: false
          });
          state.tasks = state.tasks.filter(t => t.id !== selectedTask.id);
          state.selectedTaskId = null;
          savePersistedData();
          showToast('Auf die Einkaufsliste verschoben 🛒');
        });

        on('btn-delete-task', 'click', () => {
          state.tasks = state.tasks.filter(t => t.id !== selectedTask.id);
          state.selectedTaskId = null;
          savePersistedData();
          showToast('Aufgabe gelöscht');
        });
      }
    }

    window.onload = function () {
      renderApp();
    };
