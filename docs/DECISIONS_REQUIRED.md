# Founder Decisions Required

This document contains only product, commercial, or risk decisions that require Founder authority. Engineering implementation details are intentionally excluded.

## 1. Treatment of users affected by incomplete full renders

### Problem

The current full-render flow charges for the complete video but only attempts scene 1. Multi-scene customers may therefore have paid credits for scenes that were never generated and never automatically refunded. The repository does not provide enough production ledger data to determine the affected population.

### Options

1. Proactively identify and refund every affected render.
2. Refund only users who report the issue.
3. Grant replacement credits plus a goodwill bonus to every affected user.
4. Take no retrospective action and only fix future renders.

### Trade-offs

- Proactive refunds have the highest immediate credit liability but best preserve trust and reduce support disputes.
- Complaint-only handling lowers immediate liability but treats equivalent customers differently and risks reputational damage.
- A goodwill bonus increases liability but may convert a serious failure into a retention opportunity.
- No retrospective action minimizes immediate cost but creates the highest trust, legal, and payment-dispute risk.

### Technical recommendation

Choose option 1, with a small goodwill bonus if the affected population and liability are affordable. Engineering should first run a read-only ledger audit using render jobs, scene rows, charges, and refunds, then execute an approved idempotent remediation process.

### Consequence of postponing it

Affected balances remain incorrect, support evidence becomes harder to reconstruct as provider URLs and logs expire, and payment disputes or public complaints may increase.

## 2. Meaning and sale of the `hd_pro` tier

### Problem

`hd_pro` currently costs twice as many credits but uses the same video model, inputs, and final 720x1280 merge path as `fast`. There is no implemented quality distinction that justifies the premium.

### Options

1. Temporarily remove or disable `hd_pro` until a distinct pipeline exists.
2. Keep the tier and implement a genuinely higher-quality provider/model, resolution, or generation policy.
3. Keep the current technical output but reposition the premium around another explicit service benefit, such as priority processing or more regeneration rights.

### Trade-offs

- Disabling it protects customer trust but removes premium revenue during development.
- Implementing a distinct pipeline preserves the intended upsell but raises provider cost and engineering complexity.
- Repositioning can be viable only if the promised benefit is real, measurable, and communicated before purchase.

### Technical recommendation

Choose option 1 immediately, then evaluate option 2 using measured quality and COGS. Do not sell a quality premium until automated configuration and acceptance tests prove a material difference.

### Consequence of postponing it

Customers can continue paying double for equivalent output, increasing refund, trust, and consumer-protection risk.

## 3. Final-video privacy and retention policy

### Problem

Final videos are stored in a public Supabase bucket and presented as retained for 72 hours. Anyone with a URL may access the asset, and the exact expiration guarantee depends on database behavior and a daily best-effort cleanup job.

### Options

1. Keep public URLs and clearly disclose 72-hour best-effort retention.
2. Use a private bucket with short-lived signed URLs and retain assets for 72 hours.
3. Use private storage with a longer customer-selectable retention period.
4. Delete immediately after download or explicit completion.

### Trade-offs

- Public URLs are simple and cheap but provide weak privacy control.
- Signed URLs materially improve privacy with moderate implementation and support complexity.
- Longer retention improves convenience but raises storage cost, privacy obligations, and breach impact.
- Immediate deletion minimizes data exposure but makes recovery and multi-device use difficult.

### Technical recommendation

Choose option 2: private storage, signed access, an explicit 72-hour policy, and a reconciliation job that verifies deletion. Allow future paid retention only after privacy terms and storage economics are defined.

### Consequence of postponing it

Customer videos remain publicly reachable by URL, retention promises remain imprecise, and privacy risk grows with usage.

## 4. Render completion guarantee after credits are charged

### Problem

Video generation and final merge depend on multiple external providers. A customer can spend credits successfully generating clips but fail later at TTS or merge. The product currently has no declared entitlement when generation partially succeeds but no final downloadable video is produced.

### Options

1. Charge for provider work consumed, even if no final merged video is delivered.
2. Guarantee a final downloadable result or automatically refund all render credits.
3. Use staged charging: charge scene generation separately, then charge finalization separately.
4. Guarantee only scene clips, treating final merge as a best-effort free feature.

### Trade-offs

