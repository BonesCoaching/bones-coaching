const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://bones-coaching.fr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { setupIntentId, captureDate, amountCents, bookingId } = req.body;

    // Save to Supabase - cron job will pick this up on capture date
    const { data, error } = await supabase
      .from('split_payments')
      .insert([{
        setup_intent_id: setupIntentId,
        capture_date: captureDate.split('T')[0],
        amount_cents: amountCents,
        booking_id: bookingId || null,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: `2ème paiement de ${amountCents/100}€ programmé pour le ${captureDate.split('T')[0]}`,
    });

  } catch (err) {
    console.error('Schedule error:', err);
    return res.status(500).json({ error: err.message });
  }
};
