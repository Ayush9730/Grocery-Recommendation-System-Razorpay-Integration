import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ShoppingBasket,
  Sparkles,
  X,
  Plus,
  Minus,
  Clock,
  Brain,
  RotateCcw,
  Receipt,
  History,
  Printer,
  CreditCard,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { CATEGORIES, PRODUCTS, type Product } from "@/lib/catalog";

declare global {
  interface Window {
    Razorpay: any;
  }
}

import {
  CLUSTER,
  classifyUse,
  recommendForYou,
  recommendSimilar,
  segment,
  timeOfDayUse,
  userProfile,
  type Behaviour,
  type Recommendation,
} from "@/lib/recommender";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FreshCart — Smart Grocery Recommendations" },
      {
        name: "description",
        content:
          "Pick any product and get similar items by features, price, clustering and your daily habits.",
      },
      {
        property: "og:title",
        content: "FreshCart — Smart Grocery Recommendations",
      },
      {
        property: "og:description",
        content:
          "Similar products by features, price, clustering and your daily habits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const EMPTY: Behaviour = {
  views: {},
  carts: {},
  basketHistory: [],
};

const KEY = "freshcart-behaviour";
const BILLS_KEY = "freshcart-bills";

type BillItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  amount: number;
};

type Bill = {
  id: string;
  date: string;
  items: BillItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus?: "UNPAID" | "PAID";
  paymentId?: string;
  razorpayOrderId?: string;
};

const TIMES = [
  { label: "Morning", hour: 8 },
  { label: "Afternoon", hour: 13 },
  { label: "Evening", hour: 17 },
  { label: "Night", hour: 21 },
];

