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
  reviewFilter: "all",
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
  reviewFilter: document.getElementById("reviewFilter"),
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
  reviewedCount: document.getElementById("reviewedCount"),
  editorTitle: document.getElementById("editorTitle"),
  editorMeta: document.getElementById("editorMeta"),
  closeEditorButton: document.getElementById("closeEditorButton"),
  sourcePreview: document.getElementById("sourcePreview"),
  translationEditor: document.getElementById("translationEditor"),
  translationButtons: document.getElementById("translationButtons"),
  reviewButtons: document.getElementById("reviewButtons"),
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

els.navButtons.forEach(button => {
  button.addEventListener("click", () => switchPage(button.dataset.page));
});
els.themeToggle.addEventListener("click", toggleTheme);
els.openButton.addEventListener("click", () => els.fileInput.click());
els.fileInput.addEventListener("change", handleFilePick);
els.exportButton.addEventListener("click", exportTxt);
els.importGlossaryButton.addEventListener("click", () => els.glossaryFileInput.click());
els.glossaryFileInput.addEventListener("change", handleGlossaryFilePick);
els.exportGlossaryButton.addEventListener("click", exportGlossary);
els.bulkButton.addEventListener("click", event => {
  event.stopPropagation();
  els.bulkMenu.hidden = !els.bulkMenu.hidden;
});
els.bulkMenu.addEventListener("click", handleBulkAction);
els.searchInput.addEventListener("input", () => {
  state.search = els.searchInput.value.trim().toLowerCase();
  state.currentPage = 1;
  renderEntries();
});
els.translationFilter.addEventListener("change", () => {
  state.translationFilter = els.translationFilter.value;
  state.currentPage = 1;
  renderEntries();
});
els.reviewFilter.addEventListener("change", () => {
  state.reviewFilter = els.reviewFilter.value;
  state.currentPage = 1;
  renderEntries();
});
els.prevPageButton.addEventListener("click", () => {
  state.currentPage = Math.max(1, state.currentPage - 1);
  renderEntries();
});
els.nextPageButton.addEventListener("click", () => {
  state.currentPage = Math.min(totalPages(), state.currentPage + 1);
  renderEntries();
});
els.entrySelectAll.addEventListener("click", () => toggleCurrentPageEntries());
els.closeEditorButton.addEventListener("click", closeEntryEditor);
els.translationEditor.addEventListener("input", () => {
  if (!state.editDraft) return;
  state.editDraft.translation = els.translationEditor.value;
  if (!state.editDraft.statusTouched) {
    state.editDraft.translationStatus = autoTranslationStatus(state.editDraft);
  }
  updateChoiceButtons(state.editDraft);
});
els.translationButtons.addEventListener("click", event => {
  const button = event.target.closest("[data-status]");
  if (!button || !state.editDraft) return;
  state.editDraft.translationStatus = button.dataset.status;
  state.editDraft.statusTouched = true;
  updateChoiceButtons(state.editDraft);
});
els.reviewButtons.addEventListener("click", event => {
  const button = event.target.closest("[data-review]");
  if (!button || !state.editDraft) return;
  state.editDraft.reviewStatus = button.dataset.review;
  updateChoiceButtons(state.editDraft);
});
els.matchTermsButton.addEventListener("click", matchTermsForSelectedEntry);
els.nextEntryButton.addEventListener("click", selectNextEntry);
els.cancelEditButton.addEventListener("click", closeEntryEditor);
els.saveEditButton.addEventListener("click", saveEntryDraft);
els.createTermButton.addEventListener("click", openTermModal);
els.closeTermModal.addEventListener("click", closeTermModal);
els.cancelTermButton.addEventListener("click", closeTermModal);
els.termForm.addEventListener("submit", createTerm);
els.termSearch.addEventListener("input", () => {
  state.termSearch = els.termSearch.value.trim().toLowerCase();
  renderTerms();
});
els.termSort.addEventListener("change", () => {
  state.termSort = els.termSort.value;
  renderTerms();
});
els.termSelectAll.addEventListener("click", () => toggleAllVisibleTerms());
els.termBulkButton.addEventListener("click", event => {
  event.stopPropagation();
  els.termBulkMenu.hidden = !els.termBulkMenu.hidden;
});
els.termBulkMenu.addEventListener("click", handleTermBulkAction);
els.deleteConfirmInput.addEventListener("input", () => {
  els.submitDeleteConfirm.disabled = els.deleteConfirmInput.value !== "确定删除";
});
els.deleteConfirmForm.addEventListener("submit", event => {
  event.preventDefault();
  confirmDeleteSelectedEntries();
});
els.closeDeleteConfirm.addEventListener("click", closeDeleteConfirmModal);
els.cancelDeleteConfirm.addEventListener("click", closeDeleteConfirmModal);
document.addEventListener("click", event => {
  if (!els.bulkWrap.contains(event.target)) {
    els.bulkMenu.hidden = true;
  }
  if (!els.termBulkWrap.contains(event.target)) {
    els.termBulkMenu.hidden = true;
  }
});

