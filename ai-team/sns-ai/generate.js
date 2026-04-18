const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");
const { syncPostsToDashboard } = require("../../scripts/sync-posts-to-dashboard");

const client = new Anthropic();

async function runSNSAgent() {
  console.log("📱 SNS運用AI 起動中...");

  const prompt = fs.readFileSync(path.join(__dirname, "prompt.md"), "utf-8");
  const concept = fs.readFileSync(path.join(__dirname, "../../concept/concept.md"), "utf-8");
  const research = fs.readFileSync(path.join(__dirname, "../../output/research-result.md"), "utf-8");

  const userMessage = `
以下のコンセプト設計図とリサーチ結果を参照して、Threads投稿を30本生成してください。

【コンセプト設計図】
${concept}

【リサーチ結果（バズ投稿分析）】
${research.slice(0, 6000)}

【生成指示】
- 共感投稿：8本
- 教育投稿：8本
- 参加型投稿：7本
- 興味づけ投稿：7本
- 合計30本を順番に出力すること
- 各投稿はシステムプロンプトの出力フォーマット通りに出力すること
- 刷り込みキーワード3つを30本全体で各8本以上使うこと
- 全投稿に必ず締めの問いかけ・CTAを入れること
`;

  const messages = [{ role: "user", content: userMessage }];
  let result = "";

  console.log("✍️  投稿を生成中...");

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      system: prompt,
      messages,
    });

    const textBlocks = response.content
      .filter(b => b.type === "text")
      .map(b => b.text);
    if (textBlocks.length) result += textBlocks.join("\n");

    if (response.stop_reason === "end_turn") {
      console.log("✅ 生成完了！");
      break;
    }

    if (response.stop_reason === "max_tokens") {
      console.log("⚠️  max_tokens に達しました。途中まで保存します。");
      break;
    }

    console.log(`⚠️  stop_reason: ${response.stop_reason}`);
    break;
  }

  if (!result) {
    console.error("❌ テキスト結果が取得できませんでした");
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const header = `# 月詠あかり Threads投稿 30本\n**生成日：${today}**\n\n---\n\n`;
  const outputPath = path.join(__dirname, "../../output/posts/posts.md");
  fs.writeFileSync(outputPath, header + result);
  const syncedCount = syncPostsToDashboard({
    postsPath: outputPath,
    appPath: path.join(__dirname, "../../app/index.html"),
  });

  console.log(`📄 保存しました: ${outputPath}`);
  console.log(`📊 ダッシュボードへ ${syncedCount} 本の投稿を反映しました`);
  console.log("\n--- 冒頭プレビュー ---");
  console.log(result.substring(0, 300) + "...");
}

runSNSAgent().catch(console.error);
