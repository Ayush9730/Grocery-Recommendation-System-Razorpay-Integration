import { CATEGORIES, PRODUCTS, type MealTime, type Product } from "./catalog";

/* ---------- Feature engineering ---------- */
const MEALS: MealTime[] = ["breakfast", "snack", "meal", "home"];
const prices = PRODUCTS.map((p) => p.price);
const logMin = Math.log(Math.min(...prices));
const logMax = Math.log(Math.max(...prices));
const normPrice = (p: number) => (Math.log(p) - logMin) / (logMax - logMin);

export function features(p: Product): number[] {
  return [
    normPrice(p.price) * 2, // price weighted strongly
    ...CATEGORIES.map((c) => (c === p.category ? 1.6 : 0)),
    p.healthy ? 0.7 : 0,
    p.sweet ? 0.7 : 0,
    p.readyToEat ? 0.5 : 0,
    p.dailyEssential ? 0.5 : 0,
    p.perishable ? 0.4 : 0,
    ...MEALS.map((m) => (m === p.mealTime ? 0.6 : 0)),
  ];
}

const VECTORS = new Map(PRODUCTS.map((p) => [p.id, features(p)]));
const dist = (a: number[], b: number[]) =>
  Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]!) ** 2, 0));
const cosine = (a: number[], b: number[]) => {
  let d = 0, na = 0, nb = 0;
  a.forEach((v, i) => { d += v * b[i]!; na += v * v; nb += b[i]! * b[i]!; });
  return d / (Math.sqrt(na * nb) || 1);
};

/* ---------- Clustering: K-Means (k-means++ init, deterministic seed) ---------- */
function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

export const K = 14;
function kmeans(k: number) {
  const rand = seeded(42);
  const pts = PRODUCTS.map((p) => VECTORS.get(p.id)!);
  const centroids: number[][] = [pts[Math.floor(rand() * pts.length)]!];
  while (centroids.length < k) {
    const d2 = pts.map((p) => Math.min(...centroids.map((c) => dist(p, c) ** 2)));
    let r = rand() * d2.reduce((a, b) => a + b, 0);
    let idx = 0;
    while ((r -= d2[idx]!) > 0) idx++;
    centroids.push(pts[idx]!);
  }
  let assign = new Array(pts.length).fill(0);
  for (let iter = 0; iter < 50; iter++) {
    const next = pts.map((p) => {
      let best = 0;
      centroids.forEach((c, i) => { if (dist(p, c) < dist(p, centroids[best]!)) best = i; });
      return best;
    });
    const changed = next.some((v, i) => v !== assign[i]);
    assign = next;
    centroids.forEach((_, ci) => {
      const members = pts.filter((_, i) => assign[i] === ci);
      if (members.length)
        centroids[ci] = members[0]!.map((_, d) => members.reduce((s, m) => s + m[d]!, 0) / members.length);
    });
    if (!changed) break;
  }
  return new Map(PRODUCTS.map((p, i) => [p.id, assign[i] as number] as const));
}
export const CLUSTER = kmeans(K);

/* ---------- Classification: price segment (tertiles) + kNN purpose classifier ---------- */
const sorted = [...prices].sort((a, b) => a - b);
const q1 = sorted[Math.floor(sorted.length / 3)]!;
const q2 = sorted[Math.floor((2 * sorted.length) / 3)]!;
export type Segment = "Budget" | "Mid-range" | "Premium";
export const segment = (price: number): Segment =>
  price <= q1 ? "Budget" : price <= q2 ? "Mid-range" : "Premium";