els.settingsToggle.addEventListener("click", () => {
  const expanded = els.settingsPanel.hidden;
  els.settingsPanel.hidden = !expanded;
  els.settingsToggle.setAttribute("aria-expanded", String(expanded));
});
els.settingsThemeToggle.addEventListener("click", () => toggleTheme());
els.saveSettingsButton.addEventListener("click", saveSettings);
els.testGithubButton.addEventListener("click", testGithubConnection);
els.loadFromGithubButton.addEventListener("click", loadFromGithub);
els.pushToGithubButton.addEventListener("click", pushToGithub);
els.pushGlossaryToGithubButton.addEventListener("click", pushGlossaryToGithub);

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

function githubHeaders() {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${settings.githubToken}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function testGithubConnection() {
  if (!settings.githubToken) {
    showToast("请先填写 PAT。");
    return;
  }
  try {
    const res = await fetch("https://api.github.com/user", { headers: githubHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    showToast(`连接成功：${data.login}`);
  } catch (err) {
    showToast(`连接失败：${err.message}`);
  }
}

async function loadFromGithub() {
  if (!settings.githubToken || !settings.githubOwner || !settings.githubRepo || !settings.githubPath) {
    showToast("请先在设置中填写完整的 GitHub 信息。");
    return;
  }
  const branch = settings.githubBranch || "main";
  const url = `https://api.github.com/repos/${encodeURIComponent(settings.githubOwner)}/${encodeURIComponent(settings.githubRepo)}/contents/${encodeURIComponent(settings.githubPath)}?ref=${encodeURIComponent(branch)}`;
  try {
    const res = await fetch(url, { headers: githubHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.content) throw new Error("返回数据中没有文件内容。");
    const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), c => c.charCodeAt(0));
    const text = new TextDecoder().decode(bytes);
    const fileName = settings.githubPath.split("/").pop() || "github.txt";
    loadText(text, { name: fileName });
    state.githubSha = data.sha;
    showToast("已从 GitHub 加载文件。");
  } catch (err) {
    showToast(`读取失败：${err.message}`);
  }

  const glossaryPath = "glossary.json";
  const glossaryUrl = `https://api.github.com/repos/${encodeURIComponent(settings.githubOwner)}/${encodeURIComponent(settings.githubRepo)}/contents/${encodeURIComponent(glossaryPath)}?ref=${encodeURIComponent(branch)}`;
  try {
    const res = await fetch(glossaryUrl, { headers: githubHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.content) return;
    const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), c => c.charCodeAt(0));
    const text = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(text);
    const terms = Array.isArray(parsed) ? parsed : Array.isArray(parsed.terms) ? parsed.terms : null;
    if (!terms) return;
    const now = Date.now();
    state.terms = terms.map((item, index) => ({
      id: `term_${now}_${index}`,
      type: item.type || "名词",
      source: String(item.source || "").trim(),
      translation: String(item.translation || "").trim(),
      description: String(item.description || "").trim(),
      caseSensitive: Boolean(item.caseSensitive),
      createdAt: now,
      updatedAt: now
    })).filter(term => term.source.length > 0);
    state.selectedTermIds.clear();
    state.githubGlossarySha = data.sha;
    renderTerms();
    showToast(`已从 GitHub 加载 ${state.terms.length} 条术语。`);
  } catch {
    // glossary.json may not exist yet, that's fine
  }
}

async function pushToGithub() {
  if (!settings.githubToken || !settings.githubOwner || !settings.githubRepo || !settings.githubPath) {
    showToast("请先在设置中填写完整的 GitHub 信息。");
    return;
  }
  if (!state.entries.length) {
    showToast("当前没有可提交的词条。");
    return;
  }
  const lines = state.entries.map(entry => {
    if (entry.hasSeparator || entry.translation.trim()) {
      return `${entry.source}${SEPARATOR}${entry.translation}`;
    }
    return entry.source;
  });
  const contentBytes = new TextEncoder().encode(lines.join("\r\n"));
  const content = btoa(Array.from(contentBytes, b => String.fromCharCode(b)).join(""));
  const branch = settings.githubBranch || "main";

  let sha = state.githubSha || "";
  if (!sha) {
    try {
      const getUrl = `https://api.github.com/repos/${encodeURIComponent(settings.githubOwner)}/${encodeURIComponent(settings.githubRepo)}/contents/${encodeURIComponent(settings.githubPath)}?ref=${encodeURIComponent(branch)}`;
      const getRes = await fetch(getUrl, { headers: githubHeaders() });
      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha || "";
      }
    } catch {}
  }

  const prBranch = `lablocalizer-update-${Date.now()}`;
  const defaultMsg = settings.githubCommitMsg || defaultSettings.githubCommitMsg;
  const message = `${defaultMsg} (${new Date().toLocaleString("zh-CN")})`;

  try {
    const repoUrl = `https://api.github.com/repos/${encodeURIComponent(settings.githubOwner)}/${encodeURIComponent(settings.githubRepo)}`;

    const baseRefRes = await fetch(`${repoUrl}/git/ref/heads/${encodeURIComponent(branch)}`, { headers: githubHeaders() });
    if (!baseRefRes.ok) throw new Error(`获取基础分支失败：HTTP ${baseRefRes.status}`);
    const baseRefData = await baseRefRes.json();
    const baseSha = baseRefData.object.sha;

    const createRefRes = await fetch(`${repoUrl}/git/refs`, {
      method: "POST",
      headers: githubHeaders(),
      body: JSON.stringify({ ref: `refs/heads/${prBranch}`, sha: baseSha })
    });
    if (!createRefRes.ok) throw new Error(`创建分支失败：HTTP ${createRefRes.status}`);

    const putUrl = `${repoUrl}/contents/${encodeURIComponent(settings.githubPath)}`;
    const putBody = { message, content, branch: prBranch };
    if (sha) putBody.sha = sha;
    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: githubHeaders(),
      body: JSON.stringify(putBody)
    });
    if (!putRes.ok) throw new Error(`提交文件失败：HTTP ${putRes.status}`);

    const prRes = await fetch(`${repoUrl}/pulls`, {
      method: "POST",
      headers: githubHeaders(),
      body: JSON.stringify({
        title: message,
        head: prBranch,
        base: branch,
        body: "由 LabLocalizer Studio 自动创建。"
      })
    });
    if (!prRes.ok) throw new Error(`创建 Pull Request 失败：HTTP ${prRes.status}`);
    const prData = await prRes.json();
    showToast(`PR 已创建：#${prData.number}`);
    window.open(prData.html_url, "_blank");
  } catch (err) {
    showToast(`提交失败：${err.message}`);
  }
}

