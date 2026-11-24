# PRISM website and asset handoff

Crossworld Creative's studio now uses warm amber light, an indigo horizon, angular apertures, large display type, and serif titles for narrative work. The composition moves from an illustrated studio threshold to an Archipelago spotlight and a destination index. Projects use a lead composition and a compact portfolio ledger, Games uses a world-selection stage, Music uses a record and tracklist, Literature uses a paper spread, and Community uses an illustrated meeting place above the existing conversation and membership tools. Welcome keeps the established mark, tagline, atmosphere, and entry. Login retains its desktop composition and keeps the same panels on mobile with enough vertical space to operate the form.

## Website artwork

| Source and build export | Intended use | Provenance |
| --- | --- | --- |
| `src/studio/art/threshold.svg` | Studio landing environment | Original hand-authored Crossworld website SVG |
| `src/studio/art/tide.svg` | Archipelago spotlight, project and game framing | Original website SVG for nautical context |
| `src/studio/art/gathering.svg` | Community header | Original hand-authored Crossworld website SVG |
| `src/studio/studio.css` | Record grooves, project symbols, portal cuts, tabs and focus states | Original CSS interface graphics |
| `public/logo.png` and the existing Welcome mark | Studio and authentication brand | Existing Crossworld website assets |

These illustrations are source-controlled interface graphics. The nautical image is website framing and is decorative in the accessibility tree. The SVG sources are also the build exports, with no dependency on linked images, embedded fonts, or runtime scripts. Vite bundles or fingerprints assets through source imports. The typography uses installed system fonts with fallbacks and requires no font download. Reference artwork from the named games and studios is absent from both source and release.

Keep experimental sources, rejected concepts, full-resolution proofs, and screenshots in the PRISM evidence area under `D:/Crossworld Operations/PRISM`. Use a descriptive lowercase kebab-case name for committed SVGs and a purpose and version in candidate filenames such as `community-horizon-v02.webp`. Use SVG for geometric graphics and optimized WebP or AVIF for raster candidates. Capture provenance, rights, project, intended placement, author, version and review disposition with each candidate. Prefer a single canonical source. Register candidate previews through authenticated Operations Artifacts when an authorized owner upload or eligible artifact-producing execution is available. A review decision and explicit production promotion are separate steps. The established production library and its publication procedure govern candidates requiring promotion. This release has no such candidate or promotion.

## Routes and access

Visitors retain public showcase and Community routes. The existing guest entry still lands at the studio. Project details live under `/dashboard/projects/:projectId`. Previously linked Taxi Cop, Literature, and solo music paths resolve to useful detail views. Availability reflects the existing products: the Archipelago companion and standalone Squash are linked, Loom and Taxi Cop are in development, and there is no onsite player or published reading excerpt. Settings, profile access and sign out retain the existing auth provider. The shared portfolio is available to Recruiter Pass visitors under the existing permissions.

The Operations entrance appears only after the deployed API authorizes an authenticated HEAD request. The response has no body and is requested without caching. Navigation and direct URLs use the same owner check before loading the private workspace chunk. The existing backend authorizes signed identity independently against the configured owner ID before dispatching browser workspace and media routes. The existing workspace query parameters are carried through login.

## Release boundaries

The frontend and Operations backend have separate release workflows. PRISM is built from the deployed frontend base in an isolated worktree. Pending Operations work, the backend migration, relay handover, supervisor and scheduled Windows activation are outside the frontend deployment. No additional service, paid API, dependency or recurring cost is required by the site.
