Original brand logos, without icon packs or redrawn substitutes.

`originals.json` records the exact sources. React, Next.js, Python, FastAPI and Go assets come from their project websites. C++ comes from the Standard C++ Foundation's logo repository. TypeScript and Tailwind use copies of the original color logos hosted on Wikimedia Commons. InAPI uses the existing local project logo at `../logos/inapi.png`.

The page currently loads the original images remotely because downloads are blocked in the editing environment. To save the originals here and automatically switch the page to local paths, run:

```powershell
python images/stack/download-originals.py
```

Downloads are validated before saving. A failed download leaves that logo's remote source in place. Previous approximate stack drawings and Git have been removed.

Brand references: [TypeScript](https://www.typescriptlang.org/branding/), [Tailwind CSS](https://tailwindcss.com/brand), [Go](https://go.dev/blog/go-brand), [C++](https://github.com/isocpp/logos).
