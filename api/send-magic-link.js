module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, token, magicUrl } = req.body;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Bones Coaching <contact@bones-coaching.fr>',
        to: [email],
        subject: '🔐 Ton lien de connexion — Bones Coaching',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0a;color:#f5f3ee;padding:40px;border-radius:8px">
            <h2 style="color:#c8a96e;font-family:Georgia,serif;margin:0 0 16px">Bones Coaching</h2>
            <p style="color:#aaa;margin:0 0 24px">Clique sur ce bouton pour accéder à ton espace client :</p>
            <a href="${magicUrl}" style="display:inline-block;background:#c8a96e;color:#0a0a0a;font-weight:bold;padding:14px 28px;border-radius:6px;text-decoration:none;font-family:Arial,sans-serif">
              Accéder à mon espace →
            </a>
            <p style="color:#444;font-size:12px;margin-top:24px">Lien valable 30 minutes. Si tu n'as pas demandé ce lien, ignore cet email.</p>
          </div>
        `
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Resend error: ${err}`);
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Send magic link error:', err);
    return res.status(500).json({ error: err.message });
  }
};
