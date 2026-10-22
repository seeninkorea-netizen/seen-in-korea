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

function getPrice(
  sessionType: SessionType
) {
  if (sessionType === 'trial10') {
    return 0;
  }

  const raw =
    sessionType === 'paid30'
      ? runtimeEnv.TUTOR_PAID_30_PRICE_KRW
      : runtimeEnv.TUTOR_PAID_50_PRICE_KRW;

  const amount = Number(raw);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return null;
  }

  return Math.round(amount);
}

export const GET: APIRoute = async () => {
  return json({
    ok: true,
    service: 'sik-tutor-booking',
    sessions: {
      trial10: {
        durationMinutes: 10,
        price: 0,
        currency: 'KRW',
      },
      paid30: {
        durationMinutes: 30,
        priceConfigured: Boolean(
          getPrice('paid30')
        ),
      },
      paid50: {
        durationMinutes: 50,
        priceConfigured: Boolean(
          getPrice('paid50')
        ),
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
    input = await request.json();
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
    cleanString(input.slotId, 150);

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
    SESSION_CONFIG[sessionType];

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

  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2026-10-01',
    useCdn: false,
    token:
      runtimeEnv.SANITY_API_TOKEN,
  });

  try {
    /*
      _rev까지 가져와서
      동시에 두 사람이 같은 시간을
      예약하는 것을 방지합니다.
    */
    const slot = await client.fetch(
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
      new Date(slot.startsAt);

    const end =
      new Date(slot.endsAt);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
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
      start.getTime() <= Date.now()
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
      sessionType === 'trial10' &&
      slot.trialAllowed !== true
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
      slot.paidAllowed !== true
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
      new Date().toISOString();

    const code =
      bookingCode();

    const id =
      bookingId();

    const orderId =
      session.paid
        ? paymentOrderId()
        : undefined;

    /*
      무료 Trial:
      바로 Confirmed + Booked

      유료 Lesson:
      Awaiting Payment + Held
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
      _type: 'tutorBooking',

      bookingCode: code,

      sessionType,

      bookingStatus,

      paymentStatus,

      slot: {
        _type: 'reference',
        _ref: slot._id,
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

      currency: 'KRW',

      orderId,

      createdAt: now,
    };

    /*
      Optimistic locking.

      우리가 읽은 이후 누군가 같은 슬롯을
      먼저 예약했다면 _rev가 바뀌므로
      전체 transaction이 실패합니다.

      따라서 중복예약이 방지됩니다.
    */
    const slotPatch = client
      .patch(slot._id)
      .ifRevisionId(slot._rev)
      .set({
        status: slotStatus,
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
          bookingCode: code,

          sessionType,

          bookingStatus,

          paymentStatus,

          startsAt:
            slot.startsAt,

          durationMinutes:
            session.durationMinutes,

          amount:
            amount ?? 0,

          currency: 'KRW',

          orderId:
            orderId || null,

          paymentRequired:
            session.paid,
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
      error?.message || '';

    /*
      동일 슬롯을 거의 동시에
      예약한 경우 revision conflict 발생.
    */
    if (
      message
        .toLowerCase()
        .includes('revision') ||
      error?.statusCode === 409
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
