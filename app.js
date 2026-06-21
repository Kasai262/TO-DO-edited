/*
 * Storage key for localStorage.
 */
const STORAGE_KEY = "todos-app";

/*
 * Default tasks shown on first launch.
 */
const DEFAULT_TODOS = [
  { id: 1, title: "Poceti bazu podataka", completed: false, dueDate: "2025-07-01" },
  { id: 2, title: "Uciti Node.js",        completed: false, dueDate: "2025-07-10" },
  { id: 3, title: "Uraditi to-do projekat", completed: false, dueDate: "2025-07-15" },
];

/*
 * App-level state.
 */
let taskList      = [];
let activeFilter  = "all";
let sortMode      = "none";
let searchPhrase  = "";
let dragSourceId  = null;

/* ─── localStorage ─── */

function persistTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(taskList));
}

function fetchFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== null) return JSON.parse(raw);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TODOS));
  return DEFAULT_TODOS;
}

/* ─── stats ─── */

function refreshStats() {
  const total     = taskList.length;
  const doneCount = taskList.filter(t => t.completed).length;
  const activeCount = total - doneCount;

  document.getElementById("statTotal").textContent  = total;
  document.getElementById("statActive").textContent = activeCount;
  document.getElementById("statDone").textContent   = doneCount;
}

/* ─── error banner ─── */

function flashError(msg) {
  const el = document.getElementById("errorMessage");
  el.textContent    = msg;
  el.style.display  = "block";
  setTimeout(() => { el.style.display = "none"; }, 3000);
}

/* ─── format date for display ─── */

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

/* ─── build a single task element ─── */

function buildTaskElement(task) {
  const el = document.createElement("div");
  el.className = `todo-item${task.completed ? " completed" : ""}`;
  el.id        = `task-${task.id}`;
  el.draggable = true;

  el.innerHTML = `
    <span class="drag-handle" title="Drag to reorder">⠿</span>
    <div class="todo-item-info">
      <span class="todo-text">${task.title}</span>
      <span class="todo-due-date">Due: ${formatDate(task.dueDate)}</span>
    </div>
    <div class="todo-actions">
      <button class="btn btn-toggle"  data-action="toggle">${task.completed ? "Undo" : "Complete"}</button>
      <button class="btn btn-edit"    data-action="edit">Edit</button>
      <button class="btn btn-delete"  data-action="delete">Delete</button>
    </div>
  `;

  attachDragEvents(el, task.id);
  return el;
}

/* ─── switch a task row into edit mode ─── */

function activateEditMode(el, task) {
  const infoZone   = el.querySelector(".todo-item-info");
  const actionZone = el.querySelector(".todo-actions");

  infoZone.innerHTML = `
    <input class="todo-edit-input" type="text" value="${task.title}" maxlength="120" />
  `;

  actionZone.innerHTML = `
    <button class="btn btn-save"   data-action="save">Save</button>
    <button class="btn btn-cancel" data-action="cancel">Cancel</button>
  `;

  infoZone.querySelector(".todo-edit-input").focus();
}

/* ─── switch a task row into delete-confirm mode ─── */

function activateDeleteConfirm(el) {
  const actionZone = el.querySelector(".todo-actions");

  actionZone.innerHTML = `
    <span class="delete-confirm-label">Are you sure?</span>
    <button class="btn btn-delete"  data-action="confirm-delete">Yes, delete</button>
    <button class="btn btn-cancel"  data-action="cancel">Cancel</button>
  `;
}

/* ─── render the visible list ─── */

function renderList() {
  const container = document.getElementById("todoList");
  container.innerHTML = "";

  let visible = taskList.filter(task => {
    if (activeFilter === "active")    return !task.completed;
    if (activeFilter === "completed") return  task.completed;
    return true;
  });

  if (searchPhrase.trim()) {
    const needle = searchPhrase.trim().toLowerCase();
    visible = visible.filter(t => t.title.toLowerCase().includes(needle));
  }

  if (sortMode === "asc") {
    visible = [...visible].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  } else if (sortMode === "desc") {
    visible = [...visible].sort((a, b) => (b.dueDate || "").localeCompare(a.dueDate || ""));
  }

  if (visible.length === 0) {
    container.innerHTML = "<p style='color:#888;text-align:center;margin-top:20px'>No tasks found.</p>";
    return;
  }

  visible.forEach(task => container.appendChild(buildTaskElement(task)));
}

