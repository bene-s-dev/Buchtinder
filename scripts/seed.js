const { createClient } = require('@supabase/supabase-js');
const rawBooks = require('../data/books.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Fehler: SUPABASE_URL oder SUPABASE_KEY fehlen!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

async function seed() {
  // 1. Duplikate anhand der ISBN filtern (behält immer das erste Buch mit dieser ISBN)
  const seenIsbns = new Set();
  const books = rawBooks.filter(book => {
    if (!book.isbn || seenIsbns.has(book.isbn)) {
      return false;
    }
    seenIsbns.add(book.isbn);
    return true;
  });

  console.log(`Starte Import von ${books.length} eindeutigen Büchern (von ${rawBooks.length} insgesamt)...`);

  // 2. Import in Supabase
  const { error } = await supabase
    .from('books')
    .upsert(books, { onConflict: 'isbn' });

  if (error) {
    console.error("Fehler beim Import:", error.message);
    process.exit(1);
  } else {
    console.log(`✅ ${books.length} Bücher erfolgreich in Supabase gespeichert!`);
    process.exit(0);
  }
}

seed();
