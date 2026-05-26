const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Cron job - runs every day at 9am via vercel.json crons
// Captures all 2nd payments due today or earlier
module.exports = async (req, res) => {
  // Security check - only allow Vercel cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // Get all pending 2nd payments due today or earlier
    const { data: pending, error } = await supabase
      .from('split_payments')
      .select('*')
      .eq('status', 'pending')
      .lte('capture_date', today);

    if (error) throw error;

    const results = [];
    for (const payment of pending || []) {
      try {
        // Retrieve setup intent to get payment method
        const setupIntent = await stripe.setupIntents.retrieve(payment.setup_intent_id);
        
        if (setupIntent.payment_method) {
          // Charge the 2nd payment
          const pi = await stripe.paymentIntents.create({
            amount: payment.amount_cents,
            currency: 'eur',
            payment_method: setupIntent.payment_method,
            confirm: true,
            off_session: true,
            metadata: { mode: 'split_second_auto', booking_id: payment.booking_id }
          });

          // Mark as captured
          await supabase
            .from('split_payments')
            .update({ status: 'captured', stripe_payment_id: pi.id, captured_at: new Date().toISOString() })
            .eq('id', payment.id);

          results.push({ id: payment.id, status: 'captured', pi: pi.id });
        }
      } catch (err) {
        await supabase
          .from('split_payments')
          .update({ status: 'failed', error: err.message })
          .eq('id', payment.id);
        results.push({ id: payment.id, status: 'failed', error: err.message });
      }
    }

    return res.status(200).json({ processed: results.length, results });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
