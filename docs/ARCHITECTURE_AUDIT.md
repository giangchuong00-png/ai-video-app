# Reelbo Architecture Audit

Audit date: 2026-10-03  
Scope: entire checked-in application plus the existing uncommitted Gemini retry work  
Method: read-only code and configuration inspection, TypeScript check, and ESLint check. No external AI, payment, storage, or database operation was executed.

## Executive summary

Reelbo is a single Next.js 16 application in which a large client component orchestrates a sequence of synchronous route handlers. The product flow is conceptually sound: acquire a reference, analyze it, generate a script and scene plan, reserve credits, generate individual clips, synthesize speech and subtitles, merge the clips, then save a final result. Server-authoritative prices, idempotent database RPCs, per-scene credit shares, and failure refunds are good foundations.

The current production path is not end-to-end complete. The frontend deliberately limits full-render generation to the first scene while charging for the entire render. The remaining scenes are not attempted or refunded, and merge refuses to proceed until all scene slots are populated. This is the most urgent correctness and financial defect.

Other high-risk areas are an unverifiable database contract, a fixed payment memo, permissive SePay webhook behavior when its expected secret is absent, synchronous serverless media processing, unauthenticated costly AI endpoints, retry amplification, no durable workflow state, and missing tests/migrations.

The recommended strategy is to preserve the staged domain architecture and atomic credit concepts while incrementally extracting shared contracts and durable orchestration. A wholesale rewrite would unnecessarily endanger payment and media behavior.

## Repository shape

- Framework: Next.js 16.3 App Router, React 19, TypeScript.
- UI: one 4,000-line client component in `app/page.tsx`.
- AI providers: Google Gemini through `@google/genai`; Replicate for video generation.
- Media processing: bundled `ffmpeg-static` invoked as child processes.
- Data/auth/storage: Supabase.
- Payments: VietQR initiation in the browser and SePay webhook processing.
- Deployment assumptions: Vercel, including a daily cleanup cron.
- Automated tests: none.
- Checked-in Supabase migrations/schema: none.
- Static state at audit time:
  - TypeScript check passes.
  - ESLint reports 61 errors and 5 warnings.
  - Branch `main` is one commit ahead of `origin/main`.

## Current architecture

```text
Browser: app/page.tsx
  |
  |-- Supabase browser client
  |     |-- Google OAuth session
  |     |-- profiles credit read
  |     `-- video_jobs history read
  |
  |-- Reference intake
  |     |-- POST /api/crawl
  |     |-- POST /api/analyze-video
  |     `-- POST /api/extract-reference-frame
  |
  |-- Planning
  |     `-- POST /api/chat
  |
  |-- Purchased render
  |     |-- POST /api/render/start
  |     `-- POST /api/generate-video per scene
  |             |-- POST /api/compose-frame
  |             `-- Replicate minimax/video-01
  |
  `-- Finalization
        `-- POST /api/merge-video
              |-- POST /api/tts per voiced scene
              |-- POST /api/subtitles
              |-- FFmpeg normalization/mux/concat/burn
              |-- Supabase Storage upload
              `-- video_jobs insert

External ingress:
  SePay -> POST /api/sepay -> process_sepay_payment RPC
  Vercel Cron -> GET /api/cleanup-expired-videos
```

The route layer mixes transport, validation, provider access, business rules, database work, media processing, and error translation. No domain service layer or shared runtime contract layer currently separates these concerns.

## Complete end-to-end flow

### 1. Browser initialization

`app/page.tsx` creates a Supabase browser client from public environment values. On mount it calls `auth.getUser()`, reads `profiles.credits` by email, and loads completed, unexpired `video_jobs` by user ID. An auth-state listener repeats these reads after session changes.

All active creative state exists only in React memory: source input, analysis-derived reference, script, scene URLs, failed indexes, current render progress, cost estimate, and final URL. Refreshing or closing the page loses in-progress work.

### 2. User input

The user selects creative or clone mode, file or link input, target duration, voice, optional KOC images, and a free-text product description. Up to ten character images may be selected, but only the first is used during generation.

The UI accepts link mode as TikTok/Shopee in copy, but `/api/crawl` accepts only strings containing `tiktok.com`.

### 3. Reference intake and analysis

#### TikTok link

