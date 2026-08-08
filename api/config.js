export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_KEY || '';

  return res.status(200).json({
    url: url,
    key: key
  });
}
