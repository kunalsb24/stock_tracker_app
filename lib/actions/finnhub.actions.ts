
import { getDateRange, validateArticle, formatArticle } from '@/lib/utils';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const NEXT_PUBLIC_FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

async function fetchJSON(url: string, revalidateSeconds?: number) {
  const separator = url.includes('?') ? '&' : '?';
  const fullUrl = `${url}${separator}token=${NEXT_PUBLIC_FINNHUB_API_KEY}`;
  
  const options: RequestInit & { next?: { revalidate?: number } } = revalidateSeconds !== undefined
    ? {
        cache: 'force-cache',
        next: { revalidate: revalidateSeconds },
      }
    : { cache: 'no-store' };

  const response = await fetch(fullUrl, options);

  if (!response.ok) {
    throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getNews(symbols?: string[]): Promise<MarketNewsArticle[]> {
  try {
    const { from, to } = getDateRange(5);

    if (symbols && symbols.length > 0) {
      const cleanedSymbols = symbols.map((s) => s.trim().toUpperCase());
      const articles: MarketNewsArticle[] = [];
      const seenIds = new Set<number | string>();

      // Loop max 6 times, round-robin through symbols
      for (let i = 0; i < 6; i++) {
        const symbol = cleanedSymbols[i % cleanedSymbols.length];
        const url = `${FINNHUB_BASE_URL}/company-news?symbol=${symbol}&from=${from}&to=${to}`;
        
        try {
          const rawArticles: RawNewsArticle[] = await fetchJSON(url, 3600);
          
          // Find the first valid and unseen article for this symbol in this round
          const validArticle = rawArticles.find(
            (a) => validateArticle(a) && !seenIds.has(a.id)
          );

          if (validArticle) {
            seenIds.add(validArticle.id);
            articles.push(formatArticle(validArticle, true, symbol, i) as MarketNewsArticle);
          }
        } catch (err) {
          console.error(`Error fetching news for ${symbol}:`, err);
          // Continue to next round/symbol
        }
      }

      if (articles.length === 0) {
        return await getNews(); // Fallback to general news
      }

      return articles.sort((a, b) => b.datetime - a.datetime);
    } else {
      // General market news
      const url = `${FINNHUB_BASE_URL}/news?category=general`;
      const rawArticles: RawNewsArticle[] = await fetchJSON(url, 3600);

      const articles: MarketNewsArticle[] = [];
      const seenIds = new Set<number | string>();
      const seenUrls = new Set<string>();
      const seenHeadlines = new Set<string>();

      for (const raw of rawArticles) {
        if (articles.length >= 6) break;

        if (validateArticle(raw)) {
          const headline = raw.headline!.trim();
          const url = raw.url!;
          
          if (!seenIds.has(raw.id) && !seenUrls.has(url) && !seenHeadlines.has(headline)) {
            seenIds.add(raw.id);
            seenUrls.add(url);
            seenHeadlines.add(headline);
            articles.push(formatArticle(raw, false, undefined, articles.length) as MarketNewsArticle);
          }
        }
      }

      return articles;
    }
  } catch (error) {
    console.error('Error in getNews:', error);
    if (symbols && symbols.length > 0) {
        // If it failed with symbols, try general news as fallback
        try {
            return await getNews();
        } catch {
             throw new Error('Failed to fetch news');
        }
    }
    throw new Error('Failed to fetch news');
  }
}