1. The browser calls `/api/crawl` with the URL.
2. `/api/crawl` calls TikWM and returns title, author, playable video URL, cover, and duration.
3. The cover is stored as the product reference image.
4. The playable URL is sent to `/api/analyze-video`.
5. Analyzer output and user text are flattened into a large textual prompt for `/api/chat`.

The link path does not call `/api/extract-reference-frame`; Gemini's recommended timestamp is therefore ignored and the TikTok cover remains the reference.

#### Uploaded image

1. The browser reads the complete image as a base64 data URL.
2. That data URL becomes the product reference.
3. No image-analysis route identifies product attributes; the script engine receives the filename and user text.

#### Uploaded video

1. The browser posts the complete file as multipart data to `/api/analyze-video`.
2. The route buffers the complete file, writes it to `/tmp`, uploads it through Gemini Files, and polls until ready.
3. Gemini returns structured product, character, audio, motion, camera, lighting, pacing, reference-frame, and scene data.
4. The browser uploads the same source file again to `/api/extract-reference-frame` with Gemini's recommended timestamp.
5. FFmpeg extracts one JPEG, returned as a base64 data URL.
6. The image is attached to the analysis object and later submitted as a video-generation reference.

Local temporary files are removed. The uploaded Gemini Files object is not explicitly deleted.

### 4. Script and scene planning

The browser calls `/api/chat` without authentication. The request includes:

- flattened source/analyzer text;
- requested duration (`15s`, `30s`, or `60s`);
- direct product text;
- reference URL for link inputs;
- `creative` or mapped `motion` mode;
- up to eight recent script summaries held in the current browser session.

The route:

1. Selects a randomized creative strategy.
2. Calls a Gemini director model and requires JSON.
3. Normalizes scene fields and durations.
4. Calls a Gemini duration adapter when scenes exceed six seconds.
5. Uses a local deterministic splitter if semantic adaptation fails.
6. Calls a Gemini voiceover guard for scenes whose narration exceeds a word budget.
7. Returns a normalized script, scenes, identity structures, and diagnostic metadata.

The planned total is reported but not strictly reconciled to the selected target duration.

### 5. Render purchase and credit reservation

The user must be authenticated and the client-side credit display must meet the duplicated client price. The browser obtains the Supabase access token, creates a render request UUID, parses every planned scene duration, and calls `/api/render/start`.

The route:

1. Authenticates the token with the service-role Supabase client.
2. Normalizes the duration and mode.
3. Validates scene count and the scene-duration sum.
4. Calculates the authoritative full-render price from `lib/pricing.ts`.
5. Proportionally allocates the total price to scene credit shares.
6. Calls the `start_reelbo_render_job` RPC with the request ID.
7. Returns render-job ID, locked duration plan, credit shares, and remaining balance.

The intended RPC contract is atomic charge plus idempotent render-job creation. Its SQL definition is not in this repository.

### 6. Scene generation

The browser initializes a URL slot for every script scene, then currently executes:

```ts
for (let i = 0; i < Math.min(1, script.scenes.length); i++)
```

Only scene 1 is sent to `/api/generate-video`; all later slots remain null.

For each requested full-render scene, the route:

1. Authenticates the user.
2. Loads the render job and verifies owner, active state, expiration, scene range, duration, and credit plan.
3. Inserts a `render_job_scenes` row with `processing` status.
4. Establishes a proportional refund context.
5. Accepts product and KOC references; the declared enhancement helper currently returns inputs unchanged.
6. Calls `/api/compose-frame` to synthesize a 9:16 first frame with Gemini Image.
7. Compiles a product-preservation and cinematography prompt.
8. Calls `replicate.run("minimax/video-01")`.
9. Marks the scene `completed` with its output URL.
10. Returns the video URL and an estimated, not provider-reported, cost.

On failure, it marks the scene failed and calls `refund_reelbo_credits` with an idempotency key for that render-job scene.

For manual regeneration, `/api/generate-video` independently calculates a regeneration price, calls `charge_reelbo_generation`, and establishes a separate idempotent refund context.

### 7. Final merge

The browser permits merge only when every scene slot contains a URL. Because only scene 1 is generated, normal multi-scene scripts cannot reach merge.

When called, `/api/merge-video`:

