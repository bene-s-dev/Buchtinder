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

const GENRE_QUERIES = {
  romantasy: 'romantasy OR "fantasy romance" OR drachen OR magie liebesroman',
  dark_romance: '"dark romance" OR "mafia romance" OR "bad boy"',
  new_adult: '"new adult" OR "college romance" OR "große liebe"',
  fantasy: 'fantasy OR zauberer OR elfen OR "magische welt"',
  thriller: 'thriller OR krimi OR mord OR psychothriller OR ermittler',
  scifi: '"science fiction" OR weltall OR zukunft OR raumschiff',
  romance: 'liebesroman OR romance OR herzschmerz OR verliebt',
  humor: 'humor OR komödie OR lustig OR satire',
  sachbuch: 'sachbuch OR biografie OR geschichte OR ratgeber',
  historisch: '"historischer roman" OR jahrhundert OR kaiser OR mittelalter',
  jugend: 'jugendbuch OR jugendroman OR internat OR teenager',
  klassiker: 'klassiker OR "reclam" OR goethe OR schiller OR weltliteratur'
};
// Pause einlegen (Rate Limit / ToS Schutz)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function seed() {
  for (const [genre, query] of Object.entries(GENRE_QUERIES)) {
    console.log(`Lade Bücher für Genre: ${genre}...`);
    let booksForGenre = [];

    for (const startIndex of [0, 40, 80]) {
      const keyParam = GOOGLE_KEY ? `&key=${GOOGLE_KEY}` : '';
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=40&startIndex=${startIndex}&langRestrict=de${keyParam}`;
      
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'BuchKompass-Seeder/1.0' }
        });
        
        const data = await res.json();

        if (data.error) {
          console.error(`Google API Fehler bei ${genre}:`, data.error.message);
          break;
        }

        if (!data.items) continue;

        for (const item of data.items) {
          const info = item.volumeInfo || {};
          const title = info.title;
          const authors = info.authors ? info.authors.join(', ') : 'Unbekannt';
          const pubDate = info.publishedDate || '';
          const year = pubDate.length >= 4 && !isNaN(pubDate.slice(0, 4)) ? parseInt(pubDate.slice(0, 4)) : null;
          const pages = info.pageCount || null;
          const description = info.description || '';
          const coverUrl = info.imageLinks?.thumbnail || null;
          const isbns = info.industryIdentifiers || [];
          const isbn = isbns.length > 0 ? isbns[0].identifier : null;

          if (title && description && description.length > 60) {
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
          }
        }
      } catch (err) {
        console.error(`Fehler bei ${genre}:`, err.message);
      }

      // ToS-konforme Pause zwischen den Anfragen
      await delay(500);
    }

    if (booksForGenre.length > 0) {
      const { error } = await supabase.from('books').upsert(booksForGenre, { onConflict: 'isbn' });
      if (error) console.error(`Supabase Error (${genre}):`, error.message);
      else console.log(`-> ${booksForGenre.length} Bücher für '${genre}' gespeichert.`);
    }
  }
  console.log('✅ Import erfolgreich abgeschlossen!');
}

seed();
