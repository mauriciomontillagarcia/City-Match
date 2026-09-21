# City Size Comparison
The City Size Comparison app allows you to visually compare the geographic size of two cities around the world. Simply enter the names of two cities, and the app automatically displays their outlines aligned for easy comparison.

## Map provider

The background uses standard OpenStreetMap tiles, with no account or API key required. OpenStreetMap attribution must remain visible. Native tiles are available through zoom 19; zoom 20 scales those tiles locally.

The public tile service is community-funded, has no availability guarantee, and must follow the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). Use normal browser caching and send a Referer header; do not bulk download or prefetch maps for offline use. For heavy traffic, choose a suitable hosted provider or self-host tiles.

This replaces CARTO Positron, which now requires an API key and otherwise displays an “API key required” watermark. As checked on 2026-09-21, [CARTO offers a free key](https://www.carto.com/basemaps/apikey/) with 5 million tile requests per calendar month, aimed at non-commercial use. Keeping that style would require requesting and configuring a key. The OpenStreetMap background has a different visual style; city overlays are unchanged.