/** kNN classifier: predicts the "daily-life use" of a product from its nearest neighbours' meal time. */
export function classifyUse(p: Product, k = 5): MealTime {
  const v = VECTORS.get(p.id)!;
  const neighbours = PRODUCTS.filter((o) => o.id !== p.id)
    .map((o) => ({ o, d: dist(v, VECTORS.get(o.id)!) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k);
  const votes: Record<string, number> = {};
  neighbours.forEach(({ o, d }) => (votes[o.mealTime] = (votes[o.mealTime] || 0) + 1 / (d + 0.1)));
  return Object.entries(votes).sort((a, b) => b[1] - a[1])[0]![0] as MealTime;
}

/* ---------- Daily-life context ---------- */
export function timeOfDayUse(hour: number): MealTime {
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "meal";
  if (hour >= 15 && hour < 19) return "snack";
  return "meal";
}

/* ---------- User behaviour profile ---------- */
export interface Behaviour {
  views: Record<number, number>;
  carts: Record<number, number>;
  basketHistory: number[][]; // past orders (product ids)
}

export function userProfile(b: Behaviour) {
  const cat: Record<string, number> = {};
  let priceSum = 0, priceW = 0, healthy = 0, total = 0;
  const add = (id: number, w: number) => {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) return;
    cat[p.category] = (cat[p.category] || 0) + w;
    priceSum += p.price * w; priceW += w;
    if (p.healthy) healthy += w;
    total += w;
  };
  Object.entries(b.views).forEach(([id, n]) => add(+id, n));
  Object.entries(b.carts).forEach(([id, n]) => add(+id, n * 3));
  b.basketHistory.flat().forEach((id) => add(id, 4));
  const maxCat = Math.max(1, ...Object.values(cat));
  return {
    categoryAffinity: Object.fromEntries(Object.entries(cat).map(([k, v]) => [k, v / maxCat])),
    avgPrice: priceW ? priceSum / priceW : null,
    healthyRatio: total ? healthy / total : 0,
    signals: total,
  };
}

/* ---------- Co-purchase (association) from basket history ---------- */
function coPurchase(b: Behaviour, id: number) {
  const baskets = b.basketHistory.filter((o) => o.includes(id));
  const counts: Record<number, number> = {};
  baskets.forEach((o) => o.forEach((x) => x !== id && (counts[x] = (counts[x] || 0) + 1)));
  return { counts, n: baskets.length };
}

/* ---------- Hybrid recommendation ---------- */
export interface Recommendation {
  product: Product;
  score: number;
  reasons: string[];
  parts: { similarity: number; cluster: number; price: number; personal: number; daily: number; together: number };
}

export function recommendSimilar(selected: Product, b: Behaviour, hour: number, limit = 8): Recommendation[] {
  const v = VECTORS.get(selected.id)!;
  const profile = userProfile(b);
  const nowUse = timeOfDayUse(hour);
  const selSeg = segment(selected.price);
  const co = coPurchase(b, selected.id);

  return PRODUCTS.filter((p) => p.id !== selected.id)
    .map((p) => {
      const similarity = Math.max(0, cosine(v, VECTORS.get(p.id)!));
      const cluster = CLUSTER.get(p.id) === CLUSTER.get(selected.id) ? 1 : 0;
      const priceDiff = Math.abs(p.price - selected.price) / Math.max(p.price, selected.price);
      const price = (1 - priceDiff) * 0.7 + (segment(p.price) === selSeg ? 0.3 : 0);
      let personal = (profile.categoryAffinity[p.category] || 0) * 0.6;
      if (profile.avgPrice) personal += (1 - Math.min(1, Math.abs(p.price - profile.avgPrice) / profile.avgPrice)) * 0.25;
      if (p.healthy) personal += profile.healthyRatio * 0.15;
      const daily = (p.mealTime === nowUse ? 0.6 : 0) + (p.dailyEssential ? 0.4 : 0);
      const together = co.n ? (co.counts[p.id] || 0) / co.n : 0;
      const sameCat = p.category === selected.category ? 1 : 0;

      const score =
        similarity * 0.3 + sameCat * 0.15 + cluster * 0.15 + price * 0.15 +
        personal * 0.1 + daily * 0.05 + together * 0.1;

      const reasons: string[] = [];
      if (sameCat && price > 0.7) reasons.push(`Similar ${selected.category.toLowerCase()}, similar price`);
      else if (sameCat) reasons.push(`Also in ${selected.category}`);
      if (cluster) reasons.push("Same product cluster");
      if (segment(p.price) === selSeg && !sameCat) reasons.push(`${selSeg} pick`);
      if (together > 0.3) reasons.push("You bought these together");
      if ((profile.categoryAffinity[p.category] || 0) > 0.6) reasons.push("Matches your habits");
      if (p.mealTime === nowUse && nowUse !== "home") reasons.push(`Good for ${nowUse} now`);

      return { product: p, score, reasons: reasons.slice(0, 2), parts: { similarity, cluster, price, personal, daily, together } };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Home feed: personal habits + what fits this time of day. */
export function recommendForYou(b: Behaviour, hour: number, limit = 8): Recommendation[] {
  const profile = userProfile(b);
  const nowUse = timeOfDayUse(hour);
  const seen = new Set([...Object.keys(b.carts)].map(Number));
  return PRODUCTS.filter((p) => !seen.has(p.id))
    .map((p) => {
      const personal = profile.categoryAffinity[p.category] || 0;
      const daily = (p.mealTime === nowUse ? 0.7 : 0) + (p.dailyEssential ? 0.3 : 0);
      const priceFit = profile.avgPrice
        ? 1 - Math.min(1, Math.abs(p.price - profile.avgPrice) / profile.avgPrice) : 0.5;
      const score = profile.signals ? personal * 0.5 + daily * 0.3 + priceFit * 0.2 : daily;
      const reasons = [
        personal > 0.6 ? "Based on your habits" : "",
        p.mealTime === nowUse && nowUse !== "home" ? `For your ${nowUse}` : p.dailyEssential ? "Daily essential" : "",
      ].filter(Boolean);
      return { product: p, score, reasons, parts: { similarity: 0, cluster: 0, price: priceFit, personal, daily, together: 0 } };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