function Index() {
  const [b, setB] = useState<Behaviour>(EMPTY);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [selected, setSelected] = useState<Product | null>(null);
  const [cat, setCat] = useState<string>("All");
  const [hour, setHour] = useState(12);
  const [showCart, setShowCart] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [generatedBill, setGeneratedBill] = useState<Bill | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    setHour(new Date().getHours());

    try {
      const s = localStorage.getItem(KEY);
      if (s) setB(JSON.parse(s));

      const savedBills = localStorage.getItem(BILLS_KEY);
      if (savedBills) setBills(JSON.parse(savedBills));
    } catch {
      /* ignore */
    }
  }, []);

  const save = (nb: Behaviour) => {
    setB(nb);
    localStorage.setItem(KEY, JSON.stringify(nb));
  };

  const open = (p: Product) => {
    setSelected(p);

    save({
      ...b,
      views: {
        ...b.views,
        [p.id]: (b.views[p.id] || 0) + 1,
      },
    });
  };

  const addToCart = (p: Product) => {
    setCart((c) => ({
      ...c,
      [p.id]: (c[p.id] || 0) + 1,
    }));

    save({
      ...b,
      carts: {
        ...b.carts,
        [p.id]: (b.carts[p.id] || 0) + 1,
      },
    });
  };

  const changeQty = (id: number, d: number) =>
    setCart((c) => {
      const n = {
        ...c,
        [id]: (c[id] || 0) + d,
      };

      if ((n[id] ?? 0) <= 0) delete n[id];

      return n;
    });

  const generateBill = () => {
    const entries = Object.entries(cart);

    if (!entries.length) return;

    const items: BillItem[] = entries.map(([id, quantity]) => {
      const p = PRODUCTS[+id - 1]!;

      return {
        id: p.id,
        name: p.name,
        price: p.price,
        quantity,
        amount: p.price * quantity,
      };
    });

    const subtotal = items.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const tax = Math.round(subtotal * 0.05 * 100) / 100;

    const bill: Bill = {
      id: `BILL-${Date.now()}`,
      date: new Date().toLocaleString("en-IN"),
      items,
      subtotal,
      tax,
      total: subtotal + tax,
      paymentStatus: "UNPAID",
    };

    const updatedBills = [bill, ...bills];

    setBills(updatedBills);

    localStorage.setItem(
      BILLS_KEY,
      JSON.stringify(updatedBills)
    );

    setGeneratedBill(bill);

    const ids = entries.map(([id]) => Number(id));

    save({
      ...b,
      basketHistory: [...b.basketHistory, ids],
    });
  };

  const updateBill = (updatedBill: Bill) => {
    const updatedBills = bills.map((bill) =>
      bill.id === updatedBill.id ? updatedBill : bill
    );

    setBills(updatedBills);

    localStorage.setItem(
      BILLS_KEY,
      JSON.stringify(updatedBills)
    );

    setGeneratedBill(updatedBill);
  };

  const loadRazorpay = () =>
    new Promise<boolean>((resolve) => {
      if (window.Razorpay) return resolve(true);

      const script = document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });

  /*
   * Backend API URL
   *
   * Local development:
   * VITE_API_URL=http://localhost:5000
   *
   * Production/Vercel:
   * VITE_API_URL=https://YOUR-RENDER-BACKEND.onrender.com
   */
  const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000";

  const payBill = async (bill: Bill) => {
    if (paymentLoading || bill.paymentStatus === "PAID") return;

    setPaymentLoading(true);

    try {
      const loaded = await loadRazorpay();

      if (!loaded) {
        throw new Error(
          "Unable to load Razorpay Checkout. Check your internet connection."
        );
      }

      /*
       * Create Razorpay order
       */
      const orderResponse = await fetch(
        `${API_URL}/api/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: bill.total,
            receipt: bill.id,
          }),
        }
      );

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(
          orderData.error ||
            "Unable to create payment order."
        );
      }

      /*
       * Open Razorpay Checkout
       */
      const razorpay = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "FreshCart",
        description: `Payment for ${bill.id}`,
        order_id: orderData.id,

        /*
         * Verify payment on backend
         */
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyResponse = await fetch(
              `${API_URL}/api/verify-payment`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(response),
              }
            );

            const verifyData =
              await verifyResponse.json();

            if (
              !verifyResponse.ok ||
              !verifyData.verified
            ) {
              throw new Error(
                verifyData.error ||
                  "Payment verification failed."
              );
            }

            updateBill({
              ...bill,
              paymentStatus: "PAID",
              paymentId:
                response.razorpay_payment_id,
              razorpayOrderId:
                response.razorpay_order_id,
            });

            alert(
              "Payment successful! Your bill has been marked as PAID."
            );
          } catch (error) {
            alert(
              error instanceof Error
                ? error.message
                : "Payment verification failed."
            );
          }
        },

        modal: {
          ondismiss: () =>
            setPaymentLoading(false),
        },

        theme: {
          color: "#2f855a",
        },
      });

      razorpay.on(
        "payment.failed",
        (response: {
          error?: {
            description?: string;
          };
        }) => {
          alert(
            response.error?.description ||
              "Payment failed. Please try again."
          );

          setPaymentLoading(false);
        }
      );

      razorpay.open();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to start payment."
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const clearCartAfterBill = () => {
    setCart({});
  };

  const printBill = (bill: Bill) => {
    const rows = bill.items
      .map(
        (item) =>
          `<tr><td>${item.name}</td><td>${item.quantity}</td><td>₹${item.price}</td><td>₹${item.amount}</td></tr>`
      )
      .join("");

    const printWindow = window.open(
      "",
      "_blank",
      "width=700,height=800"
    );

    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${bill.id}</title>

          <style>
            body{
              font-family:Arial,sans-serif;
              padding:32px;
              color:#222
            }

            h1{
              text-align:center
            }

            .meta{
              margin-bottom:20px;
              color:#555
            }

            table{
              width:100%;
              border-collapse:collapse
            }

            th,td{
              padding:10px;
              border-bottom:1px solid #ddd;
              text-align:left
            }

            .total{
              text-align:right;
              margin-top:20px;
              font-size:18px;
              line-height:1.8
            }
          </style>
        </head>

        <body>
          <h1>FreshCart</h1>

          <div class="meta">
            <b>Bill:</b> ${bill.id}<br/>
            <b>Date:</b> ${bill.date}
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Amount</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="total">
            Subtotal: ₹${bill.subtotal.toFixed(2)}<br/>
            Tax (5%): ₹${bill.tax.toFixed(2)}<br/>
            <b>Total: ₹${bill.total.toFixed(2)}</b>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const visible =
    cat === "All"
      ? PRODUCTS
      : PRODUCTS.filter(
          (p) => p.category === cat
        );

  const forYou = useMemo(
    () => recommendForYou(b, hour),
    [b, hour]
  );

  const similar = useMemo(
    () =>
      selected
        ? recommendSimilar(
            selected,
            b,
            hour
          )
        : [],
    [selected, b, hour]
  );

  const profile = useMemo(
    () => userProfile(b),
    [b]
  );

  const cartCount = Object.values(cart).reduce(
    (a, n) => a + n,
    0
  );

  const cartTotal = Object.entries(cart).reduce(
    (s, [id, n]) =>
      s + PRODUCTS[+id - 1]!.price * n,
    0
  );

  const topCats = Object.entries(
    profile.categoryAffinity
  )
    .sort((a, c) => c[1] - a[1])
    .slice(0, 3);

  const nowUse = timeOfDayUse(hour);

  return (
    <div className="min-h-screen font-sans">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="font-display text-2xl font-bold text-primary">
            FreshCart
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              <History className="h-4 w-4" />

              Bills

              {bills.length > 0 && (
                <span className="rounded-full bg-secondary px-2 text-xs">
                  {bills.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowCart(true)}
              className="relative flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <ShoppingBasket className="h-4 w-4" />

              Cart

              {cartCount > 0 && (
                <span className="rounded-full bg-accent px-2 text-xs text-accent-foreground">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-20">
        <section className="bg-hero mt-6 rounded-3xl p-8 text-primary-foreground shadow-soft">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <p className="flex items-center gap-2 text-sm opacity-80">
                <Brain className="h-4 w-4" />
                Smart recommendations
              </p>

              <h2 className="mt-2 font-display text-4xl font-bold leading-tight">
                Pick a product. We'll find its best matches.
              </h2>

              <p className="mt-3 opacity-80">
                Uses product features, price, clustering,
                classification, your shopping habits and the
                time of day.
              </p>
            </div>

            <div className="rounded-2xl bg-primary-foreground/10 p-4 text-sm">
              <p className="mb-2 flex items-center gap-2 opacity-80">
                <Clock className="h-4 w-4" />
                Time of day
              </p>

              <div className="flex gap-1">
                {TIMES.map((t) => (
                  <button
                    key={t.label}
                    onClick={() =>
                      setHour(t.hour)
                    }
                    className={`rounded-full px-3 py-1 ${
                      timeOfDayUse(t.hour) ===
                        nowUse &&
                      Math.abs(t.hour - hour) < 4
                        ? "bg-accent text-accent-foreground"
                        : "bg-primary-foreground/10"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Stat
            label="Your top categories"
            value={
              topCats.length
                ? topCats
                    .map(([c]) => c)
                    .join(", ")
                : "Browse to teach me"
            }
          />

          <Stat
            label="Your usual spend per item"
            value={
              profile.avgPrice
                ? `₹${Math.round(
                    profile.avgPrice
                  )}`
                : "—"
            }
          />

          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Activity learned
              </p>

              <p className="font-semibold">
                {Object.keys(b.views).length} viewed ·{" "}
                {b.basketHistory.length} orders
              </p>
            </div>

            <button
              onClick={() => save(EMPTY)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
        </section>

        <section className="mt-10">
          <h3 className="flex items-center gap-2 font-display text-2xl font-bold">
            <Sparkles className="h-5 w-5 text-accent" />
            Recommended for you
          </h3>

          <p className="text-sm text-muted-foreground">
            Based on your habits and what people need for{" "}
            {nowUse === "home" ? "home" : nowUse} right now.
          </p>

          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {forYou.map((r) => (
              <MiniCard
                key={r.product.id}
                r={r}
                onOpen={open}
              />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap gap-2">
            {["All", ...CATEGORIES].map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                  cat === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-secondary"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {visible.map((p) => (
              <div
                key={p.id}
                className="group rounded-2xl border border-border bg-card p-3 transition hover:shadow-soft"
              >
                <button
                  onClick={() => open(p)}
                  className="block w-full text-left"
                >
                  <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      className="h-full w-full object-contain p-3 transition group-hover:scale-105"
                    />
                  </div>

                  <p className="mt-2 font-semibold">
                    {p.name}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {p.category} · {segment(p.price)}
                  </p>
                </button>

                <div className="mt-2 flex items-center justify-between">
                  <span className="font-display text-lg font-bold text-primary">
                    ₹{p.price}
                  </span>

                  <button
                    onClick={() => addToCart(p)}
                    aria-label={`Add ${p.name}`}
                    className="rounded-full bg-secondary p-2 text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {selected && (
        <Drawer onClose={() => setSelected(null)}>
          <div className="flex gap-4">
            <img
              src={selected.image}
              alt={selected.name}
              className="h-28 w-28 rounded-2xl bg-muted object-contain p-2"
            />

            <div>
              <h3 className="font-display text-3xl font-bold">
                {selected.name}
              </h3>

              <p className="font-display text-xl text-primary">
                ₹{selected.price}
              </p>

              <div className="mt-2 flex flex-wrap gap-1 text-xs">
                <Tag>{selected.category}</Tag>
                <Tag>{segment(selected.price)}</Tag>
                <Tag>
                  Cluster #
                  {(CLUSTER.get(selected.id) ?? 0) + 1}
                </Tag>
                <Tag>
                  Used for: {classifyUse(selected)}
                </Tag>

                {selected.healthy && (
                  <Tag>Healthy</Tag>
                )}

                {selected.sweet && (
                  <Tag>Sweet</Tag>
                )}
              </div>

              <button
                onClick={() =>
                  addToCart(selected)
                }
                className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Add to cart
              </button>
            </div>
          </div>

          <h4 className="mt-8 flex items-center gap-2 font-display text-xl font-bold">
            <Sparkles className="h-4 w-4 text-accent" />
            Similar products
          </h4>

          <p className="text-sm text-muted-foreground">
            Matched on features, price, cluster and your
            habits.
          </p>

          <div className="mt-4 space-y-3">
            {similar.map((r) => (
              <div
                key={r.product.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <button
                  onClick={() =>
                    open(r.product)
                  }
                >
                  <img
                    src={r.product.image}
                    alt={r.product.name}
                    className="h-16 w-16 rounded-xl bg-muted object-contain p-1"
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <button
                    onClick={() =>
                      open(r.product)
                    }
                    className="font-semibold hover:underline"
                  >
                    {r.product.name}
                  </button>

                  <p className="text-xs text-muted-foreground">
                    ₹{r.product.price} ·{" "}
                    {r.reasons.join(" · ") ||
                      "Similar features"}
                  </p>

                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(
                          100,
                          r.score * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <span className="text-sm font-bold text-primary">
                  {Math.round(r.score * 100)}%
                </span>

                <button
                  onClick={() =>
                    addToCart(r.product)
                  }
                  aria-label="Add"
                  className="rounded-full bg-secondary p-2"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </Drawer>
      )}

      {showCart && (
        <Drawer onClose={() => setShowCart(false)}>
          <h3 className="font-display text-3xl font-bold">
            Your cart
          </h3>

          {cartCount === 0 ? (
            <p className="mt-4 text-muted-foreground">
              Your cart is empty.
            </p>
          ) : (
            <>
              <div className="mt-4 space-y-3">
                {Object.entries(cart).map(
                  ([id, n]) => {
                    const p = PRODUCTS[+id - 1]!;

                    return (
                      <div
                        key={id}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                      >
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-12 w-12 object-contain"
                        />

                        <div className="flex-1">
                          <p className="font-semibold">
                            {p.name}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            ₹{p.price}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            changeQty(p.id, -1)
                          }
                          className="rounded-full bg-secondary p-1"
                        >
                          <Minus className="h-3 w-3" />
                        </button>

                        <span className="w-6 text-center">
                          {n}
                        </span>

                        <button
                          onClick={() =>
                            changeQty(p.id, 1)
                          }
                          className="rounded-full bg-secondary p-1"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  }
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />

                  <h4 className="font-display text-xl font-bold">
                    Bill Details
                  </h4>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Items</span>
                    <span>{cartCount}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>
                      ₹{cartTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Tax (5%)</span>
                    <span>
                      ₹{(cartTotal * 0.05).toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-between border-t border-border pt-3 text-lg font-bold">
                    <span>Total</span>

                    <span className="text-primary">
                      ₹{(cartTotal * 1.05).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={generateBill}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
                >
                  <Receipt className="h-4 w-4" />
                  Generate Bill
                </button>

                <p className="mt-2 text-center text-xs text-muted-foreground">
                  The generated bill is saved in Bill History.
                </p>
              </div>

              {generatedBill && (
                <div className="mt-5 rounded-2xl border border-primary/30 bg-secondary/30 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Generated successfully
                      </p>

                      <h4 className="font-display text-xl font-bold">
                        {generatedBill.id}
                      </h4>
                    </div>

                    <button
                      onClick={() =>
                        printBill(generatedBill)
                      }
                      className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    {generatedBill.items.map(
                      (item) => (
                        <div
                          key={item.id}
                          className="flex justify-between"
                        >
                          <span>
                            {item.name} ×{" "}
                            {item.quantity}
                          </span>

                          <span>
                            ₹{item.amount.toFixed(2)}
                          </span>
                        </div>
                      )
                    )}

                    <div className="border-t border-border pt-3 font-bold">
                      <div className="flex justify-between">
                        <span>Total</span>

                        <span>
                          ₹
                          {generatedBill.total.toFixed(
                            2
                          )}
                        </span>
                      </div>

                      <div className="mt-2 flex justify-between text-sm font-normal">
                        <span>Payment</span>

                        <span
                          className={
                            generatedBill.paymentStatus ===
                            "PAID"
                              ? "font-semibold text-green-600"
                              : "font-semibold text-amber-600"
                          }
                        >
                          {generatedBill.paymentStatus ??
                            "UNPAID"}
                        </span>
                      </div>

                      {generatedBill.paymentId && (
                        <p className="mt-2 break-all text-xs font-normal text-muted-foreground">
                          Payment ID:{" "}
                          {generatedBill.paymentId}
                        </p>
                      )}
                    </div>
                  </div>

                  {generatedBill.paymentStatus !==
                  "PAID" ? (
                    <button
                      onClick={() =>
                        payBill(generatedBill)
                      }
                      disabled={paymentLoading}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground disabled:opacity-60"
                    >
                      {paymentLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}

                      {paymentLoading
                        ? "Opening Payment..."
                        : `Pay ₹${generatedBill.total.toFixed(
                            2
                          )}`}
                    </button>
                  ) : (
                    <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Payment completed
                    </div>
                  )}

                  <button
                    onClick={clearCartAfterBill}
                    className="mt-3 w-full rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
                  >
                    Clear Cart
                  </button>
                </div>
              )}

              <p className="mt-2 text-xs text-muted-foreground">
                Orders teach the system which items you buy
                together.
              </p>
            </>
          )}
        </Drawer>
      )}

      {showHistory && (
        <Drawer onClose={() => setShowHistory(false)}>
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />

            <h3 className="font-display text-3xl font-bold">
              Bill History
            </h3>
          </div>

          {bills.length === 0 ? (
            <p className="mt-6 text-muted-foreground">
              No bills have been generated yet.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {bills.map((bill) => (
                <div
                  key={bill.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {bill.id}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {bill.date}
                      </p>
                    </div>

                    <span className="font-bold text-primary">
                      ₹{bill.total.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-sm">
                    {bill.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between"
                      >
                        <span>
                          {item.name} ×{" "}
                          {item.quantity}
                        </span>

                        <span>
                          ₹{item.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        bill.paymentStatus ===
                        "PAID"
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {bill.paymentStatus ??
                        "UNPAID"}
                    </span>

                    {bill.paymentStatus !==
                      "PAID" && (
                      <button
                        onClick={() =>
                          payBill(bill)
                        }
                        disabled={paymentLoading}
                        className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
                      >
                        <CreditCard className="h-4 w-4" />
                        Pay Now
                      </button>
                    )}

                    <button
                      onClick={() =>
                        printBill(bill)
                      }
                      className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
                    >
                      <Printer className="h-4 w-4" />
                      Print Bill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Drawer>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="font-semibold">{value}</p>
    </div>
  );
}

function Tag({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
      {children}
    </span>
  );
}

function MiniCard({
  r,
  onOpen,
}: {
  r: Recommendation;
  onOpen: (p: Product) => void;
}) {
  return (
    <button
      onClick={() => onOpen(r.product)}
      className="w-40 shrink-0 rounded-2xl border border-border bg-card p-3 text-left hover:shadow-soft"
    >
      <img
        src={r.product.image}
        alt={r.product.name}
        className="h-24 w-full object-contain"
      />

      <p className="mt-2 font-semibold">
        {r.product.name}
      </p>

      <p className="text-sm text-primary">
        ₹{r.product.price}
      </p>

      <p className="truncate text-xs text-muted-foreground">
        {r.reasons[0] || r.product.category}
      </p>
    </button>
  );
}

function Drawer({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-foreground/30"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-xl overflow-y-auto bg-background p-6 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="float-right rounded-full bg-muted p-2"
        >
          <X className="h-4 w-4" />
        </button>

        {children}
      </div>
    </div>
  );
}