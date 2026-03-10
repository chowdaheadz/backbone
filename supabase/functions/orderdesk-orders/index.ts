const STORE_ID = '14736';
const API_KEY = 'zdD7Mac5fnaKtsekLaSdm5XQaqos5rDZH7fenKuAeHTmKB56VW';
const FOLDER_ID = '85961';

Deno.serve(async () => {
  try {
    const res = await fetch(
      `https://app.orderdesk.me/api/v2/orders?folder_id=${FOLDER_ID}&limit=1`,
      {
        headers: {
          'ORDERDESK-STORE-ID': STORE_ID,
          'ORDERDESK-API-KEY': API_KEY,
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: text }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ total_count: data.total_count ?? 0 }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
