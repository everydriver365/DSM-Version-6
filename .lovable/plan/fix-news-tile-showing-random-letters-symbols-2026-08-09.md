# Fix news tile showing random letters/symbols

## Problem
The Industry News tile on the home Discover section sometimes displays random-looking letters/symbols mixed into the headline. This is because article titles fetched from the `news_articles` table contain HTML entities (e.g. `&amp;`, `&#39;`, `&quot;`) and stray HTML artifacts from the source RSS feeds. React renders them as literal text rather than decoding them.

## What I will do
1. Add a small shared utility `src/lib/newsText.ts` with two helpers:
   - `decodeHtmlEntities(str)` — decodes common numeric and named entities back to readable characters.
   - `sanitizeNewsTitle(str)` — strips HTML tags, decodes entities, collapses extra whitespace, and trims.
2. Apply `sanitizeNewsTitle` to every place a news article title is rendered:
   - The Industry News tile in `src/components/home/DiscoverSection.tsx` (`latestNewsTitle`).
   - The article list cards in `src/routes/news.index.tsx` (`a.title`).
   - The article detail page in `src/routes/news.$articleId.tsx` (`article.title`, `nextArticle.title`, and the page `<title>` meta).
3. Add a quick unit test for `sanitizeNewsTitle` covering entities, tags, and whitespace so the bug doesn't regress when the feed data changes.

## Verification
- Run the existing build/typecheck to confirm no TypeScript errors.
- Run the new unit test.
- Confirm in the preview that the Industry News tile now shows clean, readable text with no entity symbols.
