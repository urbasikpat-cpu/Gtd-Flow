// Create a large mock state
const state = {
  projects: Array.from({ length: 1000 }, (_, i) => ({ id: `p${i}`, archived: i % 10 === 0 })),
  tasks: Array.from({ length: 10000 }, (_, i) => ({
    id: `t${i}`,
    projectId: `p${i % 1000}`,
    completed: i % 3 === 0,
    status: ['next', 'waiting', 'planned', 'someday'][i % 4]
  })),
  shoppingItems: Array.from({ length: 5000 }, (_, i) => ({
    id: `s${i}`,
    checked: i % 2 === 0
  })),
  selectedTaskId: 't9999',
  focusTaskId: 't8888'
};

function runCurrent() {
  const activeProjects = state.projects.filter(p => !p.archived);
  const stuckProjectsCount = activeProjects.filter(p => {
    return !state.tasks.some(t => t.projectId === p.id && !t.completed && (t.status === 'next' || t.status === 'waiting'));
  }).length;
  const openTasksCount = state.tasks.filter(t => !t.completed && t.status !== "planned").length;
  const openShoppingCount = state.shoppingItems.filter(i => !i.checked).length;
  const checkedShoppingList = state.shoppingItems.filter(i => i.checked);
  const selectedTask = state.tasks.find(t => t.id === state.selectedTaskId) || null;
  const focusTask = state.tasks.find(t => t.id === state.focusTaskId) || null;

  return { stuckProjectsCount, openTasksCount, openShoppingCount, checkedShoppingListLength: checkedShoppingList.length, selectedTask: selectedTask.id, focusTask: focusTask.id };
}

function runOptimized() {
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
  for (let i = 0; i < state.projects.length; i++) {
    const p = state.projects[i];
    if (!p.archived) {
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

  return { stuckProjectsCount, openTasksCount, openShoppingCount, checkedShoppingListLength: checkedShoppingList.length, selectedTask: selectedTask.id, focusTask: focusTask.id };
}

const currentRes = runCurrent();
const optRes = runOptimized();

console.log("Results match:", JSON.stringify(currentRes) === JSON.stringify(optRes));

const iterations = 100;

const startCurrent = performance.now();
for (let i = 0; i < iterations; i++) {
  runCurrent();
}
const endCurrent = performance.now();
console.log(`Current: ${endCurrent - startCurrent}ms`);

const startOptimized = performance.now();
for (let i = 0; i < iterations; i++) {
  runOptimized();
}
const endOptimized = performance.now();
console.log(`Optimized: ${endOptimized - startOptimized}ms`);