1. Authenticates the Supabase token.
2. Accepts scene URLs, planned durations, voiceovers, requested target duration, and voice type.
3. Creates a temporary working directory.
4. Sequentially downloads each scene URL.
5. Uses FFmpeg to trim and normalize each scene to 720x1280, 30 fps, H.264, without original audio.
6. Calls `/api/tts` for every non-empty voiceover.
7. Parses WAV duration, accelerates speech if needed up to 1.6x, pads/trims it, and muxes AAC audio.
8. Adds silent AAC audio to scenes without speech.
9. Concatenates normalized scene files.
10. Calls `/api/subtitles` to create an SRT timeline from planned durations and narration text.
11. Attempts to burn subtitles; subtitle failure is nonfatal.
12. Uploads the final MP4 to the public `reelbo-videos` bucket.
13. Inserts a completed `video_jobs` row.
14. Returns the public URL and history metadata.
15. Deletes the temporary directory.

The submitted `targetDuration` is not used. No render-job ID is passed, so merge cannot finalize the purchased render job.

### 8. History and cleanup

The browser queries `video_jobs` directly for completed rows whose `expires_at` is in the future. A daily Vercel cron calls `/api/cleanup-expired-videos` with `CRON_SECRET`. Cleanup selects up to 100 expired rows, removes their storage objects, and then deletes their database rows.

Final video expiration depends on database behavior not represented in the repository; merge does not explicitly provide `expires_at`.

## Frontend responsibilities

`app/page.tsx` currently owns:

- Supabase browser client creation;
- auth state and OAuth initiation;
- profile credit reads;
- history queries;
- payment-plan selection and VietQR URL construction;
- input mode and source file state;
- browser-side file-to-base64 conversion;
- reference acquisition orchestration;
- analyzer-to-director prompt construction;
- recent-script memory;
- duplicated credit calculation;
- render request and regeneration UUID creation;
- scene-generation sequencing;
- result, error, progress, and failed-scene state;
- merge initiation;
- final result and history display;
- all page UI.

This concentration makes state transitions difficult to test and causes the browser to be the only orchestration authority for a paid workflow.

## Backend and API responsibilities

| Route | Responsibility | Authentication | External side effects |
|---|---|---|---|
| `POST /api/crawl` | TikTok metadata and media resolution | None | TikWM request |
| `POST /api/analyze-video` | Multimodal source-video analysis | None | Remote download, Gemini Files upload, Gemini generation |
| `POST /api/extract-reference-frame` | Extract a source frame | None | Remote download or upload buffering, FFmpeg |
| `POST /api/chat` | Director, duration adaptation, narration guard | None | Up to several Gemini calls |
| `POST /api/render/start` | Authenticate, price, charge, create render job | Bearer token | Supabase auth and RPC |
| `POST /api/generate-video` | Reserve/generate/refund one scene | Bearer token | Supabase, internal compose call, Replicate |
| `POST /api/compose-frame` | Generate a scene's first frame | None | Remote image downloads, Gemini Image |
| `POST /api/tts` | Generate WAV narration | None | Gemini TTS |
| `POST /api/subtitles` | Generate deterministic caption timeline/SRT | None | None |
| `POST /api/merge-video` | Normalize, narrate, subtitle, merge, upload, save history | Bearer token | Downloads, internal TTS/subtitle calls, FFmpeg, Supabase |
| `POST /api/sepay` | Validate payment and add credits | SePay header only when configured | Supabase payment RPC |
| `GET /api/cleanup-expired-videos` | Remove expired final videos/history | Cron bearer secret | Supabase Storage and database deletes |
| `GET /auth` | Exchange Supabase OAuth code | OAuth code | Supabase session cookies |

## Gemini and AI pipeline

### Analyzer

`/api/analyze-video` uses Gemini Files and a detailed multimodal extraction prompt. Its model order is:

1. `gemini-3.8-flash`
2. `gemini-3.7-flash`
3. `gemini-3.6-flash`
4. `gemini-3.5-flash`
5. `gemini-3.1-flash-lite`

It augments missing `product_anchor_prompt` and copies nested transcript data to a legacy top-level field.

### Director and post-processing

`/api/chat` uses:

1. `gemini-3.8-flash`
2. `gemini-3.6-flash`
3. `gemini-3.5-flash-lite`

The same candidates are reused by the duration adapter and voiceover guard. Each phase independently performs retry and fallback, which can multiply latency and calls.

### First-frame generation

`/api/compose-frame` uses `gemini-3.1-flash-image`, requests one 9:16 1K image, and provides KOC and product references as inline image data. There is no retry wrapper or model fallback.

