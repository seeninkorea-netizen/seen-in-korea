import type { APIRoute } from 'astro';

const PRICING = {
  // 테스트용 초기 단가 — 실제 판매가 확정 전 조정 예정
  enKoPerWord: 90,
  koEnPerWord: 110,

  reviewPerWord: 55,
  secondEnglishReviewAddPerWord: 35,

  videoPerMinute: 8000,

  minimumOrder: 40000,

  fastMultiplier: 1.25,
  urgentMultiplier: 1.5,
};

const PURPOSE_MULTIPLIER: Record<string, number> = {
  BUSINESS: 1.0,
  WEBSITE: 1.05,
  MARKETING: 1.1,
  VIDEO: 1.05,
  TECHNICAL: 1.15,
  ACADEMIC: 1.1,
  PERSONAL: 1.0,
  LEGAL: 1.2,
  MEDICAL: 1.2,
  OTHER: 1.0,
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

function round1000(value: number) {
  return Math.max(
    1000,
    Math.round(value / 1000) * 1000
  );
}

function calculateEstimate(input: any) {
  const {
    language_pair,
    service_level,
    purpose,
    deadline,
    unit_type,
    unit_count,
    source_type,
  } = input;

  if (!['KO_EN', 'EN_KO'].includes(language_pair)) {
    throw new Error('Invalid language pair.');
  }

  if (
    !['STANDARD', 'REVIEW', 'DOUBLE_REVIEW'].includes(
      service_level
    )
  ) {
    throw new Error('Invalid service level.');
  }

  if (!['WORDS', 'MINUTES'].includes(unit_type)) {
    throw new Error('Invalid unit type.');
  }

  const units = Number(unit_count);

  if (!Number.isFinite(units) || units <= 0) {
    throw new Error(
      'Word count or video duration must be greater than zero.'
    );
  }

  let basePrice = 0;

  // WORD PRICING
  if (unit_type === 'WORDS') {
    const translationRate =
      language_pair === 'KO_EN'
        ? PRICING.koEnPerWord
        : PRICING.enKoPerWord;

    if (service_level === 'STANDARD') {
      basePrice =
        units *
        translationRate;
    }

    if (service_level === 'REVIEW') {
      basePrice =
        units *
        PRICING.reviewPerWord;
    }

    if (service_level === 'DOUBLE_REVIEW') {
      basePrice =
        units *
        (
          translationRate +
          PRICING.secondEnglishReviewAddPerWord
        );
    }
  }

  // VIDEO PRICING
  if (unit_type === 'MINUTES') {
    let serviceMultiplier = 1;

    if (service_level === 'REVIEW') {
      serviceMultiplier = 0.65;
    }

    if (service_level === 'DOUBLE_REVIEW') {
      serviceMultiplier = 1.3;
    }

    basePrice =
      units *
      PRICING.videoPerMinute *
      serviceMultiplier;
  }

  // CONTENT TYPE
  basePrice *=
    PURPOSE_MULTIPLIER[purpose] || 1;

  // DEADLINE
  if (deadline === 'FAST') {
    basePrice *=
      PRICING.fastMultiplier;
  }

  if (deadline === 'URGENT') {
    basePrice *=
      PRICING.urgentMultiplier;
  }

  // MINIMUM ORDER
  basePrice = Math.max(
    basePrice,
    PRICING.minimumOrder
  );

  const exactPrice =
    round1000(basePrice);

  const estimateMin =
    round1000(exactPrice * 0.9);

  const estimateMax =
    round1000(exactPrice * 1.1);

  // HUMAN REVIEW RULES
  const reasons: string[] = [];

  if (
    purpose === 'LEGAL' ||
    purpose === 'MEDICAL'
  ) {
    reasons.push(
      'specialized legal or medical content'
    );
  }

  if (
    source_type === 'SCANNED_PDF'
  ) {
    reasons.push(
      'scanned or image-based document'
    );
  }

  if (
    unit_type === 'WORDS' &&
    units > 15000
  ) {
    reasons.push(
      'large-volume project'
    );
  }

  if (
    unit_type === 'MINUTES' &&
    units > 60
  ) {
    reasons.push(
      'long-form video project'
    );
  }

  if (
    deadline === 'URGENT' &&
    (
      (
        unit_type === 'WORDS' &&
        units > 4000
      ) ||
      (
        unit_type === 'MINUTES' &&
        units > 20
      )
    )
  ) {
    reasons.push(
      'urgent large-volume project'
    );
  }

  const manualReview =
    reasons.length > 0;

  return {
    currency: 'KRW',

    estimate_min:
      estimateMin,

    estimate_max:
      estimateMax,

    internal_calculated_price:
      exactPrice,

    manual_review:
      manualReview,

    manual_review_reasons:
      reasons,

    // 아직 바로 결제는 허용하지 않음
    auto_payment_eligible:
      false,

    pricing_basis: {
      unit_type,
      unit_count: units,
      language_pair,
      service_level,
      purpose,
      deadline,
    },

    message:
      manualReview
        ? 'This project needs a human review before the final price is confirmed.'
        : 'This is an estimated price. The final price will be confirmed before payment.',
  };
}


// 주소 정상 작동 확인용
export const GET: APIRoute = async () => {
  return json({
    ok: true,
    service: 'sik-translation-estimate',
    status: 'ready',
  });
};


// 실제 견적 계산
export const POST: APIRoute = async ({ request }) => {
  try {
    const input =
      await request.json();

    const estimate =
      calculateEstimate(input);

    return json({
      ok: true,
      estimate,
    });

  } catch (error: any) {

    return json(
      {
        ok: false,
        error:
          error?.message ||
          'Could not calculate estimate.',
      },
      400
    );
  }
};
