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
  max = 250
) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, max);
}

export const GET: APIRoute = async () => {
  return json({
    ok: true,
    service:
      'sik-tutor-payment-confirm',
    configured: {
      sanity: Boolean(
        projectId &&
        runtimeEnv.SANITY_API_TOKEN
      ),
      tossPayments: Boolean(
        runtimeEnv.TOSS_SECRET_KEY
      ),
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

  if (!runtimeEnv.TOSS_SECRET_KEY) {
    return json(
      {
        ok: false,
        error:
          'Payment service is not configured.',
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

  const paymentKey =
    cleanString(
      input.paymentKey,
      200
    );

  const orderId =
    cleanString(
      input.orderId,
      64
    );

  if (!paymentKey || !orderId) {
    return json(
      {
        ok: false,
        error:
          'paymentKey and orderId are required.',
      },
      400
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
      IMPORTANT:
      결제창에서 넘어온 amount를
      그대로 신뢰하지 않습니다.

      Sanity에 예약할 때 저장해둔
      amount를 다시 가져와서
      그 금액으로만 승인합니다.
    */
    const booking =
      await client.fetch(
        `
        *[
          _type == "tutorBooking" &&
          orderId == $orderId
        ][0]{
          _id,
          _rev,

          bookingCode,
          sessionType,

          bookingStatus,
          paymentStatus,

          amount,
          currency,

          orderId,
          paymentKey,

          "slot": slot->{
            _id,
            _rev,
            status,
            startsAt
          }
        }
        `,
        {
          orderId,
        }
      );

    if (!booking) {
      return json(
        {
          ok: false,
          error:
            'Booking could not be found.',
        },
        404
      );
    }

    /*
      이미 결제가 완료된 예약을
      success URL 새로고침 등으로
      다시 승인하지 않게 합니다.
    */
    if (
      booking.paymentStatus ===
        'paid' &&
      booking.bookingStatus ===
        'confirmed'
    ) {
      if (
        booking.paymentKey ===
        paymentKey
      ) {
        return json({
          ok: true,
          alreadyConfirmed: true,

          booking: {
            bookingCode:
              booking.bookingCode,

            bookingStatus:
              booking.bookingStatus,

            paymentStatus:
              booking.paymentStatus,

            startsAt:
              booking.slot?.startsAt,
          },
        });
      }

      return json(
        {
          ok: false,
          error:
            'This booking has already been paid with another payment.',
        },
        409
      );
    }

    if (
      booking.bookingStatus !==
        'awaiting_payment' ||
      booking.paymentStatus !==
        'pending'
    ) {
      return json(
        {
          ok: false,
          error:
            'This booking is not awaiting payment.',
        },
        409
      );
    }

    if (!booking.slot) {
      return json(
        {
          ok: false,
          error:
            'The reserved lesson time could not be found.',
        },
        409
      );
    }

    if (
      booking.slot.status !==
      'held'
    ) {
      return json(
        {
          ok: false,
          error:
            'This lesson time is no longer being held.',
        },
        409
      );
    }

    const amount =
      Number(booking.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return json(
        {
          ok: false,
          error:
            'Invalid booking amount.',
        },
        500
      );
    }

    if (
      booking.currency !== 'KRW'
    ) {
      return json(
        {
          ok: false,
          error:
            'Unsupported booking currency.',
        },
        400
      );
    }

    /*
      Toss Payments 서버 API 인증

      반드시:
      SECRET_KEY + ":"

      를 Base64 인코딩해야 합니다.

      Secret key는 브라우저에
      절대 보내지 않습니다.
    */
    const encodedSecret =
      btoa(
        `${runtimeEnv.TOSS_SECRET_KEY}:`
      );

    const tossResponse =
      await fetch(
        'https://api.tosspayments.com/v1/payments/confirm',
        {
          method: 'POST',

          headers: {
            Authorization:
              `Basic ${encodedSecret}`,

            'Content-Type':
              'application/json',

            'Accept-Language':
              'en-US',

            /*
              같은 orderId 승인 요청이
              네트워크 문제로 반복돼도
              중복 처리 위험을 줄입니다.
            */
            'Idempotency-Key':
              orderId,
          },

          body: JSON.stringify({
            paymentKey,
            orderId,

            /*
              브라우저가 보낸 amount가 아니라
              서버 저장 금액 사용
            */
            amount,
          }),
        }
      );

    let payment: any;

    try {
      payment =
        await tossResponse.json();
    } catch {
      payment = null;
    }

    if (!tossResponse.ok) {
      return json(
        {
          ok: false,

          error:
            payment?.message ||
            'Payment could not be confirmed.',

          code:
            payment?.code ||
            'PAYMENT_CONFIRM_FAILED',
        },
        tossResponse.status >= 400
          ? tossResponse.status
          : 400
      );
    }

    /*
      Toss 응답도 한 번 더 검증합니다.
    */
    if (
      payment?.orderId !==
      orderId
    ) {
      return json(
        {
          ok: false,
          error:
            'Payment order verification failed.',
        },
        409
      );
    }

    if (
      Number(
        payment?.totalAmount
      ) !== amount
    ) {
      return json(
        {
          ok: false,
          error:
            'Payment amount verification failed.',
        },
        409
      );
    }

    /*
      현재 Tutor 결제에서는
      즉시 결제 완료되는 방식만 사용합니다.

      DONE이 아닌 결제는
      수업 예약을 Confirm하지 않습니다.
    */
    if (
      payment?.status !== 'DONE'
    ) {
      return json(
        {
          ok: false,
          error:
            'Payment has not been completed.',
          paymentStatus:
            payment?.status || null,
        },
        409
      );
    }

    /*
      Toss 승인 성공

      Booking:
      awaiting_payment → confirmed
      pending → paid

      Slot:
      held → booked
    */
    const bookingPatch =
      client
        .patch(booking._id)
        .ifRevisionId(
          booking._rev
        )
        .set({
          bookingStatus:
            'confirmed',

          paymentStatus:
            'paid',

          paymentKey,
        });

    const slotPatch =
      client
        .patch(
          booking.slot._id
        )
        .ifRevisionId(
          booking.slot._rev
        )
        .set({
          status: 'booked',
        });

    try {
      await client
        .transaction()
        .patch(bookingPatch)
        .patch(slotPatch)
        .commit();
    } catch {
      /*
        결제는 이미 Toss에서 완료됐는데
        Sanity revision conflict 등이
        발생할 수 있습니다.

        이 경우 결제 상태가
        DB에서 누락되지 않도록
        한 번 더 현재 상태를 확인합니다.
      */
      const latest =
        await client.fetch(
          `
          *[
            _type == "tutorBooking" &&
            _id == $id
          ][0]{
            _id,
            paymentStatus,
            bookingStatus,
            paymentKey,
            "slotId": slot._ref
          }
          `,
          {
            id: booking._id,
          }
        );

      if (
        !(
          latest?.paymentStatus ===
            'paid' &&
          latest?.bookingStatus ===
            'confirmed' &&
          latest?.paymentKey ===
            paymentKey
        )
      ) {
        /*
          Toss 결제는 완료됐으므로
          예약 상태를 최종적으로
          결제 완료 상태와 맞춥니다.
        */
        await client
          .transaction()
          .patch(
            booking._id,
            (patch) =>
              patch.set({
                bookingStatus:
                  'confirmed',

                paymentStatus:
                  'paid',

                paymentKey,
              })
          )
          .patch(
            booking.slot._id,
            (patch) =>
              patch.set({
                status:
                  'booked',
              })
          )
          .commit();
      }
    }

    return json({
      ok: true,

      booking: {
        bookingCode:
          booking.bookingCode,

        bookingStatus:
          'confirmed',

        paymentStatus:
          'paid',

        sessionType:
          booking.sessionType,

        startsAt:
          booking.slot.startsAt,

        amount,

        currency: 'KRW',
      },

      payment: {
        paymentKey:
          payment.paymentKey,

        orderId:
          payment.orderId,

        method:
          payment.method || null,

        status:
          payment.status,

        approvedAt:
          payment.approvedAt ||
          null,
      },

      next:
        'booking_confirmed',
    });
  } catch (error: any) {
    return json(
      {
        ok: false,

        error:
          error?.message ||
          'Could not confirm payment.',
      },
      500
    );
  }
};
