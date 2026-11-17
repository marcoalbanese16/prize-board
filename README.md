# Prize Board

A simple prize board for raffles and draws. Instead of writing hundreds of
winning numbers on a whiteboard and making everyone scan it, the host pastes
their winners into this page and gets a link and QR code. Guests type their
ticket number and instantly see whether they won.

No accounts, no payments, no database. It's a static site.

## Getting winners in from Google Sheets

Three ways, all handled by the same parser (`src/lib/parse-winners.ts`):

1. **Paste a link.** Share the sheet as *Anyone with the link → Viewer*, paste
   its link, and click Import. The page asks Google for the sheet's CSV export
   straight from the browser (Google allows this for shared sheets). A link with
   `gid=` (or `#gid=`) imports that tab; otherwise the first tab. Published
   ("Publish to web") links work too.
2. **Copy and paste the cells** from Sheets into the box.
3. **Upload a CSV** (File → Download → Comma-separated values).

What the importer copes with, so a real spreadsheet doesn't need cleaning up:

- Header rows in any order and wording (`Ticket #`, `Winning Number`, `Prize
  Description`, `Item`…), title rows above the header, and unlabelled headers
- Extra columns (winner names, phone numbers) are ignored and **never** end up
  in a prize
- Prize/ticket columns the wrong way round (detected, with a swap button)
- Tab-, comma- and semicolon-separated data; quoted commas, quotes and
  multi-line cells; Windows line endings
- A byte-order mark, UTF-16 and Windows-1252 files from Excel; non-breaking and
  zero-width spaces
- Blank rows (ignored); rows missing a ticket or prize, and `#N/A`-style error
  cells (skipped **and listed by row number**, never silently dropped)
- Numbers Sheets mangled: thousands separators, `.0` suffixes, scientific
  notation (warned), and **dropped leading zeros** (`0719054` becomes `719054`)
- Wrong inputs get a specific message: private or missing sheet, bad tab, a
  Doc/Drive link, an `.xlsx` or PDF upload, an offline browser

Leading zeros matter most. Matching on the board is safe either way: a guest who
types `0719054` still finds a stored `719054`, but never the reverse, and
partial numbers never match. The builder also offers a one-click button to put
the zeros back so the winner card shows the full number.

A review panel under the winners box shows exactly how the data was read (which
columns, a preview, what was skipped and why) before you share anything.

## How it works

- `/` — the builder. Enter an event name, paste or upload the winners
  (`ticket_number,prize_name`, one per line), pick a style, and get a link + QR.
- `/board/#d=...` — the board guests open. The whole board (title, date, style,
  winners) is compressed into the link's `#fragment`, and the page rebuilds it
  in the browser. Browsers never send the fragment to a server, so nothing is
  stored anywhere.

The builder saves your form in the browser (`localStorage`) as you type, so a
refresh or closed tab doesn't lose a pasted winners list. "Start over" clears
it. The board page needs no saving: everything it shows comes from the link.

The search matches the **whole** ticket number, so typing part of a number never
shows a false winner. A ticket that won twice shows both prizes.

### Live boards (QR code that never changes)

To post a QR code before the prizes are drawn, choose **Live from my Google
Sheet**. The link then holds only a reference to your sheet plus the style, not
the winners, so the QR code stays the same as you add rows.

- Put `Ticket` and `Prize` in row 1 and set sharing to **Anyone with the link →
  Viewer**. The builder checks this before it shows a QR code.
- Guests' browsers re-read the sheet about every 45 seconds (with backoff on
  errors, paused in hidden tabs) and again when a search finds no match. New
  winners show up within about a minute. If a refresh fails, guests keep seeing
  the last results with a notice.
- Changing the name, date or style makes a new QR code. Only winners are live.
- Google can rate-limit very busy sheets. Before printing, scan the QR with a
  phone, add a test row, and watch it appear; then delete the row.

### Limits

- A final-results board is a snapshot. To change one, make a new link.
- Anyone with the link can see the whole board (the winners are in it).
- The link grows with the winner count (about 1,200 characters for 100
  winners). QR codes top out around 2,900 characters; past that the builder
  tells you to share the link instead, and for big boards it warns that the QR
  is dense and should be test-scanned before printing.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit tests (parser, matching, Sheets links, file reading)
npm run build   # static export to ./out
```

Stack: Next.js 16 (static export), Tailwind CSS, `qrcode.react`, `papaparse`,
Vitest for tests.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds the site and publishes it on every push
to `main`.

1. Push this repo to GitHub (public, or a plan that includes Pages for private
   repos).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**

The workflow derives the base path from the repo name (`/<repo-name>`, or `/`
for a `<user>.github.io` repo) and passes it to the build as
`NEXT_PUBLIC_BASE_PATH`. To test a Pages-style build locally:

```bash
NEXT_PUBLIC_BASE_PATH=/prize-board-saas npm run build
```
