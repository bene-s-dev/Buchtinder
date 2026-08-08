export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const { prompt } = req.body;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Leider sind alle Bibliothekare im Urlaub (GEMINI_API_KEY fehlt in Vercel).' 
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const detail = data.error?.message || `Status Code ${response.status}`;
      return res.status(response.status).json({ 
        error: `Leider sind alle Bibliothekare im Urlaub (${detail}).` 
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ 
      error: `Leider sind alle Bibliothekare im Urlaub (${error.message || 'Verbindungsfehler'}).` 
    });
  }
}
