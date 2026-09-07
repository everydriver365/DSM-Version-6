# Fix: signing out lands on a "page not found" screen

## What's wrong

Signing out from the "More" page sends you to an address that doesn't exist in the app (`/auth`), so you see a 404 page instead of the sign-in screen. The sign-out in the side menu already goes to the correct sign-in screen, which is why only one of them breaks.

## The fix

In `src/routes/more.tsx`, change the post-sign-out redirect from `/auth` to `/login`, and make it a replace navigation so the back button can't return to the signed-in page.

No other files change.

## Check afterwards

Sign out from the More page and confirm it lands on the sign-in screen, and that the side-menu sign out still behaves the same.
