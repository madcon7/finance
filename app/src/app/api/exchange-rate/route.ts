import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

// Cache rates for 1 hour
let rateCache: { rates: Record<string, number>; ts: number } | null = null;

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const now = Date.now();
  if (rateCache && now - rateCache.ts < 60 * 60 * 1000) {
    return NextResponse.json(rateCache.rates);
  }

  try {
    // Free API, no key needed — returns rates relative to KZT
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/KZT', {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    // data.rates.USD = how many USD per 1 KZT → invert to get KZT per foreign
    const rates: Record<string, number> = { KZT: 1 };
    for (const [cur, rate] of Object.entries(data.rates as Record<string, number>)) {
      if (['USD', 'EUR', 'AED', 'TRY'].includes(cur)) {
        rates[cur] = parseFloat((1 / rate).toFixed(4));
      }
    }
    rateCache = { rates, ts: now };
    return NextResponse.json(rates);
  } catch (e) {
    // Fallback approximate rates if API unavailable
    return NextResponse.json({ KZT: 1, USD: 450, EUR: 490, AED: 122, TRY: 13 });
  }
}
