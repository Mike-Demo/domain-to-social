# Style the sign-in emails like M4G1C M4NT4

## What changes
All six sign-in emails get the same branded look: sign-up confirmation, magic link, password reset, invite, email change, and the identity re-check code. The wording stays the same. Only the look changes.

```text
+--------------------------------------+   white page (works in every inbox)
| [grit-black band]                    |
|   manta logo + "M4G1C M4NT4" in lime |
+--------------------------------------+
| CONFIRM YOUR EMAIL      (bold, black)|
| Short body text in dark gray         |
|                                      |
| [ VERIFY EMAIL ]  lime button, black |
|                   text, black border |
|                                      |
| Fallback link to copy if the button  |
| doesn't work                         |
| ------------------------------------ |
| Small gray footer line               |
+--------------------------------------+
```

## Readability across inboxes
- The page stays white, with black text on lime for the button. White text on lime would be too hard to read.
- Only the top band is grit-black, with lime text on black.
- Fonts: Space Grotesk where the inbox supports it, then Arial; codes use a fixed-width font. Gmail and Outlook will show Arial.
- The logo uses the hosted favicon image at magicmanta.com, with the site name as text so it still reads when images are blocked.
- Styles go directly on each element. The existing dark-mode adjustment stays, so the button stays readable in dark mode.
- Every email adds a plain fallback link under the button. The re-check code shows in a large boxed fixed-width font.

## Technical details
- Add a shared style module `src/lib/email-templates/brand.ts` with the colors, fonts, header, button, and footer styles. All six template files import it.
- Colors are copied from the site theme (grit-black #0b0c0e, acid-lime #d8ff00, paper #fbf9f4). Email clients can't read the site's design tokens, so these colors are a deliberate exception.
- Check: render all six templates with the preview data and screenshot them. Confirm the build is clean.
- Rollback: the template files are self-contained. Reverting them restores the plain look, and sending is unaffected.
