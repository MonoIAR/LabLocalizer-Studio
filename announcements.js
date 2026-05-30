(function () {
  const container = document.querySelector("#announcementsPage .notice");
  if (!container) return;

  async function loadReadme() {
    try {
      const res = await fetch("./README.md", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      render(text);
    } catch (err) {
      container.innerHTML = `<h2>公告</h2><p class="danger-copy">无法加载 README.md：${escapeHtml(err.message)}</p>`;
    }
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render(md) {
    const html = md
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>")
      .replace(/\*\*\*(.*?)\*\*\*/gim, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/gim, "<em>$1</em>")
      .replace(/`([^`]+)`/gim, "<code>$1</code>")
      .replace(/^\- (.*$)/gim, "<ul><li>$1</li></ul>")
      .replace(/^\d+\. (.*$)/gim, "<ol><li>$1</li></ol>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n/gim, "<br>");

    container.innerHTML = `<div class="readme-content">${html}</div>`;
  }

  loadReadme();
})();
