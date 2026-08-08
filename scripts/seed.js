const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GOOGLE_KEY = process.env.GOOGLE_BOOKS_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Fehler: SUPABASE_URL oder SUPABASE_KEY fehlen!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket }
});

const GENRES = [
  { key: 'romantasy', terms: ['romantasy', 'fantasy romance', 'drachen romance'] },
  { key: 'dark_romance', terms: ['dark romance', 'mafia romance', 'bad boy romance'] },
  { key: 'new_adult', terms: ['new adult', 'college romance', 'liebesroman'] },
  { key: 'fantasy', terms: ['fantasy roman', 'high fantasy', 'magie roman'] },
  { key: 'thriller', terms: ['thriller', 'kriminalroman', 'psychothriller'] },
  { key: 'scifi', terms: ['science fiction', 'space opera', 'zukunft roman'] },
  { key: 'romance', terms: ['liebesroman', 'romantik roman', 'herzschmerz'] },
  { key: 'humor', terms: ['humor roman', 'komödie buch', 'satire roman'] },
  { key: 'sachbuch', terms: ['sachbuch', 'biografie', 'ratgeber'] },
  { key: 'historisch', terms: ['historischer roman', 'mittelalter roman'] },
  { key: 'jugend', terms: ['jugendbuch', 'jugendroman'] },
  { key: 'klassiker', terms: ['klassiker der weltliteratur', 'reclam klassiker'] }
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function seed() {
  const { data: existingData } = await supabase.from('books').select('isbn, title');
  const existingIsbns = new Set((existingData || []).map(b => b.isbn).filter(Boolean));
  const existingTitles = new Set((existingData || []).map(b => b.title ? b.title.toLowerCase().trim() : ''));

  for (const { key: genre, terms } of GENRES) {
    console.log(`Lade Bücher für Genre: ${genre}...`);
    let booksForGenre = [];

    for (const term of terms) {
      for (const startIndex of [0, 40]) {
        const keyParam = GOOGLE_KEY ? `&key=${GOOGLE_KEY}` : '';
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(term)}&langRestrict=de&maxResults=40&startIndex=${startIndex}${keyParam}`;

        try {
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
          });
          const data = await res.json();

          if (!data.items) continue;

          for (const item of data.items) {
            const info = item.volumeInfo || {};

            if (info.language && info.language !== 'de') continue;

            const title = info.title;
            const authors = info.authors ? info.authors.join(', ') : 'Unbekannt';
            const pubDate = info.publishedDate || '';
            const year = pubDate.length >= 4 && !isNaN(pubDate.slice(0, 4)) ? parseInt(pubDate.slice(0, 4)) : null;
            const pages = info.pageCount || null;
            const description = info.description || '';
            const coverUrl = info.imageLinks?.thumbnail || null;
            const isbns = info.industryIdentifiers || [];
            const isbn = isbns.length > 0 ? isbns[0].identifier : null;

            const normalizedTitle = title ? title.toLowerCase().trim() : '';

            if (isbn && existingIsbns.has(isbn)) continue;
            if (normalizedTitle && existingTitles.has(normalizedTitle)) continue;

            if (title && description && description.length > 40) {
              booksForGenre.push({
                title,
                author: authors,
                year,
                pages,
                genre,
                description: description.slice(0, 600),
                isbn,
                cover_url: coverUrl
              });

              if (isbn) existingIsbns.add(isbn);
              if (normalizedTitle) existingTitles.add(normalizedTitle);
            }
          }
        } catch (err) {
          console.error(`Fehler bei ${genre} (${term}):`, err.message);
        }

        await delay(250);
      }
    }

    if (booksForGenre.length > 0) {
      const { error } = await supabase.from('books').upsert(booksForGenre, { onConflict: 'isbn' });
      if (error) console.error(`Supabase Error (${genre}):`, error.message);
      else console.log(`-> ${booksForGenre.length} neue Bücher für '${genre}' gespeichert.`);
    } else {
      console.log(`-> Keine neuen Bücher für '${genre}' gefunden.`);
    }
  }
  console.log('✅ Import erfolgreich abgeschlossen!');
}

seed();
