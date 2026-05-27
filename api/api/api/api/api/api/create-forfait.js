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

  try {
    const { email, prenom, nom, telephone, discipline, type, 
            creditTotal, prixTotal, prixPaye, setupIntentId, 
            secondPaymentAmount, stripePaymentId } = req.body;

    // Get or create client
    let client;
    const { data: existing } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .single();

    if (existing) {
      client = existing;
      // Update info if provided
      if (prenom || nom || telephone) {
        const { data: updated } = await supabase
          .from('clients')
          .update({ prenom, nom, telephone })
          .eq('id', existing.id)
          .select()
          .single();
        client = updated;
      }
    } else {
      const { data: created } = await supabase
        .from('clients')
        .insert([{ email, prenom, nom, telephone }])
        .select()
        .single();
      client = created;
    }

    // Determine 2nd payment trigger seance
    // forfait 5 -> trigger at seance 3
    // forfait 10 -> trigger at seance 6
    let secondPaymentTrigger = null;
    if (setupIntentId) {
      secondPaymentTrigger = creditTotal === 5 ? 3 : creditTotal === 10 ? 6 : null;
    }

    // Create forfait
    const { data: forfait } = await supabase
      .from('forfaits')
      .insert([{
        client_id: client.id,
        discipline,
        type,
        credits_total: creditTotal,
        credits_restants: creditTotal,
        prix_total: prixTotal,
        prix_paye: prixPaye,
        setup_intent_id: setupIntentId || null,
        second_payment_amount: secondPaymentAmount || null,
        second_payment_trigger: secondPaymentTrigger,
        second_payment_done: false,
        stripe_payment_id: stripePaymentId,
        statut: 'actif'
      }])
      .select()
      .single();

    return res.status(200).json({ success: true, clientId: client.id, forfaitId: forfait.id });

  } catch (err) {
    console.error('Create forfait error:', err);
    return res.status(500).json({ error: err.message });
  }
};
