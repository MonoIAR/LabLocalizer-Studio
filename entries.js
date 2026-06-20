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
  state.currentPage = 1;

  els.searchInput.value = "";
  els.translationFilter.value = "all";
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
    statusTouched: false
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
  els.totalCount.textContent = state.entries.length;
  els.visibleCount.textContent = currentPageIndexes().length;
  els.translatedCount.textContent = translated;
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
    row.appendChild(badgeCell(entry.translationStatus));
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
}

function createEntryDraft(entry) {
  return {
    id: entry.id,
    lineNumber: entry.lineNumber,
    source: entry.source,
    translation: entry.translation,
    hasSeparator: entry.hasSeparator,
    translationStatus: entry.translationStatus,
    statusTouched: entry.statusTouched
  };
}

function saveEntryDraft() {
  const entry = selectedEntry();
  if (!entry || !state.editDraft) return;

  entry.translation = state.editDraft.translation;
  entry.translationStatus = state.editDraft.translationStatus;
  entry.statusTouched = state.editDraft.statusTouched;
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
  if (!matchesTranslationFilter(entry)) {
    return false;
  }

  if (!state.search) return true;
  return String(entry.lineNumber).includes(state.search)
    || entry.source.toLowerCase().includes(state.search)
    || entry.translation.toLowerCase().includes(state.search)
    || entry.translationStatus.toLowerCase().includes(state.search);
}

function matchesTranslationFilter(entry) {
  if (state.translationFilter === "translated") return entry.translationStatus === "已翻译";
  if (state.translationFilter === "untranslated") return entry.translationStatus === "未翻译";
  if (state.translationFilter === "question") return entry.translationStatus === "有疑问";
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
