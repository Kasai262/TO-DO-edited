const STORAGE_KEY = "todos-app";

const defaultTasks = [
  { id: 1, title: "Poceti bazu podataka", completed: false, dueDate: "2025-07-01" },
  { id: 2, title: "Uciti Node.js", completed: false, dueDate: "2025-07-10" },
  { id: 3, title: "Uraditi to-do projekat", completed: false, dueDate: "2025-07-15" },
];

let tasks = [];
let currentFilter = "all";
let sortMode = "none";
let searchText = "";
let draggedId = null;

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTasks));
  return defaultTasks;
}

function updateStats() {
  const done = tasks.filter(t => t.completed).length;
  document.getElementById("statTotal").textContent = tasks.length;
  document.getElementById("statActive").textContent = tasks.length - done;
  document.getElementById("statDone").textContent = done;
}

function showError(msg) {
  const el = document.getElementById("errorMessage");
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => el.style.display = "none", 3000);
}

// dd.mm.yyyy format
function formatDate(str) {
  if (!str) return "";
  const [y, m, d] = str.split("-");
  return `${d}.${m}.${y}`;
}

function createTaskEl(task) {
  const el = document.createElement("div");
  el.className = "todo-item" + (task.completed ? " completed" : "");
  el.id = "task-" + task.id;
  el.draggable = true;

  el.innerHTML = `
    <span class="drag-handle" title="Drag to reorder">⠿</span>
    <div class="todo-item-info">
      <span class="todo-text">${task.title}</span>
      <span class="todo-due-date">Due: ${formatDate(task.dueDate)}</span>
    </div>
    <div class="todo-actions">
      <button class="btn btn-toggle" data-action="toggle">${task.completed ? "Undo" : "Complete"}</button>
      <button class="btn btn-edit" data-action="edit">Edit</button>
      <button class="btn btn-delete" data-action="delete">Delete</button>
    </div>
  `;

  setupDrag(el, task.id);
  return el;
}

function openEditMode(el, task) {
  el.querySelector(".todo-item-info").innerHTML = `
    <input class="todo-edit-input" type="text" value="${task.title}" maxlength="120" />
  `;
  el.querySelector(".todo-actions").innerHTML = `
    <button class="btn btn-save" data-action="save">Save</button>
    <button class="btn btn-cancel" data-action="cancel">Cancel</button>
  `;
  el.querySelector(".todo-edit-input").focus();
}

function openDeleteConfirm(el) {
  el.querySelector(".todo-actions").innerHTML = `
    <span class="delete-confirm-label">Are you sure?</span>
    <button class="btn btn-delete" data-action="confirm-delete">Yes, delete</button>
    <button class="btn btn-cancel" data-action="cancel">Cancel</button>
  `;
}

function renderList() {
  const container = document.getElementById("todoList");
  container.innerHTML = "";

  let list = tasks.filter(task => {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  if (searchText.trim()) {
    const q = searchText.trim().toLowerCase();
    list = list.filter(t => t.title.toLowerCase().includes(q));
  }

  if (sortMode === "asc") {
    list = [...list].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  } else if (sortMode === "desc") {
    list = [...list].sort((a, b) => (b.dueDate || "").localeCompare(a.dueDate || ""));
  }

  if (list.length === 0) {
    container.innerHTML = "<p style='color:#888;text-align:center;margin-top:20px'>No tasks found.</p>";
    return;
  }

  list.forEach(task => container.appendChild(createTaskEl(task)));
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  renderList();
}

function addTask(title, dueDate) {
  tasks.unshift({
    id: Date.now(),
    title,
    completed: false,
    dueDate,
  });
  saveTasks();
  renderList();
  updateStats();
}

function toggleTask(task) {
  task.completed = !task.completed;
  saveTasks();
  renderList();
  updateStats();
}

function saveEdit(el, task) {
  const newTitle = el.querySelector(".todo-edit-input").value.trim();
  if (newTitle.length < 3) {
    showError("Title needs at least 3 characters.");
    return;
  }
  task.title = newTitle;
  saveTasks();
  renderList();
}

function deleteTask(task) {
  tasks = tasks.filter(t => t.id !== task.id);
  saveTasks();
  renderList();
  updateStats();
}

function clearCompleted() {
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  renderList();
  updateStats();
}

function handleClick(e) {
  const btn = e.target.closest("button");
  if (!btn) return;

  const el = btn.closest(".todo-item");
  const taskId = Number(el.id.replace("task-", ""));
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const action = btn.dataset.action;

  if (action === "toggle") toggleTask(task);
  if (action === "edit") openEditMode(el, task);
  if (action === "save") saveEdit(el, task);
  if (action === "cancel") renderList();
  if (action === "delete") openDeleteConfirm(el);
  if (action === "confirm-delete") deleteTask(task);
}

function setupDrag(el, taskId) {
  el.addEventListener("dragstart", () => {
    draggedId = taskId;
    setTimeout(() => el.classList.add("dragging"), 0);
  });

  el.addEventListener("dragend", () => {
    el.classList.remove("dragging");
    document.querySelectorAll(".todo-item").forEach(i => i.classList.remove("drag-over"));
  });

  el.addEventListener("dragover", e => {
    e.preventDefault();
    if (taskId !== draggedId) el.classList.add("drag-over");
  });

  el.addEventListener("dragleave", () => el.classList.remove("drag-over"));

  el.addEventListener("drop", e => {
    e.preventDefault();
    el.classList.remove("drag-over");
    if (draggedId === taskId) return;

    const from = tasks.findIndex(t => t.id === draggedId);
    const to = tasks.findIndex(t => t.id === taskId);
    if (from === -1 || to === -1) return;

    const moved = tasks.splice(from, 1)[0];
    tasks.splice(to, 0, moved);

    saveTasks();
    renderList();
  });
}

function init() {
  const form = document.getElementById("todoForm");
  const titleInput = document.getElementById("todoInput");
  const dateInput = document.getElementById("dueDateInput");

  form.addEventListener("submit", e => {
    e.preventDefault();
    const title = titleInput.value.trim();
    const dueDate = dateInput.value;

    if (title.length < 3) {
      showError("Title needs at least 3 characters.");
      return;
    }
    if (!dueDate) {
      showError("Please pick a due date.");
      return;
    }

    addTask(title, dueDate);
    titleInput.value = "";
    dateInput.value = "";
  });

  document.getElementById("findTaskInput").addEventListener("input", e => {
    searchText = e.target.value;
    renderList();
  });

  document.getElementById("sortPicker").addEventListener("change", e => {
    sortMode = e.target.value;
    renderList();
  });

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
  });

  document.getElementById("clearCompleted").addEventListener("click", clearCompleted);
  document.getElementById("todoList").addEventListener("click", handleClick);

  tasks = loadTasks();
  renderList();
  updateStats();
}

document.addEventListener("DOMContentLoaded", init);
