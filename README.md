# City Size Comparison
The City Size Comparison app allows you to visually compare the geographic size of two cities around the world. Simply enter the names of two cities, and the app automatically displays their outlines aligned for easy comparison.

## Development

Run `npm ci`, then `npm run dev`. Run `npm run build` to generate `dist` and `npm run preview` to preview the production build.

## Deployment to Vercel

`main` is the production branch. Connect this GitHub repository to Vercel and select `main` under Settings → Environments → Production → Branch Tracking. Each push to `main` then triggers a production deployment.

Use the repository root as the Root Directory (leave it empty; `v2` is only the local folder name). The checked-in `vercel.json` selects Vite, `npm run build`, and the `dist` output directory. No environment variables are required.

GitHub hosts the source code; Vercel builds and hosts the app. The former GitHub Pages workflow and `gh-pages` deployment commands have been removed. The `web` branch remains as historical reference.

## Map provider

The background uses standard OpenStreetMap tiles, with no account or API key required. OpenStreetMap attribution must remain visible. Native tiles are available through zoom 19; zoom 20 scales those tiles locally.

The public tile service is community-funded, has no availability guarantee, and must follow the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). Use normal browser caching and send a Referer header; do not bulk download or prefetch maps for offline use. For heavy traffic, choose a suitable hosted provider or self-host tiles.

This replaces CARTO Positron, which now requires an API key and otherwise displays an “API key required” watermark. As checked on 2026-09-21, [CARTO offers a free key](https://www.carto.com/basemaps/apikey/) with 5 million tile requests per calendar month, aimed at non-commercial use. Keeping that style would require requesting and configuring a key. The OpenStreetMap background has a different visual style; city overlays are unchanged.
