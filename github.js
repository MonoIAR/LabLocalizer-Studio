function githubHeaders() {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${settings.githubToken}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
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
