const fs = require('fs');

const posts = fs.readFileSync('./output/posts/posts.md', 'utf-8');
const research = fs.readFileSync('./output/research-result.md', 'utf-8');

// 投稿を1本ずつ分割
const postBlocks = posts.split('---').map(b => b.trim()).filter(b => b.includes('投稿タイプ：'));
const total = postBlocks.length;

console.log(`\n📊 投稿反映チェックレポート`);
console.log(`${'='.repeat(50)}`);
console.log(`対象投稿数: ${total}本\n`);

// ① 刷り込みキーワード
const brandKw = [
  '夢は魂が送る暗号',
  '星の設計図に還る',
  '見えない流れの扉を開く',
];
console.log('【① 刷り込みキーワード反映率】');
brandKw.forEach(kw => {
  const hit = postBlocks.filter(b => b.includes(kw)).length;
  const bar = '■'.repeat(hit) + '□'.repeat(total - hit);
  console.log(`  「${kw}」: ${hit}/${total}本  ${bar}`);
});

// ② 感情ワード（リサーチ抽出）
const emotionKw = ['なぜ私だけ', '見えない壁', '報われない', '深夜', '誰にも言えない', '閉塞感'];
console.log('\n【② 感情ワード使用状況】');
emotionKw.forEach(kw => {
  const hit = postBlocks.filter(b => b.includes(kw)).length;
  console.log(`  「${kw}」: ${hit}本`);
});

// ③ 書き出しフック型
console.log('\n【③ 書き出しフックの型】');
const hooks = {
  '問いかけ型':    postBlocks.filter(b => /^(最近|あなた|もし|繰り返し|ひとつ|夢日記|今の|「これ)/.test(b.replace(/.*本文：\n/s,'').trim())).length,
  '断言型':        postBlocks.filter(b => /^(夢は|お金|キャリア|新月|牡牛|「魂の|夢に「|2週間)/.test(b.replace(/.*本文：\n/s,'').trim())).length,
  '共感・深夜型':  postBlocks.filter(b => /^(深夜|「努力|4月|「なぜ|お金の|「なんとなく|「私には)/.test(b.replace(/.*本文：\n/s,'').trim())).length,
};
Object.entries(hooks).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}本`);
});

// ④ 投稿タイプ分布
console.log('\n【④ 投稿タイプ分布】');
const types = ['共感', '教育', '参加型', '興味づけ'];
types.forEach(t => {
  const hit = postBlocks.filter(b => b.includes(`【${t}】`)).length;
  const bar = '■'.repeat(hit);
  console.log(`  ${t}: ${hit}本  ${bar}`);
});

// ⑤ 締めの問いかけ・行動促進
console.log('\n【⑤ 締め文（問いかけ/行動促進）の有無】');
const withCTA  = postBlocks.filter(b => /[？?]\s*$|コメント|プロフィール|LINE|保存|教えてください/.test(b)).length;
const withoutCTA = total - withCTA;
console.log(`  あり: ${withCTA}本 ／ なし: ${withoutCTA}本`);

// ⑥ 絵文字使用
console.log('\n【⑥ 絵文字（🌙✨🔮）使用】');
const emoji = { '🌙': 0, '✨': 0, '🔮': 0 };
postBlocks.forEach(b => {
  Object.keys(emoji).forEach(e => { if (b.includes(e)) emoji[e]++; });
});
Object.entries(emoji).forEach(([e, n]) => console.log(`  ${e}: ${n}本`));

// ⑦ URLが本文に入っていないか
console.log('\n【⑦ URLの本文混入チェック】');
const urlLeaks = postBlocks.filter(b => /https?:\/\//.test(b)).length;
console.log(urlLeaks === 0 ? '  ✅ 本文内にURLなし（問題なし）' : `  ⚠️ ${urlLeaks}本にURLが含まれています`);

// ⑧ 文字数チェック（200〜400字）
console.log('\n【⑧ 文字数チェック（200〜400字）】');
let ok = 0, short = 0, long = 0;
postBlocks.forEach(b => {
  const body = b.replace(/投稿タイプ：.*\n本文：\n/s, '').trim();
  const len = body.length;
  if (len < 200) short++;
  else if (len > 400) long++;
  else ok++;
});
console.log(`  ✅ 範囲内 (200-400字): ${ok}本`);
console.log(`  ⚠️ 短すぎ (<200字):    ${short}本`);
console.log(`  ⚠️ 長すぎ (>400字):    ${long}本`);

console.log(`\n${'='.repeat(50)}\n`);
