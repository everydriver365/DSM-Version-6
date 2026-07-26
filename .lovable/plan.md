Standardize the spacing between mobile home-page sections.

Current state
- Next lesson: custom header wrapper with `margin: 18px 16px 10px`.
- Teaching Schedule: uses `SectionHeader` (`mt-6 mb-2` = 24px top / 8px bottom).
- Upcoming Tests: uses `SectionHeader` (`mt-6 mb-2`).
- Quick Access: wrapped in a band with `marginTop: 16px` and a `SectionHeader` inside it.
- Discover section: separate component with its own rhythm.

Plan
1. Standardize every section header on the mobile home page to use a single `marginTop` and `marginBottom` token.
2. Proposed rhythm: 24px top margin between sections, 8px bottom margin before the section content.
3. Adjust the Next lesson header wrapper, the Quick Access band wrapper, and verify the Discover section matches.
4. Keep the `SectionHeader` component unchanged so the standard applies everywhere it is used.
5. Validate the visual rhythm on mobile after the change.

If you want a different gap (e.g. 16px or 32px), let me know and I'll update the plan before building.