async function pushGlossaryToGithub() {
  if (!settings.githubToken || !settings.githubOwner || !settings.githubRepo) {
    showToast("请先在设置中填写完整的 GitHub 信息。");
    return;
  }
  if (!state.terms.length) {
    showToast("当前没有可提交的术语。");
    return;
  }

  const glossaryPath = "glossary.json";
  const payload = state.terms.map(term => ({
    type: term.type,
    source: term.source,
    translation: term.translation,
    description: term.description,
    caseSensitive: term.caseSensitive
  }));
  const contentBytes = new TextEncoder().encode(JSON.stringify(payload, null, 2));
  const content = btoa(Array.from(contentBytes, b => String.fromCharCode(b)).join(""));
  const branch = settings.githubBranch || "main";

  let sha = state.githubGlossarySha || "";
  if (!sha) {
    try {
      const getUrl = `https://api.github.com/repos/${encodeURIComponent(settings.githubOwner)}/${encodeURIComponent(settings.githubRepo)}/contents/${encodeURIComponent(glossaryPath)}?ref=${encodeURIComponent(branch)}`;
      const getRes = await fetch(getUrl, { headers: githubHeaders() });
      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha || "";
      }
    } catch {}
  }

  const prBranch = `lablocalizer-glossary-${Date.now()}`;
  const message = `更新术语表 (${new Date().toLocaleString("zh-CN")})`;

  try {
    const repoUrl = `https://api.github.com/repos/${encodeURIComponent(settings.githubOwner)}/${encodeURIComponent(settings.githubRepo)}`;

    const baseRefRes = await fetch(`${repoUrl}/git/ref/heads/${encodeURIComponent(branch)}`, { headers: githubHeaders() });
    if (!baseRefRes.ok) throw new Error(`获取基础分支失败：HTTP ${baseRefRes.status}`);
    const baseRefData = await baseRefRes.json();
    const baseSha = baseRefData.object.sha;

    const createRefRes = await fetch(`${repoUrl}/git/refs`, {
      method: "POST",
      headers: githubHeaders(),
      body: JSON.stringify({ ref: `refs/heads/${prBranch}`, sha: baseSha })
    });
    if (!createRefRes.ok) throw new Error(`创建分支失败：HTTP ${createRefRes.status}`);

    const putUrl = `${repoUrl}/contents/${encodeURIComponent(glossaryPath)}`;
    const putBody = { message, content, branch: prBranch };
    if (sha) putBody.sha = sha;
    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: githubHeaders(),
      body: JSON.stringify(putBody)
    });
    if (!putRes.ok) throw new Error(`提交术语表失败：HTTP ${putRes.status}`);

    const prRes = await fetch(`${repoUrl}/pulls`, {
      method: "POST",
      headers: githubHeaders(),
      body: JSON.stringify({
        title: message,
        head: prBranch,
        base: branch,
        body: "由 LabLocalizer Studio 自动创建的术语表更新 PR。"
      })
    });
    if (!prRes.ok) throw new Error(`创建 Pull Request 失败：HTTP ${prRes.status}`);
    const prData = await prRes.json();
    showToast(`术语表 PR 已创建：#${prData.number}`);
    window.open(prData.html_url, "_blank");
  } catch (err) {
    showToast(`术语表提交失败：${err.message}`);
  }
}

