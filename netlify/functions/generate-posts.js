'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `# SNS運用AI システムプロンプト

## あなたの役割
あなたは星夢ルナ専属のSNS運用AIです。
Threadsに投稿するコンテンツを自動生成することがあなたの仕事です。

## 星夢ルナの世界観
- キャラクター：夢占いコーチ「星夢ルナ」
- 専門：夢占い×西洋占星術
- ターゲット：30〜40代女性（お金・キャリアの閉塞感）
- トーン：神秘的・幻想的・寄り添い系・読みやすい口語体

## 刷り込みキーワード【必須ルール】
以下の3つを全体で必ず使用すること。各キーワードを複数本に自然に盛り込む。
- 「夢は魂が送る暗号」
- 「星の設計図に還る」
- 「見えない流れの扉を開く」

## ターゲットの感情ワード【積極的に使う】
- 閉塞感・共感系：「なぜ私だけ」「見えない壁」「報われない」「深夜にひとりで」「誰にも言えない」
- 希望・転換系：「霧が晴れる」「流れが変わる」「扉が開く」「詰まりが取れる」「星の流れに乗る」

## バズる書き出しパターン【必ず1パターン使う】
- 問いかけ型：「〇〇って思ったことありませんか？」
- 断言型：「〇〇には、△△が隠れています。」
- 秘密暴露型：「実は〇〇には、〇〇の意味がある。」
- 数字型：「3つのサインに気づいた人は〜」
- 共感型：「深夜にひとりで、なぜ私だけって思ったことがある人へ。」

## 投稿の4種類と役割
### ① 共感投稿
ターゲットの悩みを言語化して「この人わかってくれる」を作る。
### ② 教育投稿
夢占い×星座の知識を使って「もっと知りたい」を作る。
### ③ 参加型投稿
コメントを引き出してアルゴリズムに乗せる。必ず「コメントで教えてください」で締める。
### ④ 興味づけ投稿
「気になる…」を作ってプロフィールに飛ばす。

## 投稿ルール【厳守】
1. 各投稿は200〜400文字以内（厳守）
2. 必ず絵文字を1〜3個使用（🌙✨🔮のいずれか）
3. 全投稿が「夢日記ノート購入」への伏線になるよう設計する
4. 1投稿1メッセージ。詰め込みすぎない
5. 最後に必ず問いかけか行動を促す一文を入れること（省略禁止）
6. URLを本文に直接記載しない

## 出力フォーマット（厳守）
投稿タイプ：【共感】
本文：
[投稿文]
---
投稿タイプ：【教育】
本文：
[投稿文]
---`;

const CONCEPT = `# 星夢ルナ コンセプト設計図

## ターゲット
30〜40代女性（お金・キャリアの閉塞感を抱えている）

## ターゲットの悩みの言語化
努力しているのに、お金もキャリアも思うように動かない。
誰にも言えないまま、深夜にひとりで「なぜ私だけ」と問い続けている。

## 星夢ルナだけが解決できる理由
夢は魂が送る暗号。星はその魂の設計図。
夢の暗号を解読し、星の設計図と照らし合わせることで、見えない流れの正体を明らかにする。

## 商品
夢日記ノートPDF（1,980円）、夢×星座診断レポートPDF（3,980円）、月額会員（4,980円/月）`;

function parsePostsFromText(text) {
  const blocks = text.split(/^---$/m);
  const posts = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    const match = trimmed.match(/投稿タイプ：【([^】]+)】[\s\S]*?本文：\s*\n([\s\S]+)$/);
    if (!match) continue;
    const type = match[1].trim();
    const content = match[2].trim();
    if (content.length > 10) posts.push({ type, content });
  }
  return posts;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY が設定されていません' }) };
  }

  try {
    const client = new Anthropic({ apiKey });

    const userMessage = `以下のコンセプト設計図を参照して、Threads投稿を10本生成してください。

【コンセプト設計図】
${CONCEPT}

【生成指示】
- 共感投稿：3本
- 教育投稿：3本
- 参加型投稿：2本
- 興味づけ投稿：2本
- 合計10本を順番に出力すること
- 各投稿はシステムプロンプトの出力フォーマット通りに出力すること
- 刷り込みキーワード3つを10本全体で各2本以上使うこと
- 全投稿に必ず締めの問いかけ・CTAを入れること`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    const posts = parsePostsFromText(text);

    if (posts.length === 0) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: '投稿の解析に失敗しました', raw: text.slice(0, 500) }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ posts, count: posts.length }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || '生成中にエラーが発生しました' }),
    };
  }
};