- Consumption-based charging protects margins but is difficult for customers to understand and may feel unfair.
- Full-result guarantees maximize trust but expose Reelbo to provider and retry costs.
- Staged charging is transparent but adds product complexity and may reduce conversion.
- Clip-only guarantees simplify liability but weaken Reelbo's core promise of a finished video.

### Technical recommendation

Choose option 2 for the current product promise: a paid full render should end with a downloadable final video or an automatic refund. Engineering should make the workflow resumable before expanding scale, so transient TTS/merge failures are retried rather than immediately refunded.

### Consequence of postponing it

Engineering cannot define correct ledger transitions for partial success, support decisions will be inconsistent, and customers may be charged without receiving the advertised outcome.

## 5. Supported reference sources and third-party dependency policy

### Problem

The UI implies TikTok and Shopee link support, but the backend only supports TikTok through the unofficial third-party TikWM service. This dependency can change, rate-limit, or fail without contractual guarantees and may introduce platform-policy considerations.

### Options

1. Officially support only direct uploads and remove link ingestion for now.
2. Officially support TikTok through the current third party, accepting its availability and policy risk.
3. Invest in approved/contracted source integrations and add each source only when reliable.
4. Keep link ingestion labeled as beta/best-effort while direct upload remains the guaranteed path.

### Trade-offs

- Upload-only is reliable and controllable but adds friction.
- Current TikTok support improves conversion but has availability and compliance uncertainty.
- Approved integrations are most durable but require time, contracts, and possibly platform approval.
- Beta labeling preserves experimentation but still requires clear customer expectations and fallbacks.

### Technical recommendation

Choose option 4 in the short term and option 3 for any source that becomes strategically important. Correct the UI immediately so it does not claim unsupported Shopee behavior.

### Consequence of postponing it

Users will continue encountering a mismatch between advertised and actual support, while a single third-party outage can disable the primary link flow.

## 6. AI-generated product fidelity promise

### Problem

Reelbo synthesizes a new first frame before video generation. Even with reference images and preservation prompts, generative models can alter color, shape, labels, logos, faces, or product details. The product currently implies strong consistency without defining an acceptable fidelity threshold or customer responsibility for review.

### Options

1. Market output as creative approximation and require customer review before publishing.
2. Promise strict product fidelity and invest in automated similarity checks plus regeneration/rejection gates.
3. Offer two modes: creative approximation and a higher-cost fidelity-validated mode.
4. Restrict categories or branded/logo products until fidelity is measurable.

### Trade-offs

- Approximation is honest and fast but may reduce appeal for commerce use cases.
- A strict promise is commercially powerful but technically expensive and cannot be guaranteed by prompting alone.
- Two modes align cost with need but add product complexity.
- Category restrictions reduce risk at the cost of addressable market.

### Technical recommendation

Choose option 1 for beta and evolve toward option 3 after measurable image/video similarity gates exist. Do not promise exact logo, label, or product reproduction solely from prompt instructions.

### Consequence of postponing it

Customers may publish materially inaccurate product representations, creating refund, brand, advertising, and trust risk without a defined acceptance policy.

## 7. Beta pricing and cost-risk tolerance

### Problem

Credits are currently based on temporary pricing assumptions, while displayed USD cost is a fixed duration estimate that omits Gemini analysis, director calls, retry/fallback calls, image generation, TTS, failed generations, storage, and merge compute. The true contribution margin is unknown.

### Options

1. Keep current prices and accept potentially negative margins during beta.
2. Pause paid scaling until real per-job COGS telemetry exists.
3. Apply conservative pricing and usage caps now, then lower prices when measured.
4. Offer a limited free/private beta while collecting cost data.

### Trade-offs

- Current pricing maximizes learning speed but can create uncontrolled losses.
- Pausing protects cash but slows customer validation.
- Conservative caps protect downside while permitting paid learning, but may suppress usage.
- A limited beta simplifies risk but delays revenue validation.

### Technical recommendation

Choose option 3: retain paid beta access with strict per-account limits, remove the inaccurate customer-facing cost estimate, and require actual provider-cost telemetry before broader acquisition or subscription promotion.

### Consequence of postponing it

Retry storms, abuse, and provider failures can create unknown negative margins, and pricing decisions will continue to rely on incomplete estimates.
