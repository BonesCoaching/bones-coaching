const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://bones-coaching.fr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { amount, mode, metadata } = req.body;

    if (mode === 'split') {
      // Paiement en 2 fois :
      // 1er versement débité immédiatement
      // 2ème versement = SetupIntent pour capture automatique à J+60 (ou manuellement)
      
      const firstAmount = Math.round(amount / 2);
      const secondAmount = amount - firstAmount;

      // Créer le PaymentIntent pour le 1er versement
      const paymentIntent = await stripe.paymentIntents.create({
        amount: firstAmount,
        currency: 'eur',
        capture_method: 'automatic',
        metadata: {
          ...metadata,
          mode: 'split_first',
          second_amount: secondAmount,
          total_amount: amount,
        },
      });

      // Créer un SetupIntent pour enregistrer la carte pour le 2ème versement
      const setupIntent = await stripe.setupIntents.create({
        usage: 'off_session',
        metadata: {
          ...metadata,
          mode: 'split_second',
          amount_to_capture: secondAmount,
          first_payment_intent: paymentIntent.id,
        },
      });

      return res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        setupClientSecret: setupIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        setupIntentId: setupIntent.id,
        firstAmount,
        secondAmount,
      });

    } else {
      // Paiement unique classique
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'eur',
        capture_method: 'automatic',
        metadata: {
          ...metadata,
          mode: 'full',
        },
      });

      return res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    }

  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message });
  }
};
