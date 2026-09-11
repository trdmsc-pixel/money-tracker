/**
 * Smart Financial SMS Parser for Indian Banks and Payment Apps
 * Supports: HDFC, ICICI, SBI, Axis, Kotak, PhonePe, Paytm, Google Pay, CRED
 */

const CATEGORY_KEYWORDS = {
  'cat-food': [
    'swiggy', 'zomato', 'mcdonald', 'starbucks', 'blue tokai', 'chaayos',
    'eatclub', 'domino', 'pizza', 'burger', 'restaurant', 'cafe', 'kitchen'
  ],
  'cat-fuel': [
    'petrol', 'fuel', 'hpcl', 'iocl', 'bpcl', 'indian oil', 'bharat petro', 'shell'
  ],
  'cat-groceries': [
    'blinkit', 'zepto', 'instamart', 'bigbasket', 'bbnow', 'supermarket',
    'grofer', 'dmart', 'nature basket', 'milk', 'kirana'
  ],
  'cat-bills': [
    'bescom', 'bses', 'electricity', 'airtel', 'jio', 'vi', 'vodafone',
    'broadband', 'tatasky', 'water', 'gas', 'indane', 'act fibernet'
  ],
  'cat-aitools': [
    'openai', 'chatgpt', 'anthropic', 'claude', 'midjourney', 'runway',
    'elevenlabs', 'cursor', 'huggingface', 'github', 'fal.ai', 'replicate', 'pika'
  ],
  'cat-subs': [
    'netflix', 'spotify', 'prime', 'apple.com', 'google cloud', 'youtube',
    'adobe', 'hotstar', 'disney', 'notion', 'figma'
  ],
  'cat-travel': [
    'uber', 'ola', 'rapido', 'makemytrip', 'irctc', 'indigo', 'air india',
    'fastag', 'toll', 'metro', 'flight'
  ],
  'cat-health': [
    'pharmacy', 'apollo', 'medplus', '1mg', 'pharmeasy', 'hospital', 'dr.',
    'clinic', 'dental', 'diagnostics'
  ],
};

/**
 * Infer category from payee/merchant name and text content
 */
export function inferCategory(text) {
  const lower = text.toLowerCase();
  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return catId;
      }
    }
  }
  return 'cat-other';
}

/**
 * Parses a single SMS text string into a structured transaction candidate
 */
