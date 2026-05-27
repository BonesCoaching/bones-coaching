const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://bones-coaching.fr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { setupIntentId } = req.body;

    // Récupérer le SetupIntent pour obtenir le paymentMethod
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    const paymentMethodId = setupIntent.payment_method;
    const meta = setupIntent.metadata;

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Aucun moyen de paiement trouvé' });
    }

    // Créer et confirmer le 2ème paiement automatiquement
    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseInt(meta.amount_to_capture),
      currency: 'eur',
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      metadata: {
        ...meta,
        mode: 'split_second_auto',
      },
    });

    return res.status(200).json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });

  } catch (err) {
    console.error('Capture error:', err);
    return res.status(500).json({ error: err.message });
  }
};
