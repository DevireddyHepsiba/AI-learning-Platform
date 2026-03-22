import dotenv from 'dotenv';
dotenv.config();

const token = process.env.TOKEN;
if (!token) {
  console.error('No TOKEN in .env');
  process.exit(1);
}

const body = { documentId: '696664e5f67efd758e2b6fdc', count: 3 };

try {
  console.log('GET /api/ai (sanity)');
  const root = await fetch('http://https://ai-learning-platform-c2jg.onrender.com/api/ai');
  console.log('GET /api/ai status', root.status);
  const authRoot = await fetch('http://https://ai-learning-platform-c2jg.onrender.com/api/auth');
  console.log('GET /api/auth status', authRoot.status);

  console.log('\nNow GET /api/flashcards (protected)');
  const f = await fetch('http://https://ai-learning-platform-c2jg.onrender.com/api/flashcards', { headers: { 'Authorization': `Bearer ${token}` } });
  console.log('/api/flashcards status', f.status);
  console.log('/api/flashcards body', await f.text());

  const res = await fetch('http://https://ai-learning-platform-c2jg.onrender.com/api/ai/generate-flashcards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body),
    // no timeout option for node fetch
  });

  console.log('Status:', res.status);
  const text = await res.text();
  try {
    console.log('Body:', JSON.parse(text));
  } catch (e) {
    console.log('Body (raw):', text);
  }
  console.log('\nNow GET /api/ai/chat-history/:documentId');
  const hist = await fetch('http://https://ai-learning-platform-c2jg.onrender.com/api/ai/chat-history/696664e5f67efd758e2b6fdc', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('chat-history status', hist.status);
  console.log('chat-history body', await hist.text());
  console.log('\nNow POST /api/ai/chat (protected)');
  const chatResp = await fetch('http://https://ai-learning-platform-c2jg.onrender.com/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ documentId: '696664e5f67efd758e2b6fdc', message: 'Hello' })
  });
  console.log('/api/ai/chat status', chatResp.status);
  console.log('/api/ai/chat body', await chatResp.text());
} catch (err) {
  console.error('Request error:', err.message);
  process.exit(1);
}
