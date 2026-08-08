wie? const { createClient } = require('@supabase/supabase-js');
const books = require('../data/books.json');

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
  console.log(`Starte Import von ${books.length} Büchern aus data/books.json...`);

  const { data, error } = await supabase
    .from('books')
    .upsert(books, { onConflict: 'isbn' });

  if (error) {
    console.error("Fehler beim Import:", error.message);
  } else {
    console.log(`✅ ${books.length} Bücher erfolgreich in Supabase gespeichert!`);
  }
}

seed();
