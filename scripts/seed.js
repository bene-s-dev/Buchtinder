import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Fehler: SUPABASE_URL oder SUPABASE_KEY fehlen!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GENRE_QUERIES = {
  romantasy: 'subject:romantasy OR subject:fantasy romance',
  dark_romance: 'subject:dark romance',
  new_adult: 'subject:new adult OR subject:coming of age',
  fantasy: 'subject:fantasy',
  thriller: 'subject:thriller OR subject:krimi',
  scifi: 'subject:science fiction',
  romance: 'subject:romance',
  humor: 'subject:humor OR subject:satire',
  sachbuch: 'subject:nonfiction OR subject:biography',
  historisch: 'subject:historical fiction',
  jugend: 'subject:young adult',
  klassiker: 'subject:classics OR Klassiker der Weltliteratur'
};

async function seed() {
  for (const [genre, query] of Object.entries(GENRE_QUERIES)) {
    console.log(`Lade Bücher für Genre: ${genre}...`);
    let booksForGenre = [];

    for (const startIndex of [0, 40, 80]) {
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=40&startIndex=${startIndex}&langRestrict=de`;
      
      try {
        const res = await fetch(url);
        const data = await res.json();

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
