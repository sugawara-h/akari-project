'use strict';

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const key = event.queryStringParameters?.key;

  if (!key || !/^[a-z0-9-]+$/.test(key)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid key' }) };
  }

  const siteID = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_TOKEN;

  if (!siteID || !token) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'NETLIFY_SITE_ID と NETLIFY_TOKEN の環境変数が未設定です' }),
    };
  }

  const store = getStore({ name: 'akari-data', siteID, token });

  if (event.httpMethod === 'GET') {
    const raw = await store.get(key);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: raw ?? 'null',
    };
  }

  if (event.httpMethod === 'POST') {
    const body = event.body || 'null';
    JSON.parse(body);
    await store.set(key, body);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
