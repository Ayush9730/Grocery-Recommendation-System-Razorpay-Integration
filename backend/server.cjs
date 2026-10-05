const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');
const Razorpay = require('razorpay');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PAYMENT_PORT || 5000;
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.warn('Razorpay keys are not configured. Create a .env file from .env.example before testing payments.');
}

const razorpay = keyId && keySecret
  ? new Razorpay({ key_id: keyId, key_secret: keySecret })
  : null;

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, razorpayConfigured: Boolean(razorpay) });
});

app.post('/api/create-order', async (req, res) => {
  try {
    if (!razorpay) return res.status(500).json({ error: 'Razorpay is not configured on the server.' });

    const amount = Number(req.body?.amount);
    const receipt = String(req.body?.receipt || `freshcart_${Date.now()}`).slice(0, 40);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount.' });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt,
    });

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: error?.error?.description || 'Unable to create Razorpay order.' });
  }
});

app.post('/api/verify-payment', (req, res) => {
  try {
    if (!keySecret) return res.status(500).json({ error: 'Razorpay secret is not configured.' });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const valid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpay_signature),
    );

    if (!valid) return res.status(400).json({ verified: false, error: 'Payment signature verification failed.' });

    res.json({ verified: true });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Unable to verify payment.' });
  }
});

app.listen(PORT, () => {
  console.log(`Payment server running on http://localhost:${PORT}`);
});
