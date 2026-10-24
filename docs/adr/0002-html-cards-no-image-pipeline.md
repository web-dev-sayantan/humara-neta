# Cards are HTML and CSS; v1 ships no image pipeline

A Card is a React/Tailwind component rendered in the page, 1:1 only — the same node is used in the feed, as the Quote page's hero, and as the thing the user screenshots. v1 generates no image files anywhere: sharing sends the Quote's permalink plus the Editorial note as text via `navigator.share()`, and the card's layout is designed to be screenshotted cleanly by hand (generous safe area, high contrast, no small text near the edges). Per-quote social preview images are therefore absent — every shared link unfurls with a single static brand image.

The alternative was rendering PNGs with Satori + `resvg-wasm` on a Worker. It works, but it means a second template to keep pixel-identical to the Tailwind one, plus Workers Paid for the CPU budget. Client-side DOM→PNG was considered and deferred, not rejected: it needs bundled fonts that are guaranteed loaded and CORS-safe background images, which is a fidelity risk not worth carrying in v1.

## Consequences

- The distribution loop loses its picture: a Quote link in WhatsApp shows a brand image, not the quote. This is the largest known gap in v1, accepted to keep the build small.
- Source links live outside the card image by design, so a screenshot travelling on its own carries no attribution trail and no way back to the site beyond the small domain mark. The domain mark is load-bearing, not decoration.
- Any future 9:16 story asset or per-quote unfurl requires a server-side renderer, and that template must be reconciled with this component — a real cost paid later rather than now.
- Because nothing is rasterised, "what the reader sees" and "what gets shared" cannot drift in v1; the risk moves entirely to v2.
