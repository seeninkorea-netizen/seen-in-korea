import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';
import { env } from 'cloudflare:workers';

const runtimeEnv =
  env as unknown as Record<string, string | undefined>;

const projectId =
  import.meta.env.PUBLIC_SANITY_PROJECT_ID;

const dataset =
  import.meta.env.PUBLIC_SANITY_DATASET ||
  'production';

const SESSION_CONFIG = {
  trial10: {
    durationMinutes: 10,
    paid: false,
  },
  paid30: {
    durationMinutes: 30,
    paid: true,
  },
  paid50: {
    durationMinutes: 50,
    paid: true,
  },
} as const;

type SessionType =
  keyof typeof SESSION_CONFIG;

const json = (
  data: unknown,
  status = 200
) =>
  new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        'content-type':
          'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    }
  );

function cleanString(
  value: unknown,
  max = 200
) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .slice(0, max);
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function bookingCode() {
  return `SIK-${Date.now()
    .toString(36)
    .toUpperCase()}-${crypto
    .randomUUID()
    .replace(/-/g, '')
    .slice(0, 5)
    .toUpperCase()}`;
}

function bookingId() {
  return `tutorBooking-${crypto.randomUUID()}`;
}

function paymentOrderId() {
  return `SIKTUTOR-${Date.now()}-${crypto
    .randomUUID()
    .replace(/-/g, '')
    .slice(0, 10)}`;
}

/*
  Paid tutor sessions are sold in USD.

  This allows the same international-payment
  setup to support both:
  - International credit/debit cards
  - PayPal
*/
function getPrice(
  sessionType: SessionType
) {
  if (sessionType === 'trial10') {
    return 0;
  }

  const raw =
    sessionType === 'paid30'
      ? runtimeEnv.TUTOR_PAID_30_PRICE_USD
      : runtimeEnv.TUTOR_PAID_50_PRICE_USD;

  const amount = Number(raw);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return null;
  }

  /*
    Toss USD payments support
    up to 2 decimal places.
  */
  return Math.round(amount * 100) / 100;
}

export const GET: APIRoute = async () => {
  return json({
    ok: true,
    service: 'sik-tutor-booking',

    paymentOptions: [
      'international_card',
      'paypal',
    ],

    sessions: {
      trial10: {
        durationMinutes: 10,
        price: 0,
        currency: 'USD',
      },

      paid30: {
        durationMinutes: 30,
        price:
          getPrice('paid30'),
        currency: 'USD',
        priceConfigured:
          getPrice('paid30') !== null,
      },

      paid50: {
        durationMinutes: 50,
        price:
          getPrice('paid50'),
        currency: 'USD',
        priceConfigured:
          getPrice('paid50') !== null,
      },
    },
  });
};

