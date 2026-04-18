const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");
const { syncResearchToDashboard } = require("../../scripts/sync-research-to-dashboard");

const client = new Anthropic();

async function runResearchAgent() {
  console.log("🔍 リサーチエージェント起動中...");
  const today = new Date().toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const prompt = fs.readFileSync(
    path.join(__dirname, "prompt.md"),
    "utf-8"
  );

  const concept = fs.readFileSync(
    path.join(__dirname, "../../concept/concept.md"),
    "utf-8"
  );

  const userMessage = `
以下のコンセプト設計図を参照して、Threads・Instagram・X（Twitter）で
占い・スピリチュアル系のバズ投稿をリサーチしてください。
特にThreadsは、公開投稿URL・反応数・投稿テーマを確認できた実データを優先してください。

【調査日】
${today}

【コンセプト設計図】
${concept}

【リサーチ指示】
1. Threadsの公開投稿を最優先で検索する
   - site:threads.net 占い
   - site:threads.net スピリチュアル
   - site:threads.net 夢占い
   - site:threads.net 開運
   - site:threads.net/t/ 占い
2. 取得できたThreads投稿を最低10件、可能なら15件、以下の表にまとめる
   - URL
   - アカウント名
   - 投稿日または確認日
   - いいね・返信・再投稿など確認できた反応数
   - 投稿テーマ
   - バズ根拠
3. 取得できない項目は推測せず「取得不可」と書く
4. 実測データをもとに、バズ投稿の共通パターンを5つの型に分類する
5. 30〜40代女性・お金・キャリアに刺さるキーワードを抽出する
6. 月詠あかり専用のバズ投稿テンプレートを型別に5パターン作成する
7. 即使えるThreads投稿を20本生成する

出力はMarkdown形式で、ファイルに保存できる形式にしてください。
必ず冒頭に「## 🧪 PART 0：Threads実測データ」を作り、取得した投稿サンプル表を入れてください。
  `;

  const messages = [{ role: "user", content: userMessage }];
  let result = "";

  // Webサーチを含むアgentic loop
  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
        }
      ],
      system: prompt,
      messages,
    });

    // テキストブロックを収集
    const textBlocks = response.content
      .filter(b => b.type === "text")
      .map(b => b.text);
    if (textBlocks.length) result += textBlocks.join("\n");

    // 完了
    if (response.stop_reason === "end_turn") {
      console.log("✅ リサーチ完了！");
      break;
    }

    // ツール使用 → メッセージに追加して継続
    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });

      const toolResults = response.content
        .filter(b => b.type === "tool_use")
        .map(b => {
          console.log(`🌐 検索中: "${b.input?.query || b.input?.q || JSON.stringify(b.input)}"`);
          return {
            type: "tool_result",
            tool_use_id: b.id,
            content: "",
          };
        });

      messages.push({ role: "user", content: toolResults });
    } else {
      // 予期しないstop_reason
      console.log(`⚠️ stop_reason: ${response.stop_reason}`);
      break;
    }
  }

  if (!result) {
    console.error("❌ テキスト結果が取得できませんでした");
    process.exit(1);
  }

  // ファイルに保存
  const outputPath = path.join(__dirname, "../../output/research-result.md");
  fs.writeFileSync(outputPath, result);
  const report = syncResearchToDashboard({
    researchPath: outputPath,
    appPath: path.join(__dirname, "../../app/index.html"),
  });

  console.log(`📄 結果を保存しました: ${outputPath}`);
  console.log(`📊 ダッシュボードへリサーチレポートを反映しました: ${report.title}`);
  console.log("\n--- リサーチ結果（冒頭） ---");
  console.log(result.substring(0, 500) + "...");
}

runResearchAgent().catch(console.error);
