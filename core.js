const SEPARATOR = " => ";
const PAGE_SIZE = 32;
const SETTINGS_KEY = "lablocalizer_settings";

const defaultSettings = {
  theme: "light",
  githubToken: "",
  githubOwner: "",
  githubRepo: "",
  githubBranch: "main",
  githubPath: "",
  githubCommitMsg: "更新本地化文件"
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw);
    return { ...defaultSettings, ...parsed };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettingsToStorage(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

let settings = loadSettings();

const state = {
  page: "entries",
  fileName: "",
  entries: [],
  filteredIndexes: [],
  selectedId: null,
  search: "",
  translationFilter: "all",
  currentPage: 1,
  selectedEntryIds: new Set(),
  editorOpen: false,
  editDraft: null,
  terms: [],
  termSearch: "",
  termSort: "created",
  selectedTermIds: new Set(),
  deleteConfirmTarget: null,
  editingTermId: null
};

const els = {
  pageTitle: document.getElementById("pageTitle"),
  stats: document.getElementById("stats"),
  themeToggle: document.getElementById("themeToggle"),
  entriesPage: document.getElementById("entriesPage"),
  termsPage: document.getElementById("termsPage"),
  announcementsPage: document.getElementById("announcementsPage"),
  navButtons: document.querySelectorAll(".nav-button"),
  fileInput: document.getElementById("fileInput"),
  openButton: document.getElementById("openButton"),
  exportButton: document.getElementById("exportButton"),
  bulkWrap: document.getElementById("bulkWrap"),
  bulkButton: document.getElementById("bulkButton"),
  bulkMenu: document.getElementById("bulkMenu"),
  searchInput: document.getElementById("searchInput"),
  translationFilter: document.getElementById("translationFilter"),
  fileName: document.getElementById("fileName"),
  emptyState: document.getElementById("emptyState"),
  entryTable: document.getElementById("entryTable"),
  entryBody: document.getElementById("entryBody"),
  entrySelectAll: document.getElementById("entrySelectAll"),
  entryEditorBackdrop: document.getElementById("entryEditorBackdrop"),
  entryEditor: document.getElementById("entryEditor"),
  pager: document.getElementById("pager"),
  prevPageButton: document.getElementById("prevPageButton"),
  nextPageButton: document.getElementById("nextPageButton"),
  pageInfo: document.getElementById("pageInfo"),
  totalCount: document.getElementById("totalCount"),
  visibleCount: document.getElementById("visibleCount"),
  translatedCount: document.getElementById("translatedCount"),
  editorTitle: document.getElementById("editorTitle"),
  editorMeta: document.getElementById("editorMeta"),
  closeEditorButton: document.getElementById("closeEditorButton"),
  sourcePreview: document.getElementById("sourcePreview"),
  translationEditor: document.getElementById("translationEditor"),
  translationButtons: document.getElementById("translationButtons"),
  matchTermsButton: document.getElementById("matchTermsButton"),
  termMatchList: document.getElementById("termMatchList"),
  nextEntryButton: document.getElementById("nextEntryButton"),
  cancelEditButton: document.getElementById("cancelEditButton"),
  saveEditButton: document.getElementById("saveEditButton"),
  createTermButton: document.getElementById("createTermButton"),
  termModal: document.getElementById("termModal"),
  termForm: document.getElementById("termForm"),
  termModalTitle: document.querySelector("#termModal .modal-title"),
  submitTermButton: document.getElementById("submitTermButton"),
  closeTermModal: document.getElementById("closeTermModal"),
  cancelTermButton: document.getElementById("cancelTermButton"),
  termType: document.getElementById("termType"),
  termSource: document.getElementById("termSource"),
  termTranslation: document.getElementById("termTranslation"),
  termDescription: document.getElementById("termDescription"),
  termCaseSensitive: document.getElementById("termCaseSensitive"),
  termBody: document.getElementById("termBody"),
  termSelectAll: document.getElementById("termSelectAll"),
  termBulkWrap: document.getElementById("termBulkWrap"),
  termBulkButton: document.getElementById("termBulkButton"),
  termBulkMenu: document.getElementById("termBulkMenu"),
  termEmpty: document.getElementById("termEmpty"),
  termSearch: document.getElementById("termSearch"),
  termSort: document.getElementById("termSort"),
  deleteConfirmModal: document.getElementById("deleteConfirmModal"),
  deleteConfirmForm: document.getElementById("deleteConfirmForm"),
  deleteConfirmMessage: document.getElementById("deleteConfirmMessage"),
  deleteConfirmInput: document.getElementById("deleteConfirmInput"),
  submitDeleteConfirm: document.getElementById("submitDeleteConfirm"),
  closeDeleteConfirm: document.getElementById("closeDeleteConfirm"),
  cancelDeleteConfirm: document.getElementById("cancelDeleteConfirm"),
  toast: document.getElementById("toast"),
  settingsToggle: document.getElementById("settingsToggle"),
  settingsPanel: document.getElementById("settingsPanel"),
  settingsThemeToggle: document.getElementById("settingsThemeToggle"),
  githubToken: document.getElementById("githubToken"),
  githubOwner: document.getElementById("githubOwner"),
  githubRepo: document.getElementById("githubRepo"),
  githubBranch: document.getElementById("githubBranch"),
  githubPath: document.getElementById("githubPath"),
  githubCommitMsg: document.getElementById("githubCommitMsg"),
  testGithubButton: document.getElementById("testGithubButton"),
  saveSettingsButton: document.getElementById("saveSettingsButton"),
  loadFromGithubButton: document.getElementById("loadFromGithubButton"),
  pushToGithubButton: document.getElementById("pushToGithubButton"),
  importGlossaryButton: document.getElementById("importGlossaryButton"),
  exportGlossaryButton: document.getElementById("exportGlossaryButton"),
  glossaryFileInput: document.getElementById("glossaryFileInput"),
  pushGlossaryToGithubButton: document.getElementById("pushGlossaryToGithubButton")
};


function switchPage(page) {
  state.page = page;
  els.navButtons.forEach(button => button.classList.toggle("active", button.dataset.page === page));
  els.entriesPage.hidden = page !== "entries";
  els.termsPage.hidden = page !== "terms";
  els.announcementsPage.hidden = page !== "announcements";
  els.stats.hidden = page !== "entries";

  const titles = {
    entries: "词条管理",
    terms: "术语管理",
    announcements: "公告"
  };
  els.pageTitle.textContent = titles[page];
}

function applyTheme(dark) {
  document.body.classList.toggle("dark-mode", dark);
  const label = dark ? "切换亮色模式" : "切换暗色模式";
  els.themeToggle.title = label;
  els.themeToggle.setAttribute("aria-label", label);
}

function toggleTheme() {
  const dark = !document.body.classList.contains("dark-mode");
  applyTheme(dark);
  settings.theme = dark ? "dark" : "light";
  saveSettingsToStorage(settings);
}

function populateSettings() {
  els.githubToken.value = settings.githubToken || "";
  els.githubOwner.value = settings.githubOwner || "";
  els.githubRepo.value = settings.githubRepo || "";
  els.githubBranch.value = settings.githubBranch || "main";
  els.githubPath.value = settings.githubPath || "";
  els.githubCommitMsg.value = settings.githubCommitMsg || defaultSettings.githubCommitMsg;
  applyTheme(settings.theme === "dark");
  updateGithubActionButtons();
}

function saveSettings() {
  settings.githubToken = els.githubToken.value.trim();
  settings.githubOwner = els.githubOwner.value.trim();
  settings.githubRepo = els.githubRepo.value.trim();
  settings.githubBranch = els.githubBranch.value.trim() || "main";
  settings.githubPath = els.githubPath.value.trim();
  settings.githubCommitMsg = els.githubCommitMsg.value.trim() || defaultSettings.githubCommitMsg;
  saveSettingsToStorage(settings);
  updateGithubActionButtons();
  showToast("设置已保存。");
}

function updateGithubActionButtons() {
  const canUseGithub = settings.githubToken && settings.githubOwner && settings.githubRepo && settings.githubPath;
  els.loadFromGithubButton.disabled = !canUseGithub;
  els.pushToGithubButton.disabled = !canUseGithub || state.entries.length === 0;
  const canPushGlossary = settings.githubToken && settings.githubOwner && settings.githubRepo;
  els.pushGlossaryToGithubButton.disabled = !canPushGlossary || state.terms.length === 0;
}

function openDeleteConfirmModal(target, count) {
  state.deleteConfirmTarget = target;
  const noun = target === "terms" ? "术语" : "词条";
  els.deleteConfirmMessage.textContent = `将删除已选 ${count} 个${noun}。这个操作无法在当前页面内恢复。`;
  els.deleteConfirmInput.value = "";
  els.submitDeleteConfirm.disabled = true;
  els.deleteConfirmModal.hidden = false;
  setTimeout(() => els.deleteConfirmInput.focus(), 0);
}

function closeDeleteConfirmModal() {
  els.deleteConfirmModal.hidden = true;
  els.deleteConfirmInput.value = "";
  els.submitDeleteConfirm.disabled = true;
  state.deleteConfirmTarget = null;
}

function confirmDeleteSelectedEntries() {
  if (els.deleteConfirmInput.value !== "确定删除") {
    return;
  }

  if (state.deleteConfirmTarget === "terms") {
    confirmDeleteSelectedTerms();
    return;
  }

  const selectedIds = new Set(state.selectedEntryIds);
  state.entries = state.entries.filter(entry => !selectedIds.has(entry.id));
  state.selectedEntryIds.clear();
  if (state.selectedId && selectedIds.has(state.selectedId)) {
    state.selectedId = state.entries[0] ? state.entries[0].id : null;
    state.editorOpen = false;
    state.editDraft = null;
  }

  closeDeleteConfirmModal();
  renderEntries();
  showToast("已删除选中的词条。");
}

function confirmDeleteSelectedTerms() {
  const selectedIds = new Set(state.selectedTermIds);
  state.terms = state.terms.filter(term => !selectedIds.has(term.id));
  state.selectedTermIds.clear();

  closeDeleteConfirmModal();
  renderTerms();
  showToast("已删除选中的术语。");
}

function normalizeText(value) {
  return String(value || "").trim();
}

function selectedEntry() {
  return state.entries.find(entry => entry.id === state.selectedId) || null;
}

function makeId(seed) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${seed}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function checkCell(selected, onToggle) {
  const td = document.createElement("td");
  td.className = "col-check";
  const box = document.createElement("button");
  box.className = "check";
  box.type = "button";
  box.classList.toggle("selected", Boolean(selected));
  box.addEventListener("click", event => {
    event.stopPropagation();
    onToggle();
  });
  td.appendChild(box);
  return td;
}

function entryActionsCell(entry) {
  const td = document.createElement("td");
  td.className = "col-actions";
  const edit = document.createElement("button");
  edit.className = "icon-button";
  edit.type = "button";
  edit.textContent = "✎";
  edit.title = "编辑词条";
  edit.addEventListener("click", event => {
    event.stopPropagation();
    selectEntry(entry.id);
  });
  td.appendChild(edit);
  return td;
}

function textCell(value, className) {
  const td = document.createElement("td");
  if (className) td.className = className;
  td.textContent = value;
  return td;
}

function badgeCell(status) {
  const td = document.createElement("td");
  td.className = "col-status";
  td.appendChild(statusBadge(status));
  return td;
}

function statusBadge(status) {
  const span = document.createElement("span");
  const icon = document.createElement("span");
  icon.className = "status-icon";
  span.className = "badge";

  if (status === "已翻译") {
    span.classList.add("done");
    icon.textContent = "✓";
  } else if (status === "有疑问") {
    span.classList.add("question");
    icon.textContent = "?";
  } else if (status === "未翻译") {
    span.classList.add("pending");
    icon.textContent = "!";
  } else {
    span.classList.add("neutral");
    icon.textContent = "·";
  }

  span.appendChild(icon);
  span.append(status);
  return span;
}

let toastTimer = 0;
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2400);
}

function updateExportGlossaryButton() {
  if (els.exportGlossaryButton) {
    els.exportGlossaryButton.disabled = state.terms.length === 0;
  }
}