export const POST: APIRoute = async ({
  request,
}) => {
  if (
    !projectId ||
    !runtimeEnv.SANITY_API_TOKEN
  ) {
    return json(
      {
        ok: false,
        error:
          'Tutor booking service is not configured.',
      },
      503
    );
  }

  let input: any;

  try {
    input =
      await request.json();
  } catch {
    return json(
      {
        ok: false,
        error:
          'Request body must be valid JSON.',
      },
      400
    );
  }

  const slotId =
    cleanString(
      input.slotId,
      150
    );

  const sessionType =
    cleanString(
      input.sessionType,
      30
    ) as SessionType;

  const studentName =
    cleanString(
      input.studentName,
      100
    );

  const studentEmail =
    cleanString(
      input.studentEmail,
      160
    ).toLowerCase();

  const contactMethod =
    cleanString(
      input.contactMethod,
      30
    ) || 'email';

  const contactId =
    cleanString(
      input.contactId,
      160
    );

  const level =
    cleanString(
      input.level,
      30
    );

  const practiceGoal =
    cleanString(
      input.practiceGoal,
      50
    );

  const studentNote =
    cleanString(
      input.studentNote,
      1000
    );

  if (!slotId) {
    return json(
      {
        ok: false,
        error:
          'Please select a lesson time.',
      },
      400
    );
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      SESSION_CONFIG,
      sessionType
    )
  ) {
    return json(
      {
        ok: false,
        error:
          'Invalid session type.',
      },
      400
    );
  }

  if (!studentName) {
    return json(
      {
        ok: false,
        error:
          'Please enter your name.',
      },
      400
    );
  }

  if (
    !studentEmail ||
    !validEmail(studentEmail)
  ) {
    return json(
      {
        ok: false,
        error:
          'Please enter a valid email address.',
      },
      400
    );
  }

  const allowedContactMethods =
    new Set([
      'email',
      'whatsapp',
      'kakao',
    ]);

  if (
    !allowedContactMethods.has(
      contactMethod
    )
  ) {
    return json(
      {
        ok: false,
        error:
          'Invalid contact method.',
      },
      400
    );
  }

  const session =
    SESSION_CONFIG[
      sessionType
    ];

  const amount =
    getPrice(sessionType);

  if (
    session.paid &&
    amount === null
  ) {
    return json(
      {
        ok: false,
        error:
          'Paid lesson pricing is not configured yet.',
      },
      503
    );
  }

  const client =
    createClient({
      projectId,
      dataset,
      apiVersion:
        '2026-10-01',
      useCdn: false,
      token:
        runtimeEnv.SANITY_API_TOKEN,
    });

  try {
    const slot =
      await client.fetch(
        `
        *[
          _type == "tutorSlot" &&
          _id == $slotId
        ][0]{
          _id,
          _rev,
          startsAt,
          endsAt,
          status,
          trialAllowed,
          paidAllowed
        }
        `,
        {
          slotId,
        }
      );

    if (!slot) {
      return json(
        {
          ok: false,
          error:
            'This lesson time could not be found.',
        },
        404
      );
    }

    if (
      slot.status !== 'open'
    ) {
      return json(
        {
          ok: false,
          error:
            'This time is no longer available. Please choose another time.',
        },
        409
      );
    }

    const start =
      new Date(
        slot.startsAt
      );

    const end =
      new Date(
        slot.endsAt
      );

    if (
      Number.isNaN(
        start.getTime()
      ) ||
      Number.isNaN(
        end.getTime()
      )
    ) {
      return json(
        {
          ok: false,
          error:
            'This lesson time is invalid.',
        },
        400
      );
    }

    if (
      start.getTime() <=
      Date.now()
    ) {
      return json(
        {
          ok: false,
          error:
            'This lesson time has already passed.',
        },
        409
      );
    }

    const availableMinutes =
      Math.round(
        (
          end.getTime() -
          start.getTime()
        ) /
          60000
      );

    if (
      availableMinutes <
      session.durationMinutes
    ) {
      return json(
        {
          ok: false,
          error:
            'This time slot is too short for the selected lesson.',
        },
        409
      );
    }

    if (
      sessionType ===
        'trial10' &&
      slot.trialAllowed !==
        true
    ) {
      return json(
        {
          ok: false,
          error:
            'Free trial is not available at this time.',
        },
        409
      );
    }

    if (
      session.paid &&
      slot.paidAllowed !==
        true
    ) {
      return json(
        {
          ok: false,
          error:
            'Paid lessons are not available at this time.',
        },
        409
      );
    }

    const now =
      new Date()
        .toISOString();

    const code =
      bookingCode();

    const id =
      bookingId();

    const orderId =
      session.paid
        ? paymentOrderId()
        : undefined;

    /*
      FREE TRIAL
      → Confirmed immediately

      PAID LESSON
      → Slot is held
      → User chooses International Card or PayPal
      → Payment confirmation
      → Booking becomes confirmed
    */
    const bookingStatus =
      session.paid
        ? 'awaiting_payment'
        : 'confirmed';

    const paymentStatus =
      session.paid
        ? 'pending'
        : 'not_required';

    const slotStatus =
      session.paid
        ? 'held'
        : 'booked';

    const document = {
      _id: id,

      _type:
        'tutorBooking',

      bookingCode:
        code,

      sessionType,

      bookingStatus,

      paymentStatus,

      slot: {
        _type:
          'reference',
        _ref:
          slot._id,
      },

      startsAt:
        slot.startsAt,

      durationMinutes:
        session.durationMinutes,

      studentName,

      studentEmail,

      contactMethod,

      contactId:
        contactId ||
        undefined,

      level:
        level ||
        undefined,

      practiceGoal:
        practiceGoal ||
        undefined,

      studentNote:
        studentNote ||
        undefined,

      amount:
        amount ?? 0,

      /*
        International Card + PayPal
        use USD.
      */
      currency:
        'USD',

      orderId,

      createdAt:
        now,
    };

    /*
      Prevent two people from
      booking the same tutor slot.
    */
    const slotPatch =
      client
        .patch(slot._id)
        .ifRevisionId(
          slot._rev
        )
        .set({
          status:
            slotStatus,
        });

    await client
      .transaction()
      .create(document)
      .patch(slotPatch)
      .commit();

    return json(
      {
        ok: true,

        booking: {
          id,

          bookingCode:
            code,

          sessionType,

          bookingStatus,

          paymentStatus,

          startsAt:
            slot.startsAt,

          durationMinutes:
            session.durationMinutes,

          amount:
            amount ?? 0,

          currency:
            'USD',

          orderId:
            orderId ||
            null,

          paymentRequired:
            session.paid,

          paymentOptions:
            session.paid
              ? [
                  'international_card',
                  'paypal',
                ]
              : [],
        },

        next:
          session.paid
            ? 'payment'
            : 'confirmed',
      },
      201
    );
  } catch (error: any) {
    const message =
      error?.message ||
      '';

    if (
      message
        .toLowerCase()
        .includes(
          'revision'
        ) ||
      error?.statusCode ===
        409
    ) {
      return json(
        {
          ok: false,
          error:
            'Someone just booked this time. Please choose another available time.',
        },
        409
      );
    }

    return json(
      {
        ok: false,
        error:
          'Could not create the booking.',
      },
      500
    );
  }
};
