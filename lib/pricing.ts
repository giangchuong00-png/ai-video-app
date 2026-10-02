export type VideoMode =
  | "fast"
  | "hd_pro";

export type PricingAction =
  | "full_render"
  | "regenerate";

type PriceInput = {
  action: PricingAction;
  durationSeconds: number;
  videoMode: VideoMode;
};

type PriceResult = {
  credits: number;
  pricingVersion: string;
};

const PRICING_VERSION =
  "beta-v1";

// ======================================================
// FULL VIDEO PRICING
// ======================================================
//
// Đây là bảng GIÁ BÁN CREDIT tạm thời.
// Sau khi test COGS thật 9–12 video,
// mình sẽ chỉnh lại các số ở đây.
//
// Không phải bảng chi phí API thật.
//

const FULL_RENDER_PRICING = {
  fast: {
    15: 60,
    30: 100,
    60: 180,
  },

  hd_pro: {
    15: 120,
    30: 200,
    60: 360,
  },
} as const;

// ======================================================
// REGENERATE PRICING
// ======================================================
//
// Tạm thời giữ theo tier.
// Sau này có thể đổi theo model thật.
//

const REGENERATE_PRICING = {
  fast: {
    short: 20,
    medium: 25,
    long: 30,
  },

  hd_pro: {
    short: 40,
    medium: 50,
    long: 60,
  },
} as const;

// ======================================================
// HELPERS
// ======================================================

function normalizeDurationTier(
  durationSeconds: number
) {
  if (
    durationSeconds <= 3
  ) {
    return "short";
  }

  if (
    durationSeconds <= 5
  ) {
    return "medium";
  }

  return "long";
}

// ======================================================
// MAIN PRICING ENGINE
// ======================================================

export function calculateCredits({
  action,
  durationSeconds,
  videoMode,
}: PriceInput): PriceResult {
  const safeMode:
    VideoMode =
    videoMode === "hd_pro"
      ? "hd_pro"
      : "fast";

  if (
    action ===
    "full_render"
  ) {
    let duration:
      15 | 30 | 60 =
      15;

    if (
      durationSeconds >= 46
    ) {
      duration = 60;
    } else if (
      durationSeconds >= 21
    ) {
      duration = 30;
    }

    return {
      credits:
        FULL_RENDER_PRICING[
          safeMode
        ][duration],

      pricingVersion:
        PRICING_VERSION,
    };
  }

  const tier =
    normalizeDurationTier(
      durationSeconds
    );

  return {
    credits:
      REGENERATE_PRICING[
        safeMode
      ][tier],

    pricingVersion:
      PRICING_VERSION,
  };
}