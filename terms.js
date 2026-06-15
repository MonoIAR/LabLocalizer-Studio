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