function handleFilePick(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => loadText(String(reader.result || ""), file);
  reader.onerror = () => showToast("读取失败，请确认文件可访问。");
  reader.readAsText(file, "UTF-8");
}

function loadText(text, file) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  state.fileName = file.name;
  state.entries = lines
    .map((line, index) => parseLine(line, index + 1))
    .filter(entry => entry.raw.trim().length > 0);
  state.selectedId = state.entries[0] ? state.entries[0].id : null;
  state.selectedEntryIds.clear();
  state.editorOpen = false;
  state.editDraft = null;
  state.search = "";
  state.translationFilter = "all";
  state.reviewFilter = "all";
  state.currentPage = 1;

  els.searchInput.value = "";
  els.translationFilter.value = "all";
  els.reviewFilter.value = "all";
  els.fileName.textContent = file.name;
  els.exportButton.disabled = state.entries.length === 0;
  updateGithubActionButtons();
  renderEntries();
  showToast(`已加载 ${state.entries.length} 条词条。`);
}

function parseLine(line, lineNumber) {
  const separatorIndex = line.indexOf(SEPARATOR);
  const hasSeparator = separatorIndex >= 0;
  const source = hasSeparator ? line.slice(0, separatorIndex) : line;
  const translation = hasSeparator ? line.slice(separatorIndex + SEPARATOR.length) : "";
  const entry = {
    id: makeId(lineNumber),
    lineNumber,
    raw: line,
    source,
    translation,
    hasSeparator,
    translationStatus: "未翻译",
    statusTouched: false,
    reviewStatus: "未审核"
  };
  entry.translationStatus = autoTranslationStatus(entry);
  return entry;
}

function renderEntries() {
  state.filteredIndexes = state.entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => matchesEntrySearch(entry))
    .map(({ index }) => index);
  if (state.editorOpen && state.selectedId && !state.filteredIndexes.some(index => state.entries[index].id === state.selectedId)) {
    state.editorOpen = false;
    state.editDraft = null;
  }
  clampCurrentPage();
  renderStats();
  renderEntryTable();
  renderEditor();
}

function renderStats() {
  const translated = state.entries.filter(entry => entry.translationStatus === "已翻译").length;
  const reviewed = state.entries.filter(entry => entry.reviewStatus === "审核通过").length;
  els.totalCount.textContent = state.entries.length;
  els.visibleCount.textContent = currentPageIndexes().length;
  els.translatedCount.textContent = translated;
  els.reviewedCount.textContent = reviewed;
}

