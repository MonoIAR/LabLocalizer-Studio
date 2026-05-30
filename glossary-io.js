const GLOSSARY_IO = {
  exportGlossary(terms) {
    const payload = terms.map(term => ({
      type: term.type,
      source: term.source,
      translation: term.translation,
      description: term.description,
      caseSensitive: term.caseSensitive
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "glossary.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importGlossary(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const raw = String(reader.result || "");
          const data = JSON.parse(raw);
          const terms = Array.isArray(data) ? data : Array.isArray(data.terms) ? data.terms : null;
          if (!terms) {
            throw new Error("未找到术语数组（期望根数组或 data.terms）。");
          }
          const now = Date.now();
          const imported = terms.map((item, index) => ({
            id: `term_${now}_${index}`,
            type: item.type || "名词",
            source: String(item.source || "").trim(),
            translation: String(item.translation || "").trim(),
            description: String(item.description || "").trim(),
            caseSensitive: Boolean(item.caseSensitive),
            createdAt: now,
            updatedAt: now
          })).filter(term => term.source.length > 0);
          resolve(imported);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("读取文件失败。"));
      reader.readAsText(file, "UTF-8");
    });
  }
};
