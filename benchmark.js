const GTD_COLUMNS = [
  { id: 'inbox', shortTitle: 'Inbox' },
  { id: 'next', shortTitle: 'Next' },
  { id: 'waiting', shortTitle: 'Waiting' },
  { id: 'someday', shortTitle: 'Someday' }
];

function generateTasks(num) {
  const tasks = [];
  for (let i = 0; i < num; i++) {
    tasks.push({
      id: `task_${i}`,
      status: GTD_COLUMNS[i % 4].id,
      context: 'context_' + (i % 3),
      projectId: 'proj_' + (i % 5),
      completed: i % 10 === 0
    });
  }
  return tasks;
}

const state = {
  tasks: generateTasks(10000),
  deviceMode: 'mobile',
  mobileStatus: 'inbox',
  selectedContextFilter: 'all',
  selectedProjectFilter: 'all'
};

function oldFiltering() {
  const counts = [];
  if (state.deviceMode === 'mobile') {
    GTD_COLUMNS.map(col => {
      const count = state.tasks.filter(
        t => !t.completed && t.status === col.id &&
        (state.selectedContextFilter === 'all' || t.context === state.selectedContextFilter) &&
        (state.selectedProjectFilter === 'all' || t.projectId === state.selectedProjectFilter)
      ).length;
      counts.push(count);
    });
  }

  const results = [];
  GTD_COLUMNS.filter(col => state.deviceMode === 'pc' || col.id === state.mobileStatus).map(col => {
    const colTasks = state.tasks.filter(
      t => t.status === col.id &&
      (state.selectedContextFilter === 'all' || t.context === state.selectedContextFilter) &&
      (state.selectedProjectFilter === 'all' || t.projectId === state.selectedProjectFilter)
    );
    results.push(colTasks);
  });
  return results;
}

function newFiltering() {
  const selectedContext = state.selectedContextFilter;
  const selectedProject = state.selectedProjectFilter;
  const isContextAll = selectedContext === 'all';
  const isProjectAll = selectedProject === 'all';

  const groupedTasks = {
    inbox: [], next: [], waiting: [], someday: []
  };

  const tasks = state.tasks;
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    if ((isContextAll || t.context === selectedContext) &&
        (isProjectAll || t.projectId === selectedProject)) {
      const arr = groupedTasks[t.status];
      if (arr !== undefined) {
        arr.push(t);
      }
    }
  }

  const counts = [];
  if (state.deviceMode === 'mobile') {
    GTD_COLUMNS.map(col => {
      const count = groupedTasks[col.id] ? groupedTasks[col.id].filter(t => !t.completed).length : 0;
      counts.push(count);
    });
  }

  const results = [];
  GTD_COLUMNS.filter(col => state.deviceMode === 'pc' || col.id === state.mobileStatus).map(col => {
    results.push(groupedTasks[col.id] || []);
  });
  return results;
}

// Warmup
for(let i = 0; i < 100; i++) { oldFiltering(); newFiltering(); }

const startOld = performance.now();
for(let i = 0; i < 1000; i++) { oldFiltering(); }
const endOld = performance.now();

const startNew = performance.now();
for(let i = 0; i < 1000; i++) { newFiltering(); }
const endNew = performance.now();

console.log(`Baseline (O(N*M) filtering): ${(endOld - startOld).toFixed(2)} ms`);
console.log(`Optimized (O(N) grouping): ${(endNew - startNew).toFixed(2)} ms`);