### TTS

`/api/tts` uses `gemini-3.1-flash-tts-preview`, maps Reelbo voice names to Gemini prebuilt voices, assumes raw PCM output, and wraps it in a simple WAV header. There is no retry/fallback. The model is a legacy preview according to current provider documentation.

### Existing retry implementation

The untracked `lib/gemini-retry.ts` is imported by the two modified routes and provides retryable-status classification, exponential backoff, and jitter. It is valuable work in progress but is incomplete:

- Any finite numeric value is first classified as an HTTP status, so numeric gRPC codes never reach the gRPC retry set.
- Only a limited set of SDK error shapes is inspected.
- Common network error codes and nested causes are not classified.
- `Retry-After` is not honored.
- There is no total elapsed-time or cross-model attempt budget.
- A director request can independently retry/fallback in three AI phases.
- Chat collapses exhaustion to HTTP 500 rather than a machine-readable 429/503.
- Files upload/polling, image generation, and TTS do not use the helper.

## Video generation, render, and merge pipeline

### Pricing modes

Full-render prices are 60/100/180 credits for fast 15/30/60 seconds and double for `hd_pro`. Regeneration prices use short/medium/long tiers and also double for `hd_pro`.

The actual generation route always calls `minimax/video-01` with the same inputs. No mode-specific engine, output resolution, or quality option is selected. `hd_pro` is currently a commercial label without a technical implementation.

### Render reservation

The server stores the authoritative scene-duration and credit-share plan. Scene calls must match the locked duration within 0.05 seconds. Reservation is implemented by inserting a scene row. A unique violation becomes `SCENE_ALREADY_USED`.

Because failed rows remain reserved, a full-render scene cannot be retried through the same path. The client instead uses separately charged regeneration.

### Reference continuity

Generation prioritizes:

1. `lastFrameUrl`;
2. composed first frame;
3. processed product image.

The backend does not actually extract the generated video's last frame. It looks for provider output fields that may not exist. The frontend falls back to the prior video URL, which may then be sent as an image input. Continuity is therefore not reliable.

### Merge characteristics

The merge route is deterministic once all sources and TTS outputs exist, but it is long-running and serial. It does multiple complete downloads and transcodes in a single serverless request. It has no job checkpoint, execution deadline, resource reservation, subprocess timeout, or resumable upload.

## Supabase and data architecture

The code references these logical entities:

### `profiles`

- Looked up by email in the browser.
- Contains at least `credits`.
- Payment code association is implied by the SePay RPC but not visible.

### `render_jobs`

Expected fields include:

- `id`
- `user_id`
- `video_mode`
- `duration_seconds`
- `total_credits`
- `scene_count`
- `scene_durations`
- `scene_credit_shares`
- `status`
- `created_at`
- `expires_at`
- request/idempotency identifier

### `render_job_scenes`

Expected fields include:

- `render_job_id`
- `scene_number`
- `status`
- `video_url`
- `completed_at`

A uniqueness constraint on render-job ID plus scene number is assumed.

### `video_jobs`

Expected fields include:

- `id`
- `user_id`
- `video_url`
- `storage_path`
- `duration_seconds`
- `status`
- `created_at`
- `expires_at`

### Credit and payment ledger

The following atomic RPCs are required:

- `start_reelbo_render_job`
- `charge_reelbo_generation`
- `refund_reelbo_credits`
- `process_sepay_payment`

Their definitions, permissions, idempotency constraints, and ledger tables are not checked in. The application cannot be reproduced safely from this repository alone.

### Storage

Final videos are uploaded to `reelbo-videos/final/...` and exposed through `getPublicUrl`. The bucket is therefore expected to be public. Intermediate Replicate assets remain provider-hosted and are not copied to controlled storage before merge.

## Authentication

- Browser authentication uses `createBrowserClient` and Google OAuth.
- Protected routes validate the bearer token through a service-role Supabase client.
- The OAuth callback route exchanges a code at `/auth`.
- The login call currently sets `redirectTo` to the site origin rather than explicitly to `/auth`, which is inconsistent with the callback route and requires live verification.
- Costly analysis, script, image, TTS, and media extraction endpoints do not require authentication.
- Browser-side profile/history reads depend on RLS policies that are not present in the repository.

## Credits, payment, and SePay flow

### Top-up initiation