export function parseSMS(smsText, userAccounts = []) {
  if (!smsText || typeof smsText !== 'string' || smsText.trim().length === 0) {
    return null;
  }

  const clean = smsText.replace(/\s+/g, ' ').trim();

  // 1. Extract Amount
  // Matches: Rs. 15,000.00 | INR 15000 | Rs 1,250 | Rs.500
  const amountRegex = /(?:rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i;
  const amountMatch = clean.match(amountRegex);
  if (!amountMatch) {
    return null; // Not a financial transaction SMS
  }

  const rawAmountStr = amountMatch[1].replace(/,/g, '');
  const amount = parseFloat(rawAmountStr);
  if (isNaN(amount) || amount <= 0) {
    return null;
  }

  // Filter out OTPs or balance-only inquiries
  const lower = clean.toLowerCase();
  if (lower.includes('otp') || lower.includes('one time password') || lower.includes('verification code')) {
    return null;
  }

  // 2. Determine Transaction Type
  let type = 'expense';
  let isCredit = false;
  let isDebit = false;

  if (
    lower.includes('debited') ||
    lower.includes('paid') ||
    lower.includes('spent') ||
    lower.includes('sent') ||
    lower.includes('withdrawn')
  ) {
    isDebit = true;
    type = 'expense';
  } else if (
    lower.includes('credited') ||
    lower.includes('received') ||
    lower.includes('deposited')
  ) {
    isCredit = true;
    type = 'income';
  } else {
    // If ambiguous, skip or treat as expense if debit-like
    return null;
  }

  // 3. Extract Account Reference
  let accountRef = '';
  const acctRegex = /(?:a\/c|acct|account|card)\s*(?:no\.?)?\s*[\*xX]*(\d{3,4})/i;
  const acctMatch = clean.match(acctRegex);
  if (acctMatch) {
    accountRef = acctMatch[1];
  }

  // Match with existing accounts if available
  let matchedAccountId = '';
  if (userAccounts.length > 0) {
    if (accountRef) {
      const match = userAccounts.find((a) => a.name.includes(accountRef));
      if (match) matchedAccountId = match.id;
    }
    if (!matchedAccountId) {
      // Default to company or first account for debits
      const coAccount = userAccounts.find((a) => a.kind === 'company');
      matchedAccountId = coAccount ? coAccount.id : userAccounts[0]?.id || '';
    }
  }

  // 4. Extract Merchant / Payee / Counterparty
  let merchant = '';
  // Pattern 1: to VPA / to ... / info: ... / at ...
  const vpaRegex = /(?:to\s+vpa|vpa|to)\s+([a-zA-Z0-9.\-_@]+)/i;
  const infoRegex = /(?:info[:\s]+|towards\s+|at\s+)([\w\s.\-&]+?)(?:\.|\s+on|\s+ref|\s+avl|\s+bal|$)/i;
  const upiTrfRegex = /trf\s+to\s+([\w\s.\-&]+?)(?:\/|\.|\s+ref|$)/i;

  const upiMatch = clean.match(upiTrfRegex);
  const infoMatch = clean.match(infoRegex);
  const vpaMatch = clean.match(vpaRegex);

  if (upiMatch && upiMatch[1].trim().length > 2) {
    merchant = upiMatch[1].trim();
  } else if (infoMatch && infoMatch[1].trim().length > 2) {
    merchant = infoMatch[1].trim();
  } else if (vpaMatch && vpaMatch[1].trim().length > 2) {
    merchant = vpaMatch[1].trim();
  } else {
    // Fallback: search for bank name
    if (lower.includes('swiggy')) merchant = 'Swiggy';
    else if (lower.includes('zomato')) merchant = 'Zomato';
    else if (lower.includes('uber')) merchant = 'Uber';
    else if (lower.includes('blinkit')) merchant = 'Blinkit';
    else if (lower.includes('zepto')) merchant = 'Zepto';
    else merchant = isDebit ? 'Expense' : 'Inflow';
  }

  // Clean up merchant name
  merchant = merchant.replace(/^(vpa|upi|ref|bal|avl)\s+/i, '').trim();

  // 5. Detect Company -> Personal Transfer (Dribble Pull Detection)
  let isDribbleTransfer = false;
  const transferKeywords = ['trf to', 'transfer to', 'self', 'shyam', 'chaitravarna', 'personal'];
  const hasTransferKw = transferKeywords.some((kw) => lower.includes(kw));

  // If debited from company account and contains personal transfer markers
  if (isDebit && (hasTransferKw || lower.includes('trf to shyam') || lower.includes('self transfer'))) {
    type = 'transfer';
    isDribbleTransfer = true;
  }

  // 6. Extract Date & Time
  let date = new Date().toISOString().split('T')[0];
  const dateMatch = clean.match(/(\d{1,2})[-\/]([a-zA-Z]{3}|\d{1,2})[-\/](\d{2,4})/);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    let month = dateMatch[2];
    let year = dateMatch[3];
    if (year.length === 2) year = '20' + year;

    const monthsMap = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    if (isNaN(month)) {
      month = monthsMap[month.toLowerCase().substring(0, 3)] || '01';
    } else {
      month = month.padStart(2, '0');
    }
    date = `${year}-${month}-${day}`;
  }

  const category = inferCategory(clean + ' ' + merchant);

  return {
    id: 'sms-tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    amount,
    currency: 'INR',
    inrAmount: amount,
    type, // 'expense' | 'income' | 'transfer'
    merchant: merchant || (type === 'transfer' ? 'Company Pull' : 'Card / UPI'),
    category,
    accountId: matchedAccountId,
    accountRef,
    isDribbleTransfer,
    rawSms: clean,
    date,
    time: new Date().toTimeString().substring(0, 5),
    status: 'pending', // pending approval
    detectedAt: new Date().toISOString(),
  };
}

/**
 * Bulk parse multiple SMS messages (e.g. from clipboard dump or bulk text)
 */
export function parseBulkSMS(text, userAccounts = []) {
  if (!text) return [];
  // Split on double newlines or standard bank prefixes
  const blocks = text.split(/(?:\r?\n){2,}|(?=Alert:)|(?=Dear Customer)|(?=Axis Bank)|(?=ICICI Bank)|(?=SBI User)/gi);
  const results = [];

  for (const block of blocks) {
    const parsed = parseSMS(block, userAccounts);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}