function renderEntryTable() {
  const hasEntries = state.entries.length > 0;
  els.emptyState.hidden = hasEntries;
  els.entryTable.hidden = !hasEntries;
  els.pager.hidden = !hasEntries;
  els.entryBody.textContent = "";

  if (!hasEntries) {
    updateBulkMenu();
    renderPager();
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const index of currentPageIndexes()) {
    const entry = state.entries[index];
    const row = document.createElement("tr");
    row.dataset.id = entry.id;
    row.classList.toggle("active", state.editorOpen && entry.id === state.selectedId);

    row.appendChild(checkCell(state.selectedEntryIds.has(entry.id), () => toggleEntrySelection(entry.id)));
    row.appendChild(textCell(entry.lineNumber, "col-line"));
    row.appendChild(textCell(entry.source, "text-cell"));
    row.appendChild(textCell(entry.translation, "text-cell"));
    row.appendChild(badgeCell(entry.translationStatus, "translation"));
    row.appendChild(badgeCell(entry.reviewStatus, "review"));
    row.appendChild(entryActionsCell(entry));
    fragment.appendChild(row);
  }

  els.entryBody.appendChild(fragment);
  updateEntrySelectAllState();
  updateBulkMenu();
  renderPager();
}

function renderEditor() {
  const entry = selectedEntry();
  const hasEntry = Boolean(entry);
  els.translationEditor.disabled = !hasEntry;
  els.matchTermsButton.disabled = !hasEntry;
  els.nextEntryButton.disabled = !hasEntry;
  els.cancelEditButton.disabled = !hasEntry;
  els.saveEditButton.disabled = !hasEntry;
  els.entryEditor.classList.toggle("closed", !state.editorOpen);
  els.entryEditorBackdrop.hidden = !state.editorOpen;

  if (!entry || !state.editorOpen) {
    els.editorTitle.textContent = "未选择词条";
    els.editorMeta.textContent = state.entries.length ? "当前搜索结果为空" : "从左侧列表选择一行";
    els.sourcePreview.textContent = "";
    els.translationEditor.value = "";
    renderTermMatchEmpty("尚未匹配。点击按钮后会根据当前原文查找术语管理中的术语。");
    updateChoiceButtons(null);
    return;
  }

  if (!state.editDraft || state.editDraft.id !== entry.id) {
    state.editDraft = createEntryDraft(entry);
  }

  els.editorTitle.textContent = `第 ${entry.lineNumber} 行`;
  els.editorMeta.textContent = entry.hasSeparator ? "格式正常" : "未找到分隔符";
  els.sourcePreview.textContent = entry.source;
  if (els.translationEditor.value !== state.editDraft.translation) {
    els.translationEditor.value = state.editDraft.translation;
  }
  renderTermMatchEmpty("尚未匹配。点击按钮后会根据当前原文查找术语管理中的术语。");
  updateChoiceButtons(state.editDraft);
}

function updateChoiceButtons(entry) {
  els.translationButtons.querySelectorAll("[data-status]").forEach(button => {
    button.classList.toggle("active", Boolean(entry && button.dataset.status === entry.translationStatus));
    button.disabled = !entry;
  });
  els.reviewButtons.querySelectorAll("[data-review]").forEach(button => {
    button.classList.toggle("active", Boolean(entry && button.dataset.review === entry.reviewStatus));
    button.disabled = !entry;
  });
}

function createEntryDraft(entry) {
  return {
    id: entry.id,
    lineNumber: entry.lineNumber,
    source: entry.source,
    translation: entry.translation,
    hasSeparator: entry.hasSeparator,
    translationStatus: entry.translationStatus,
    statusTouched: entry.statusTouched,
    reviewStatus: entry.reviewStatus
  };
}

function saveEntryDraft() {
  const entry = selectedEntry();
  if (!entry || !state.editDraft) return;

  entry.translation = state.editDraft.translation;
  entry.translationStatus = state.editDraft.translationStatus;
  entry.statusTouched = state.editDraft.statusTouched;
  entry.reviewStatus = state.editDraft.reviewStatus;
  state.editDraft = createEntryDraft(entry);
  renderEntries();
  showToast("词条已保存。");
}

function matchTermsForSelectedEntry() {
  const entry = selectedEntry();
  if (!entry) return;

  if (state.terms.length === 0) {
    renderTermMatchEmpty("术语管理里还没有术语。先去术语管理创建术语后再匹配。");
    return;
  }

  const matches = state.terms.filter(term => termMatchesSource(term, entry.source));
  if (matches.length === 0) {
    renderTermMatchEmpty("没有在当前原文中找到术语表里的词。");
    return;
  }

  els.termMatchList.textContent = "";
  const fragment = document.createDocumentFragment();
  for (const term of matches) {
    const item = document.createElement("div");
    item.className = "term-match-item";

    const type = document.createElement("span");
    type.className = "term-match-type";
    type.textContent = term.type;

    const main = document.createElement("div");
    main.className = "term-match-main";
    main.textContent = `${term.source} → ${term.translation}`;

    const desc = document.createElement("div");
    desc.className = "term-match-desc";
    const caseText = term.caseSensitive ? "大小写敏感" : "大小写不敏感";
    desc.textContent = term.description ? `${caseText} · ${term.description}` : caseText;

    item.appendChild(type);
    item.appendChild(main);
    item.appendChild(desc);
    fragment.appendChild(item);
  }

  els.termMatchList.appendChild(fragment);
}