The browser selects an amount, constructs a VietQR URL, and opens it in a new tab. Every user and every plan uses the fixed memo `REELBO RB100`.

There is no API that creates or retrieves a user-specific payment intent or payment code. There is no browser polling or realtime subscription to update the balance after payment.

### Webhook processing

`/api/sepay`:

1. Compares `Authorization` with `Apikey <SEPAY_WEBHOOK_API_KEY>` only if that variable exists.
2. If it is absent, logs a warning and continues accepting requests.
3. Accepts incoming transfers only.
4. Validates a numeric transaction ID and exact supported amount.
5. Extracts an `RB...` payment code from transfer content.
6. Calls `process_sepay_payment` with the SePay ID, amount, mapped credits, content, and payment code.
7. Relies on the RPC for user lookup, transaction uniqueness, and atomic credit increment.

The currently configured key name does not match the key name read by the route. Values were not inspected or changed. This means webhook authentication may be silently disabled in the current environment.

### Render charging

- Full render: charged once during render start.
- Full-render scene generation: no additional charge; failure tries to refund that scene's allocated share.
- Regeneration: independently charged per call; failure tries to refund that regeneration.
- Frontend balances are updated from route responses when available.

## Important API contracts

### `POST /api/analyze-video`

Input:

- multipart `file`, or
- JSON `{ videoUrl }`.

Success:

```json
{
  "success": true,
  "data": {},
  "analysis": {},
  "product": {},
  "meta": { "model": "...", "source": "...", "multimodal_analysis": true }
}
```

Important output fields consumed by the client include `product`, `character`, `transcript`, `hook`, `sales_logic`, `pacing`, `original_visual`, `reference_frame.recommended_timestamp`, and `scenes`.

### `POST /api/chat`

Input:

```json
{
  "message": "analyzer/source prompt",
  "duration": "15s|30s|60s",
  "product": "user text",
  "referenceUrl": "optional",
  "mode": "creative|motion",
  "recentScripts": []
}
```

Success returns `{ success, script, meta }`. `script.scenes[]` must contain at least duration, voiceover, visual prompt, scene spec, and cinematic spec for downstream behavior.

### `POST /api/render/start`

Requires `Authorization: Bearer <Supabase access token>`.

Input:

```json
{
  "render_request_id": "UUID",
  "duration_seconds": 15,
  "video_mode": "fast|hd_pro",
  "scene_durations": [3, 3, 3, 3, 3]
}
```

Success returns render-job ID, locked plan, credit shares, server pricing, and remaining credits.

### `POST /api/generate-video`

Requires a bearer token.

Full-render input must include `action: "full_render"`, render-job ID, scene number, locked duration, prompt/spec/identity structures, and optional product/KOC/continuity references.

Regeneration uses `action: "regenerate"` and `generation_request_id` instead of a render-job charge.

Success returns `video_url`, credit metadata, scene/action metadata, engine, and pipeline flags. Failure may return refund metadata and `remaining_credits`.

### `POST /api/compose-frame`

Input contains scene/cinematic/product structures plus optional product and KOC image data/URLs. Success returns a base64 `first_frame_url`.

### `POST /api/tts`

Input: `{ text, voiceType, style? }`. Real-mode success is binary `audio/wav`, not JSON. Mock-mode success is JSON with `audioUrl: null`, which is incompatible with the merge route's expectation of an audio response; merge mock mode bypasses TTS so this does not surface in its current path.

### `POST /api/subtitles`

Input: `{ scenes: [{ duration, voiceover }] }`. Success returns caption records, SRT, total duration, and count.

### `POST /api/merge-video`

Requires a bearer token. Input includes complete scene records and voice type. Success returns the public final URL, storage path, planned duration, history state, and editor metadata.

### `POST /api/sepay`

Expects a SePay webhook payload and, when correctly configured, `Authorization: Apikey <key>`. Exact supported amounts map to credits. The RPC response is passed through for success, duplicate, and logical rejection cases.

## Current bugs and technical debt

### Critical

1. Full render only generates scene 1 after charging for every scene.
2. Unattempted scenes are not refunded.
3. Multi-scene merge is unreachable through the normal flow.
4. Fixed payment memo is not user-specific.
5. SePay webhook fails open when its expected environment key is absent.
6. Environment naming does not currently match the SePay route's expected name.

### High

