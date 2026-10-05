# Razorpay Test Payment Setup — FreshCart

## 1. Get test credentials
1. Open the Razorpay Dashboard and enable **Test Mode**.
2. Generate a Test API Key ID and Test API Key Secret.
3. Copy `.env.example` to `.env`.
4. Put your test credentials in `.env`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_test_secret
PAYMENT_PORT=5000
```

Never commit `.env` to GitHub. The `.gitignore` already excludes it.

## 2. Install packages
From the project root in PowerShell:

```powershell
npm install
```

## 3. Start the payment backend
Open PowerShell window 1:

```powershell
npm run server
```

You should see:

```text
Payment server running on http://localhost:5000
```

Check it in a browser:

```text
http://localhost:5000/api/health
```

It should show `ok: true` and `razorpayConfigured: true`.

## 4. Start the frontend
Open PowerShell window 2 in the same project folder:

```powershell
npm run dev
```

Open the URL shown by Vite, normally:

```text
http://localhost:5173
```

## 5. Test the flow
1. Add products to Cart.
2. Click **Generate Bill**.
3. Click **Pay ₹...**.
4. Razorpay Test Checkout opens.
5. Complete a test payment using Razorpay's Test Mode credentials/details.
6. The bill changes from `UNPAID` to `PAID`.
7. The Razorpay Payment ID is stored in Bill History.
8. Use **Print Bill** to print the paid bill.

## Important
- This project uses Razorpay Test Mode. No real money is charged during test payments.
- Do not put `RAZORPAY_KEY_SECRET` in React code, Vite environment variables exposed to the client, or GitHub.
- Before production, move bill/payment persistence to a real database and verify payment status server-side/webhooks as part of the production checkout design.
