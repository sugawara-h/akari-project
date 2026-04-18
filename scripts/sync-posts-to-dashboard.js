const fs = require("fs");
const path = require("path");

const DEFAULT_POSTS_PATH = path.join(__dirname, "../output/posts/posts.md");
const DEFAULT_APP_PATH = path.join(__dirname, "../app/index.html");

function parsePostsMarkdown(markdown) {
  return markdown
    .split(/^---$/m)
    .map(block => block.trim())
    .map(block => {
      const match = block.match(/## 投稿(\d+)[\s\S]*?投稿タイプ：【([^】]+)】[\s\S]*?本文：\s*\n([\s\S]*)$/);
      if (!match) return null;
      return {
        id: Number(match[1]),
        type: match[2].trim(),
        status: "pending",
        scheduledTime: "",
        content: match[3].trim(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.id - b.id);
}

function escapeTemplateLiteral(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function serializePosts(posts) {
  const rows = posts.map(post => {
    return `  { id:${post.id}, type:'${post.type}', status:'${post.status}', scheduledTime:'${post.scheduledTime}', content:\`${escapeTemplateLiteral(post.content)}\` }`;
  });
  return `const posts = [\n${rows.join(",\n")}\n];`;
}

function syncPostsToDashboard({
  postsPath = DEFAULT_POSTS_PATH,
  appPath = DEFAULT_APP_PATH,
} = {}) {
  const markdown = fs.readFileSync(postsPath, "utf-8");
  const posts = parsePostsMarkdown(markdown);
  if (!posts.length) {
    throw new Error(`No posts found in ${postsPath}`);
  }

  const appHtml = fs.readFileSync(appPath, "utf-8");
  const nextPostsBlock = serializePosts(posts);
  const nextHtml = appHtml.replace(
    /const posts = \[[\s\S]*?\n\];\n\nconst simValues/,
    `${nextPostsBlock}\n\nconst simValues`,
  );

  if (nextHtml === appHtml) {
    throw new Error("Could not find the posts array in app/index.html");
  }

  fs.writeFileSync(appPath, nextHtml);
  return posts.length;
}

if (require.main === module) {
  const count = syncPostsToDashboard();
  console.log(`Synced ${count} posts to ${DEFAULT_APP_PATH}`);
}

module.exports = {
  parsePostsMarkdown,
  syncPostsToDashboard,
};