1. Failed full-render scenes cannot be reserved again under the same job.
2. Render jobs are not marked completed by merge.
3. `hd_pro` charges double without different generation behavior.
4. Continuity may submit a video URL as an image.
5. Paid workflow state is not durable outside the browser.
6. TTS or merge failure can strand a fully generated, paid set of clips without a final result.
7. Refund failures have no durable retry queue or reconciliation job.
8. Database schema/RPC/RLS definitions are absent.
9. OAuth redirect target is inconsistent with the callback route.
10. Final upload can be orphaned when history insertion fails.

### Medium

1. Link references use a cover instead of the analyzer-selected frame.
2. Uploaded images receive no product analysis.
3. Only the first of up to ten KOC images is used.
4. Frontend and server pricing logic are duplicated.
5. `targetDuration` is ignored by merge.
6. Provider cost is an inaccurate fixed estimate.
7. Script planned duration is not strictly reconciled to requested duration.
8. Analyzer does not explicitly delete uploaded Gemini Files objects.
9. Cleanup processes at most 100 records daily.
10. Storage deletion before row deletion can leave broken history rows.
11. Scratch `Untitled` files contain stale configuration/code/commands.
12. README and environment documentation do not describe the real system.
13. Extensive `any` usage and monolithic files produce 61 lint errors.

## Security risks

1. `/api/chat`, `/api/analyze-video`, `/api/compose-frame`, `/api/tts`, and `/api/extract-reference-frame` can incur cost without authentication.
2. There is no rate limiting by account, IP, payment status, or job.
3. Analyzer, reference extraction, compose-frame, and merge fetch caller-controlled URLs without SSRF protection.
4. Remote fetches can target private networks, follow redirects, and download unbounded content.
5. Uploaded files have no enforced size, duration, codec, or verified MIME limit.
6. SePay authentication is optional at runtime instead of fail-closed.
7. Payment content is logged and may contain banking metadata.
8. Final videos use public storage URLs.
9. Service-role behavior depends on route correctness because it bypasses RLS.
10. Browser reads depend on unknown RLS policies.
11. `/auth` accepts a free-form `next` string and constructs an origin-relative redirect without explicit path validation.
12. Detailed upstream/FFmpeg errors can be returned or logged with provider/internal context.

## Reliability and scalability risks

1. Merge is a long synchronous serverless request containing serial TTS and several FFmpeg operations.
2. No route-level timeout, fetch abort, FFmpeg kill deadline, or total work budget exists.
3. Full files are buffered in memory before writing to `/tmp`.
4. Base64 reference images increase request and response sizes by roughly one third.
5. Scene generation is browser-controlled and cannot resume after refresh.
6. Provider URLs may expire before merge.
7. Retry plus model fallback can amplify latency and calls substantially.
8. Project-wide quota exhaustion is treated similarly to model-specific unavailability.
9. There is no concurrency control for multiple tabs or repeated clicks.
10. Scene and merge operations lack durable checkpoints.
11. The history expiration and cleanup process can accumulate a backlog.
12. TikWM is a single external dependency for link ingestion.
13. There is no structured tracing across analysis, script, render, scene, merge, and payment.
14. There are no operational alerts for refund failure, stuck jobs, payment failures, or orphan files.

## Data loss, financial, and cost hazards

- A charged render can leave most scene credits neither used nor refunded because of the one-scene loop.
- A scene failure may require a new paid regeneration to finish the purchased result.
- A failed refund is only surfaced in a response/log; it is not retried durably.
- A successful provider generation can be lost from UI state after refresh.
- A successful final upload with failed history insertion becomes an undiscoverable storage object.
- Cleanup may delete the storage object and then fail to delete the row, leaving a broken result.
- An unauthenticated caller can consume Gemini image, analysis, script, and TTS quota.
- Multiple fallback attempts can create latency and cost without improving project-wide quota errors.
- The displayed USD cost excludes most providers and is unsuitable for financial decisions.
- Fixed payment codes and fail-open webhook authentication can cause incorrect credit attribution or fraudulent credit attempts.

## Existing uncommitted work that must be preserved

At audit time the following user work is not committed:

- Modified: `app/api/analyze-video/route.ts`
- Modified: `app/api/chat/route.ts`
- Untracked: `lib/gemini-retry.ts`