function termMatchesSource(term, source) {
  if (!term.source) return false;
  if (term.caseSensitive) {
    return source.includes(term.source);
  }

  return source.toLowerCase().includes(term.source.toLowerCase());
}

function renderTermMatchEmpty(message) {
  els.termMatchList.textContent = "";
  const empty = document.createElement("div");
  empty.className = "term-match-empty";
  empty.textContent = message;
  els.termMatchList.appendChild(empty);
}

function selectEntry(id) {
  state.selectedId = id;
  state.editorOpen = true;
  const entry = selectedEntry();
  state.editDraft = entry ? createEntryDraft(entry) : null;
  renderEntries();
}

function closeEntryEditor() {
  state.editorOpen = false;
  state.editDraft = null;
  renderEntries();
}

function toggleEntrySelection(id) {
  if (state.selectedEntryIds.has(id)) {
    state.selectedEntryIds.delete(id);
  } else {
    state.selectedEntryIds.add(id);
  }
  renderEntries();
}

function toggleCurrentPageEntries() {
  const ids = currentPageIndexes().map(index => state.entries[index].id);
  const allSelected = ids.length > 0 && ids.every(id => state.selectedEntryIds.has(id));

  for (const id of ids) {
    if (allSelected) {
      state.selectedEntryIds.delete(id);
    } else {
      state.selectedEntryIds.add(id);
    }
  }

  renderEntries();
}

function updateEntrySelectAllState() {
  const ids = currentPageIndexes().map(index => state.entries[index].id);
  const selectedCount = ids.filter(id => state.selectedEntryIds.has(id)).length;
  els.entrySelectAll.classList.toggle("selected", ids.length > 0 && selectedCount === ids.length);
  els.entrySelectAll.classList.toggle("partial", selectedCount > 0 && selectedCount < ids.length);
}

function updateBulkMenu() {
  const selectedCount = state.selectedEntryIds.size;
  els.bulkWrap.hidden = selectedCount === 0;
  els.bulkButton.textContent = `已选 ${selectedCount} 项 ▾`;
  if (selectedCount === 0) {
    els.bulkMenu.hidden = true;
  }
}

