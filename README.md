# Ledger — Personal Money Tracker for Solo Creators

Ledger is a personal money app built for solo creators and AI filmmakers who operate with irregular, lumpy project payments (INR & USD) and need to stop untracked company-to-personal dribble transfers.

---

## Key Features

1. **Company $\to$ Personal Transfer Counter (Priority #1)**
   - Tracks dribble transfers (₹10k–₹20k pulls) in real time.
   - Dynamic states:
     - 0 pulls: Neutral
     - 1 pull: Lime
     - 2–3 pulls: Gold warning
     - 4+ pulls: Rose alert (*"This is the pattern that made ₹54,000 disappear"*)
   - **Mandatory Reason Requirement**: Transfers cannot be saved without writing why.

2. **Smart SMS Financial Detection & Approval Inbox**
   - Ingests bank and UPI SMS notifications (HDFC, ICICI, SBI, Axis, PhonePe, Paytm, Google Pay, Cred).
   - Automatically detects amount, merchant/payee, account reference, category, and flags company dribble transfers.
   - **1-Tap Approval Queue**: Review detected transactions and approve them into Ledger with one tap.

3. **Scheduled Daily Reminders & Notifications**
   - Web Notification API integration.
   - Set customizable daily reminder time (e.g., 9:30 PM).
   - Reminds you to take 8 seconds to log today's expenses.

4. **Under 8-Second Logging**
   - Oversized touch keypad amount input with quick chips (+100, +500, +1k, +5k).
   - "Did you need this?" honest toggle (Yes / No).
   - Most-used categories automatically bubble to the top.

5. **Dynamic Intelligence Insights**
   - Real-time calculations: daily burn rate, liquid runway in months, unnecessary spending annualized equivalent, and lumpy income rhythm.
   - 6-month visual comparison chart (income, spend, and dribbles).
   - Category donut breakdown.

6. **Advisor Share Report**
   - Full-bleed gold summary panel with condensed typography.
   - Copy structured plain-text report for accountants and financial advisors.
   - Full JSON export and backup restore.

---

## Development

```bash
# Run local dev server
npm run dev

# Build production bundle
npm run build
```

## Android APK Generation

See [`android-setup.md`](./android-setup.md) for full instructions on building an Android `.apk` with native `READ_SMS` and `RECEIVE_SMS` permissions using Capacitor.
