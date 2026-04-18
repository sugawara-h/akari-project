const fs = require("fs");
const path = require("path");

const DEFAULT_RESEARCH_PATH = path.join(__dirname, "../output/research-result.md");
const DEFAULT_APP_PATH = path.join(__dirname, "../app/index.html");

function cleanResearchMarkdown(markdown) {
  return markdown
    .replace(/^```markdown\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();
}

function extractSection(markdown, heading, nextHeadingPattern = "\\n## |\\n### |\\n---\\n|$") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`${escaped}[\\s\\S]*?(?=${nextHeadingPattern})`));
  return match ? match[0].trim() : "";
}

function extractBullets(text, limit = 5) {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.startsWith("- ") || line.startsWith("・"))
    .map(line => line.replace(/^[-・]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function splitMarkdownRow(row) {
  return row
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map(cell => cell.trim());
}

function extractThreadsSamples(markdown) {
  const section = extractSection(markdown, "## 🧪 PART 0：Threads実測データ", "\\n## |$");
  if (!section) return [];

  const rows = section
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.startsWith("|") && line.endsWith("|"))
    .filter(line => !/^\|\s*-+/.test(line));

  if (rows.length < 2) return [];

  const header = splitMarkdownRow(rows[0]);
  return rows.slice(1).map(row => {
    const cells = splitMarkdownRow(row);
    const get = label => cells[header.findIndex(h => h.includes(label))] || "";
    return {
      no: get("No"),
      url: get("URL"),
      account: get("アカウント"),
      date: get("投稿日") || get("確認日"),
      engagement: get("反応数"),
      theme: get("投稿テーマ"),
      reason: get("バズ根拠"),
    };
  }).filter(item => item.url || item.account || item.theme);
}

function parseResearchReport(markdown) {
  const clean = cleanResearchMarkdown(markdown);
  const titleMatch = clean.match(/^#\s+(.+)$/m);
  const createdMatch = clean.match(/\*\*作成日：([^*]+)\*\*/);
  const platformSection = extractSection(clean, "### 1-1. プラットフォーム別 ターゲット接触戦略");
  const patternSection = extractSection(clean, "### 1-2. スピリチュアル系バズ投稿の共通パターン分析");
  const typesSection = extractSection(clean, "## 📋 PART 2：バズる要素の5分類", "\\n## |$");
  const keywordsSection = extractSection(clean, "## 🔑 PART 3：キーワード分析", "\\n## |$");
  const threadsSamples = extractThreadsSamples(clean);

  const typeMatches = [...typesSection.matchAll(/### 型[①-⑤]：(.+?)\n\*\*特徴：\*\* (.+?)\n\*\*エンゲージ：\*\* (.+?)\n\*\*LINE誘導適性：\*\* (.+?)(?:\n|$)/g)];
  const buzzTypes = typeMatches.map(match => ({
    name: match[1].trim(),
    feature: match[2].trim(),
    engagement: match[3].trim(),
    lineFit: match[4].trim(),
  }));

  const algorithm = extractBullets(patternSection, 5);
  const keywordMatch = keywordsSection.match(/【閉塞感・共感系】\n(.+?)\n\n【希望・転換系】\n(.+?)\n\n【神秘・世界観系】\n(.+?)\n/s);
  const keywords = keywordMatch ? {
    empathy: keywordMatch[1].split("/").map(v => v.trim()).filter(Boolean).slice(0, 8),
    hope: keywordMatch[2].split("/").map(v => v.trim()).filter(Boolean).slice(0, 8),
    worldview: keywordMatch[3].split("/").map(v => v.trim()).filter(Boolean).slice(0, 8),
  } : {
    empathy: ["なぜ私だけ", "見えない壁", "報われない", "深夜にひとりで"],
    hope: ["霧が晴れる", "流れが変わる", "扉が開く"],
    worldview: ["魂の暗号", "夢のメッセージ", "星の設計図"],
  };

  return {
    title: titleMatch ? titleMatch[1].trim() : "月詠あかり SNSバズ投稿 完全戦略マニュアル",
    createdAt: createdMatch ? createdMatch[1].trim() : "",
    sourcePath: "output/research-result.md",
    rawMarkdown: clean,
    summary: threadsSamples.length
      ? `Threads実測サンプル${threadsSamples.length}件をもとに、共感・診断・秘密暴露・予言・ビフォーアフターの5型でLINE誘導まで設計するSNS戦略レポート。`
      : "Threadsを最優先に、共感・診断・秘密暴露・予言・ビフォーアフターの5型でLINE誘導まで設計するSNS戦略レポート。",
    threadsSamples,
    platformPriority: [
      { name: "Threads", priority: "最優先", purpose: "認知拡大・世界観発信" },
      { name: "Instagram", priority: "第2優先", purpose: "世界観統一・保存率UP・LINE誘導" },
      { name: "X（Twitter）", priority: "第3優先", purpose: "拡散・短文共感・今日の運勢" },
    ],
    buzzTypes,
    algorithm,
    keywords,
    actionItems: [
      "Threadsは質問フックとコメント誘発を優先する",
      "本文URL直貼りを避け、リンクはコメント欄へ回す",
      "夢日記ノートへの導線は共感投稿と診断型投稿から作る",
      "投稿後15分の初速を意識して運用する",
    ],
  };
}

function escapeForScript(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function syncResearchToDashboard({
  researchPath = DEFAULT_RESEARCH_PATH,
  appPath = DEFAULT_APP_PATH,
} = {}) {
  const markdown = fs.readFileSync(researchPath, "utf-8");
  const report = parseResearchReport(markdown);
  const appHtml = fs.readFileSync(appPath, "utf-8");
  const reportBlock = `const researchReport = ${escapeForScript(report)};`;
  const nextHtml = appHtml.replace(
    /const researchReport = [\s\S]*?;\n\nconst products/,
    `${reportBlock}\n\nconst products`,
  );

  if (nextHtml === appHtml) {
    throw new Error("Could not find the researchReport block in app/index.html");
  }

  fs.writeFileSync(appPath, nextHtml);
  return report;
}

if (require.main === module) {
  const report = syncResearchToDashboard();
  console.log(`Synced research report: ${report.title}`);
}

module.exports = {
  parseResearchReport,
  syncResearchToDashboard,
};