function handleBulkAction(event) {
  const button = event.target.closest("button");
  if (!button) return;

  const selectedIds = new Set(state.selectedEntryIds);
  if (button.dataset.bulkStatus) {
    for (const entry of state.entries) {
      if (selectedIds.has(entry.id)) {
        entry.translationStatus = button.dataset.bulkStatus;
        entry.statusTouched = true;
      }
    }
  } else if (button.dataset.bulkReview) {
    for (const entry of state.entries) {
      if (selectedIds.has(entry.id)) {
        entry.reviewStatus = button.dataset.bulkReview;
      }
    }
  } else if (button.dataset.bulkClear) {
    state.selectedEntryIds.clear();
  } else if (button.dataset.bulkDelete) {
    openDeleteConfirmModal("entries", selectedIds.size);
    els.bulkMenu.hidden = true;
    return;
  }

  els.bulkMenu.hidden = true;
  renderEntries();
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

function selectNextEntry() {
  saveEntryDraft();
  if (!state.entries.length) return;
  const currentIndex = state.entries.findIndex(entry => entry.id === state.selectedId);
  const nextIndex = currentIndex < 0 ? 0 : Math.min(state.entries.length - 1, currentIndex + 1);
  state.selectedId = state.entries[nextIndex].id;
  state.editDraft = createEntryDraft(state.entries[nextIndex]);
  state.currentPage = Math.floor(nextIndex / PAGE_SIZE) + 1;
  renderEntries();
}

function matchesEntrySearch(entry) {
  if (!matchesTranslationFilter(entry) || !matchesReviewFilter(entry)) {
    return false;
  }

  if (!state.search) return true;
  return String(entry.lineNumber).includes(state.search)
    || entry.source.toLowerCase().includes(state.search)
    || entry.translation.toLowerCase().includes(state.search)
    || entry.translationStatus.toLowerCase().includes(state.search)
    || entry.reviewStatus.toLowerCase().includes(state.search);
}

function matchesTranslationFilter(entry) {
  if (state.translationFilter === "translated") return entry.translationStatus === "已翻译";
  if (state.translationFilter === "untranslated") return entry.translationStatus === "未翻译";
  if (state.translationFilter === "question") return entry.translationStatus === "有疑问";
  return true;
}

function matchesReviewFilter(entry) {
  if (state.reviewFilter === "approved") return entry.reviewStatus === "审核通过";
  if (state.reviewFilter === "rejected") return entry.reviewStatus === "审核驳回";
  if (state.reviewFilter === "unreviewed") return entry.reviewStatus === "未审核";
  return true;
}

function currentPageIndexes() {
  const start = (state.currentPage - 1) * PAGE_SIZE;
  return state.filteredIndexes.slice(start, start + PAGE_SIZE);
}

function totalPages() {
  return Math.max(1, Math.ceil(state.filteredIndexes.length / PAGE_SIZE));
}

function clampCurrentPage() {
  state.currentPage = Math.min(Math.max(1, state.currentPage), totalPages());
}

function renderPager() {
  const pages = totalPages();
  const total = state.filteredIndexes.length;
  const start = total === 0 ? 0 : (state.currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(total, state.currentPage * PAGE_SIZE);
  els.pageInfo.textContent = `第 ${state.currentPage} / ${pages} 页，显示 ${start}-${end} / ${total}，每页最多 32 条`;
  els.prevPageButton.disabled = state.currentPage <= 1;
  els.nextPageButton.disabled = state.currentPage >= pages;
}

function autoTranslationStatus(entry) {
  if (!entry.hasSeparator || !entry.translation.trim()) return "未翻译";
  return normalizeText(entry.source) === normalizeText(entry.translation) ? "未翻译" : "已翻译";
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

function badgeCell(status, kind) {
  const td = document.createElement("td");
  td.className = kind === "review" ? "col-review" : "col-status";
  td.appendChild(statusBadge(status));
  return td;
}

function statusBadge(status) {
  const span = document.createElement("span");
  const icon = document.createElement("span");
  icon.className = "status-icon";
  span.className = "badge";

  if (status === "已翻译" || status === "审核通过") {
    span.classList.add("done");
    icon.textContent = "✓";
  } else if (status === "有疑问") {
    span.classList.add("question");
    icon.textContent = "?";
  } else if (status === "审核驳回") {
    span.classList.add("rejected");
    icon.textContent = "×";
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

function exportTxt() {
  if (!state.entries.length) return;
  const lines = state.entries.map(entry => {
    if (entry.hasSeparator || entry.translation.trim()) {
      return `${entry.source}${SEPARATOR}${entry.translation}`;
    }
    return entry.source;
  });
  const blob = new Blob([lines.join("\r\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = state.fileName ? state.fileName.replace(/\.txt$/i, "") : "LabLocalizer";
  link.href = url;
  link.download = `${safeName}.edited.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("已导出编辑后的 txt。");
}

function openTermModal() {
  els.termForm.reset();
  state.editingTermId = null;
  els.termModalTitle.textContent = "创建术语";
  els.submitTermButton.textContent = "提交";
  els.termModal.hidden = false;
  setTimeout(() => els.termSource.focus(), 0);
}

function openEditTermModal(term) {
  state.editingTermId = term.id;
  els.termModalTitle.textContent = "编辑术语";
  els.submitTermButton.textContent = "保存";
  els.termType.value = term.type;
  els.termSource.value = term.source;
  els.termTranslation.value = term.translation;
  els.termDescription.value = term.description;
  els.termCaseSensitive.checked = term.caseSensitive;
  els.termModal.hidden = false;
  setTimeout(() => els.termSource.focus(), 0);
}

function closeTermModal() {
  els.termModal.hidden = true;
  state.editingTermId = null;
}

function createTerm(event) {
  event.preventDefault();
  const wasEditing = Boolean(state.editingTermId);
  const payload = {
    type: els.termType.value,
    source: els.termSource.value.trim(),
    translation: els.termTranslation.value.trim(),
    description: els.termDescription.value.trim(),
    caseSensitive: els.termCaseSensitive.checked
  };

  if (wasEditing) {
    const term = state.terms.find(item => item.id === state.editingTermId);
    if (term) {
      Object.assign(term, payload, { updatedAt: Date.now() });
    }
  } else {
    state.terms.push({
      id: makeId(state.terms.length + 1),
      ...payload,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  closeTermModal();
  renderTerms();
  showToast(wasEditing ? "术语已保存。" : "术语已创建。");
}

function renderTerms() {
  const terms = filteredTerms();
  els.termBody.textContent = "";
  els.termEmpty.hidden = terms.length > 0;

  const fragment = document.createDocumentFragment();
  for (const term of terms) {
    const row = document.createElement("tr");
    row.appendChild(checkCell(state.selectedTermIds.has(term.id), () => toggleTermSelection(term.id)));
    row.appendChild(textCell(term.type, "col-type"));
    row.appendChild(textCell(term.source, "text-cell"));
    row.appendChild(textCell(term.translation, "text-cell"));
    row.appendChild(textCell(term.description || "（无说明）", "text-cell"));
    row.appendChild(textCell(term.caseSensitive ? "是" : "否", "col-case"));

    const actions = document.createElement("td");
    actions.className = "col-actions";
    const edit = document.createElement("button");
    edit.className = "icon-button";
    edit.type = "button";
    edit.textContent = "✎";
    edit.title = "编辑";
    edit.addEventListener("click", () => openEditTermModal(term));

    const del = document.createElement("button");
    del.className = "icon-button";
    del.type = "button";
    del.textContent = "⌫";
    del.title = "删除";
    del.addEventListener("click", () => {
      state.terms = state.terms.filter(item => item.id !== term.id);
      renderTerms();
    });
    actions.appendChild(edit);
    actions.appendChild(del);
    row.appendChild(actions);
    fragment.appendChild(row);
  }

  els.termBody.appendChild(fragment);
  updateTermSelectAllState(terms);
  updateTermBulkMenu();
}

function updateTermBulkMenu() {
  const selectedCount = state.selectedTermIds.size;
  els.termBulkWrap.hidden = selectedCount === 0;
  els.termBulkButton.textContent = `已选 ${selectedCount} 项 ▾`;
  if (selectedCount === 0) {
    els.termBulkMenu.hidden = true;
  }
}

function handleTermBulkAction(event) {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.termBulkClear) {
    state.selectedTermIds.clear();
    els.termBulkMenu.hidden = true;
    renderTerms();
    return;
  }

  if (button.dataset.termBulkDelete) {
    openDeleteConfirmModal("terms", state.selectedTermIds.size);
    els.termBulkMenu.hidden = true;
  }
}

function toggleTermSelection(id) {
  if (state.selectedTermIds.has(id)) {
    state.selectedTermIds.delete(id);
  } else {
    state.selectedTermIds.add(id);
  }
  renderTerms();
}

function toggleAllVisibleTerms() {
  const terms = filteredTerms();
  const ids = terms.map(term => term.id);
  const allSelected = ids.length > 0 && ids.every(id => state.selectedTermIds.has(id));

  for (const id of ids) {
    if (allSelected) {
      state.selectedTermIds.delete(id);
    } else {
      state.selectedTermIds.add(id);
    }
  }

  renderTerms();
}

function updateTermSelectAllState(terms) {
  const ids = terms.map(term => term.id);
  const selectedCount = ids.filter(id => state.selectedTermIds.has(id)).length;
  els.termSelectAll.classList.toggle("selected", ids.length > 0 && selectedCount === ids.length);
  els.termSelectAll.classList.toggle("partial", selectedCount > 0 && selectedCount < ids.length);
}

function filteredTerms() {
  let terms = state.terms.filter(term => {
    if (!state.termSearch) return true;
    return term.type.toLowerCase().includes(state.termSearch)
      || term.source.toLowerCase().includes(state.termSearch)
      || term.translation.toLowerCase().includes(state.termSearch)
      || term.description.toLowerCase().includes(state.termSearch);
  });

  terms = [...terms].sort((a, b) => {
    if (state.termSort === "source") return a.source.localeCompare(b.source);
    if (state.termSort === "type") return a.type.localeCompare(b.type);
    return a.createdAt - b.createdAt;
  });

  return terms;
}

function handleGlossaryFilePick(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  GLOSSARY_IO.importGlossary(file)
    .then(imported => {
      state.terms = imported;
      state.selectedTermIds.clear();
      renderTerms();
      showToast(`已导入 ${imported.length} 条术语。`);
    })
    .catch(err => showToast(`导入失败：${err.message}`));
  els.glossaryFileInput.value = "";
}

function exportGlossary() {
  if (!state.terms.length) {
    showToast("当前没有可导出的术语。");
    return;
  }
  GLOSSARY_IO.exportGlossary(state.terms);
  showToast("术语表已导出为 glossary.json。");
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

const originalRenderTerms = renderTerms;
renderTerms = function() {
  originalRenderTerms();
  updateExportGlossaryButton();
  updateGithubActionButtons();
};

populateSettings();
renderEntries();
renderTerms();
