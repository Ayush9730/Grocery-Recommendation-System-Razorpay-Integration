const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');
const Razorpay = require('razorpay');

dotenv.config();

const app = express();

/* =========================
   CORS
========================= */

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

/* =========================
   SERVER CONFIG
========================= */

// Render provides PORT automatically.
// Local development falls back to 5000.
const PORT = process.env.PORT || process.env.PAYMENT_PORT || 5000;

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

/* =========================
   RAZORPAY CONFIG
========================= */

if (!keyId || !keySecret) {
  console.warn(
    'Razorpay keys are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the environment variables.'
  );
}

const razorpay =
  keyId && keySecret
    ? new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      })
    : null;

/* =========================
   HEALTH CHECK
========================= */

app.get('/', (_req, res) => {
  res.json({
    message: 'Grocery Recommendation System Payment API',
    status: 'running',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    razorpayConfigured: Boolean(razorpay),
  });
});

/* =========================
   CREATE RAZORPAY ORDER
========================= */

app.post('/api/create-order', async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(500).json({
        error: 'Razorpay is not configured on the server.',
      });
    }

    const amount = Number(req.body?.amount);

    const receipt = String(
      req.body?.receipt || `freshcart_${Date.now()}`
    ).slice(0, 40);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid payment amount.',
      });
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

    res.status(500).json({
      error:
        error?.error?.description ||
        error?.message ||
        'Unable to create Razorpay order.',
    });
  }
});

/* =========================
   VERIFY RAZORPAY PAYMENT
========================= */

app.post('/api/verify-payment', (req, res) => {
  try {
    if (!keySecret) {
      return res.status(500).json({
        error: 'Razorpay secret is not configured.',
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        error: 'Missing payment verification fields.',
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(razorpay_signature, 'utf8');

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(400).json({
        verified: false,
        error: 'Payment signature verification failed.',
      });
    }

    res.json({
      verified: true,
      message: 'Payment verified successfully.',
    });
  } catch (error) {
    console.error('Verify payment error:', error);

    res.status(500).json({
      error: 'Unable to verify payment.',
    });
  }
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Payment server running on port ${PORT}`);
});