The changes add `withGeminiRetry` around analyzer, director, duration-adapter, and voiceover-guard Gemini calls. This work must not be overwritten, reverted, discarded, reformatted wholesale, or replaced without a deliberate merge. Future implementation should build tests around it first, then patch it incrementally.

## Recommended implementation order

### Phase 0: capture contracts before behavior changes

1. Export the production Supabase schema, RPCs, RLS policies, storage policies, triggers, defaults, and indexes into migrations.
2. Define credit conservation and render lifecycle invariants.
3. Add route request/response fixtures and database contract tests.
4. Preserve the three uncommitted files as the baseline for Gemini reliability work.

### Phase 1: stop financial and end-to-end failures

1. Remove the one-scene client limiter and prove every locked scene is attempted.
2. Add a safe failed-scene retry transition under the original render job.
3. Reconcile or refund unattempted/abandoned scene shares.
4. Carry render-job ID through merge and finalize job state.
5. Prevent duplicate/concurrent client submissions.
6. Make SePay fail closed and align its expected configuration name.
7. replace the fixed memo with a user-specific payment intent/code.
8. Correct the OAuth callback target.
9. Disable `hd_pro` until it has materially distinct generation behavior, or implement that behavior.

Required validation: concurrency, idempotency, full/partial failure, exact credit conservation, webhook duplicates, wrong payment code, OAuth expiry, and 15/30/60-second multi-scene renders.

### Phase 2: finish Gemini reliability safely

1. Add unit tests for existing `lib/gemini-retry.ts` before editing it.
2. Correct numeric gRPC classification.
3. Recognize nested SDK and network errors.
4. Honor `Retry-After` and impose total attempt/time budgets.
5. Centralize task-specific model orders.
6. Distinguish input errors, safety blocks, quota exhaustion, and model unavailability.
7. Preserve 429/503 status and machine-readable error codes.
8. Add appropriate policies to Files upload/poll, compose-frame, and TTS.
9. Move TTS to a supported production model.

Required validation: table-driven classification tests, fake timers for backoff, retry exhaustion, malformed JSON, empty candidates, cross-model budget, and status propagation.

### Phase 3: secure and bound resource use

1. Authenticate every costly route.
2. Add account/IP/job rate limits.
3. Add runtime request schemas.
4. Add file size/duration/MIME/codec limits.
5. Block SSRF and restrict allowed remote origins.
6. Add network and subprocess timeouts.
7. Store large temporary references instead of transporting base64 repeatedly.

Required validation: unauthorized access, rate limits, private-address and redirect SSRF, oversized files, MIME spoofing, provider timeout, FFmpeg timeout, and cleanup on every error branch.

### Phase 4: make rendering durable

1. Persist scripts, scene inputs, outputs, status, and errors.
2. Replace browser-only orchestration with resumable server jobs/workers.
3. Add explicit render state transitions and cancellation/expiration.
4. Make merge resumable and idempotent.
5. Add compensation for upload/history partial failure.
6. Add durable refund reconciliation.

Required validation: browser refresh/closure, duplicate worker delivery, worker crash, resume, merge retry, storage failure, database failure, expiration, and exact ledger reconciliation.

### Phase 5: modular refactor without contract changes

1. Extract shared request/domain types and runtime schemas.
2. Extract Supabase admin/auth modules.
3. Extract Gemini model/error/retry modules.
4. Split media processing and render-state services from route handlers.
5. Split the frontend into input, script, render, result, history, payment, and auth modules.
6. Use the shared pricing module in the client-safe boundary.
7. Remove reviewed scratch files.
8. Resolve all lint failures.

Required validation: golden API contract tests, component tests, clean TypeScript/ESLint/build, and mock-mode end-to-end tests.

### Phase 6: operations and cost controls

1. Introduce correlation IDs and structured logs.
2. Track actual provider cost and retry counts.
3. Alert on refund failure, stuck render, payment rejection, cleanup backlog, and orphan storage.
4. Reconcile payments, credit ledger, render consumption, refunds, and provider spend daily.

Required validation: synthetic failures and reconciliation tests proving every alert and compensation path.

## Final assessment

Preserve the product-level pipeline and atomic-credit direction. Do not begin with a UI rewrite or a full backend rewrite. The first implementation milestone must be a financially correct, resumable multi-scene render using the existing contracts. Gemini retry work should be completed immediately afterward under tests. Durable job execution and modular refactoring should follow once the credit and scene lifecycle is proven.