/* ─── apply filter ─── */

function applyFilter(filter) {
  activeFilter = filter;

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });

  renderList();
}

/* ─── create task ─── */

function addTask(title, dueDate) {
  const newTask = {
    id:        Date.now(),
    title:     title,
    completed: false,
    dueDate:   dueDate,
  };

  taskList.unshift(newTask);
  persistTasks();
  renderList();
  refreshStats();
}

/* ─── toggle complete / undo ─── */

function toggleTask(task) {
  task.completed = !task.completed;
  persistTasks();
  renderList();
  refreshStats();
}

/* ─── save edit ─── */

function saveEdit(el, task) {
  const input    = el.querySelector(".todo-edit-input");
  const newTitle = input.value.trim();

  if (newTitle.length < 3) {
    flashError("Task title must be at least 3 characters.");
    return;
  }

  task.title = newTitle;
  persistTasks();
  renderList();
}

/* ─── delete task ─── */

function removeTask(task) {
  taskList = taskList.filter(t => t.id !== task.id);
  persistTasks();
  renderList();
  refreshStats();
}

/* ─── clear completed ─── */

function clearFinished() {
  taskList = taskList.filter(t => !t.completed);
  persistTasks();
  renderList();
  refreshStats();
}

/* ─── event delegation for task list ─── */

function handleListClick(e) {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action   = btn.dataset.action;
  const el       = btn.closest(".todo-item");
  const taskId   = Number(el.id.replace("task-", ""));
  const task     = taskList.find(t => t.id === taskId);
  if (!task) return;

  if (action === "toggle")          toggleTask(task);
  if (action === "edit")            activateEditMode(el, task);
  if (action === "save")            saveEdit(el, task);
  if (action === "cancel")          renderList();
  if (action === "delete")          activateDeleteConfirm(el);
  if (action === "confirm-delete")  removeTask(task);
}

/* ─── drag and drop ─── */

function attachDragEvents(el, taskId) {
  el.addEventListener("dragstart", () => {
    dragSourceId = taskId;
    setTimeout(() => el.classList.add("dragging"), 0);
  });

  el.addEventListener("dragend", () => {
    el.classList.remove("dragging");
    document.querySelectorAll(".todo-item").forEach(i => i.classList.remove("drag-over"));
  });

  el.addEventListener("dragover", e => {
    e.preventDefault();
    if (taskId !== dragSourceId) el.classList.add("drag-over");
  });

  el.addEventListener("dragleave", () => {
    el.classList.remove("drag-over");
  });

  el.addEventListener("drop", e => {
    e.preventDefault();
    el.classList.remove("drag-over");
    if (dragSourceId === taskId) return;

    const fromIdx = taskList.findIndex(t => t.id === dragSourceId);
    const toIdx   = taskList.findIndex(t => t.id === taskId);
    if (fromIdx === -1 || toIdx === -1) return;

    const moved = taskList.splice(fromIdx, 1)[0];
    taskList.splice(toIdx, 0, moved);

    persistTasks();
    renderList();
  });
}

/* ─── form submit ─── */

function wireForm() {
  const form      = document.getElementById("todoForm");
  const titleInput = document.getElementById("todoInput");
  const dateInput  = document.getElementById("dueDateInput");

  form.addEventListener("submit", e => {
    e.preventDefault();

    const title   = titleInput.value.trim();
    const dueDate = dateInput.value;

    if (title.length < 3) {
      flashError("Task title must be at least 3 characters.");
      return;
    }

    if (!dueDate) {
      flashError("Please select a due date.");
      return;
    }

    addTask(title, dueDate);
    titleInput.value = "";
    dateInput.value  = "";
  });
}

/* ─── search + sort ─── */

function wireUtilityZone() {
  document.getElementById("findTaskInput").addEventListener("input", e => {
    searchPhrase = e.target.value;
    renderList();
  });

  document.getElementById("sortPicker").addEventListener("change", e => {
    sortMode = e.target.value;
    renderList();
  });
}

/* ─── boot ─── */

function bootApp() {
  wireForm();
  wireUtilityZone();

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => applyFilter(btn.dataset.filter));
  });

  document.getElementById("clearCompleted").addEventListener("click", clearFinished);
  document.getElementById("todoList").addEventListener("click", handleListClick);

  taskList = fetchFromStorage();
  renderList();
  refreshStats();
}

document.addEventListener("DOMContentLoaded", bootApp);
