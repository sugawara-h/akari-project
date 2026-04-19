'use strict';

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const key = event.queryStringParameters?.key;

  if (!key || !/^[a-z0-9-]+$/.test(key)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid key' }) };
  }

  const store = getStore({ name: 'akari-data', consistency: 'strong' });

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
    JSON.parse(body); // validate JSON
    await store.set(key, body);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
