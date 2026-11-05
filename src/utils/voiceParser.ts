import { Product } from '../types/pos';

export interface ParsedVoiceCommand {
  rawTranscript: string;
  matchedItems: {
    product: Product;
    qty: number;
  }[];
  tenderedCash: number | null;
  suggestedPaymentMethod: 'CASH' | 'PAUTANG' | 'GCASH_QR';
  customerQuery: string | null;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  a: 1,
  an: 1,
  isa: 1,
  isang: 1,
  two: 2,
  dalawa: 2,
  dalawang: 2,
  three: 3,
  tatlo: 3,
  tatlong: 3,
  four: 4,
  apat: 4,
  apatna: 4,
  five: 5,
  lima: 5,
  limang: 5,
  six: 6,
  anim: 6,
  seven: 7,
  pito: 7,
  eight: 8,
  walo: 8,
  nine: 9,
  siyam: 9,
  ten: 10,
  sampu: 10,
};

export const VOICE_PRESET_PHRASES = [
  'Two Pantene, one Coke 1.5, paid 100',
  'Three Pancit Canton, two Great Taste, paid 200',
  'Dalawang Sinandomeng rice, isang Safeguard, pautang Marites',
  'Five Marlboro Red, one Cobra, gcash',
];

export function parseVoiceOrder(transcript: string, catalog: Product[]): ParsedVoiceCommand {
  const normalized = transcript.toLowerCase().trim();

  // Detect tendered cash: e.g. "paid 100", "bayad 200", "cash 500", "100 pesos"
  let tenderedCash: number | null = null;
  const cashMatch = normalized.match(/(?:paid|bayad|cash|bill|tendered)\s*(?:₱|php)?\s*(\d{2,4})/i);
  if (cashMatch) {
    tenderedCash = parseFloat(cashMatch[1]);
  }

  // Detect payment method
  let suggestedPaymentMethod: 'CASH' | 'PAUTANG' | 'GCASH_QR' = 'CASH';
  let customerQuery: string | null = null;

  if (normalized.includes('pautang') || normalized.includes('utang') || normalized.includes('credit')) {
    suggestedPaymentMethod = 'PAUTANG';
    if (normalized.includes('marites')) customerQuery = 'cust-marites';
    else if (normalized.includes('boyet')) customerQuery = 'cust-boyet';
    else if (normalized.includes('jessa')) customerQuery = 'cust-jessa';
    else if (normalized.includes('ronnie')) customerQuery = 'cust-ronnie';
  } else if (normalized.includes('gcash') || normalized.includes('qr')) {
    suggestedPaymentMethod = 'GCASH_QR';
  }

  // Split into clauses by comma or "and" / "at"
  const clauses = normalized
    .split(/,|\band\b|\bat\b|\bplus\b/)
    .map((c) => c.trim())
    .filter(Boolean);

  const matchedMap = new Map<string, { product: Product; qty: number }>();

  for (const clause of clauses) {
    // Skip pure payment clauses like "paid 100"
    if (/^(?:paid|bayad|cash|gcash|qr|pautang|utang)\b/.test(clause)) {
      continue;
    }

    // Find best matching product in this clause
    let bestProduct: Product | null = null;
    let longestAliasLen = 0;

    for (const product of catalog) {
      const candidates = [
        product.shortName.toLowerCase(),
        product.name.toLowerCase(),
        ...product.voiceAliases.map((a) => a.toLowerCase()),
      ];
      for (const alias of candidates) {
        if (clause.includes(alias) && alias.length > longestAliasLen) {
          bestProduct = product;
          longestAliasLen = alias.length;
        }
      }
    }

    if (bestProduct) {
      // Extract quantity before the product name or anywhere in the clause
      let qty = 1;
      const tokens = clause.split(/\s+/);
      for (const tok of tokens) {
        const cleanTok = tok.replace(/[^a-z0-9]/g, '');
        if (NUMBER_WORDS[cleanTok] !== undefined) {
          qty = NUMBER_WORDS[cleanTok];
          break;
        }
        const parsedInt = parseInt(cleanTok, 10);
        // Avoid matching "1.5" in "Coke 1.5" or "3" in "3in1"
        if (!Number.isNaN(parsedInt) && parsedInt > 0 && parsedInt <= 50 && cleanTok === String(parsedInt)) {
          qty = parsedInt;
          break;
        }
      }

      const existing = matchedMap.get(bestProduct.id);
      if (existing) {
        existing.qty += qty;
      } else {
        matchedMap.set(bestProduct.id, { product: bestProduct, qty });
      }
    }
  }

  return {
    rawTranscript: transcript,
    matchedItems: Array.from(matchedMap.values()),
    tenderedCash,
    suggestedPaymentMethod,
    customerQuery,
  };
}
