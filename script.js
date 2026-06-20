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


const originalRenderTerms = renderTerms;
renderTerms = function() {
  originalRenderTerms();
  updateExportGlossaryButton();
  updateGithubActionButtons();
};

populateSettings();
renderEntries();
renderTerms();
