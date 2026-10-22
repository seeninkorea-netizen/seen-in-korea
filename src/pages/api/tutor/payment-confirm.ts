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

  return value
    .trim()
    .slice(0, max);
}

function toCents(
  value: unknown
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return null;
  }

  return Math.round(
    number * 100
  );
}

export const GET: APIRoute =
  async () => {
    return json({
      ok: true,

      service:
        'sik-tutor-payment-confirm',

      currency:
        'USD',

      supportedPayments: [
        'international_card',
        'paypal',
      ],

      configured: {
        sanity:
          Boolean(
            projectId &&
            runtimeEnv.SANITY_API_TOKEN
          ),

        tossPayments:
          Boolean(
            runtimeEnv.TOSS_SECRET_KEY
          ),
      },
    });
  };

export const POST: APIRoute =
  async ({
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

    if (
      !runtimeEnv.TOSS_SECRET_KEY
    ) {
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

    if (
      !paymentKey ||
      !orderId
    ) {
      return json(
        {
          ok: false,

          error:
            'paymentKey and orderId are required.',
        },
        400
      );
    }

    const client =
      createClient({
        projectId,

        dataset,

        apiVersion:
          '2026-10-01',

        useCdn:
          false,

        token:
          runtimeEnv.SANITY_API_TOKEN,
      });

    try {
      /*
        Never trust the amount
        returned from the browser.

        The booking amount stored
        on the server is the source
        of truth.
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
        Prevent duplicate confirmation
        when the customer refreshes
        the success page.
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

            alreadyConfirmed:
              true,

            booking: {
              bookingCode:
                booking.bookingCode,

              bookingStatus:
                booking.bookingStatus,

              paymentStatus:
                booking.paymentStatus,

              startsAt:
                booking.slot
                  ?.startsAt,

              amount:
                booking.amount,

              currency:
                booking.currency,
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
        Number(
          booking.amount
        );

      if (
        !Number.isFinite(
          amount
        ) ||
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

      /*
        Seen in Korea tutor
        international payments
        use USD.

        USD MID:
        - International Card
        - PayPal
      */
      if (
        booking.currency !==
        'USD'
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
        Toss Payments API authentication.

        Base64:
        SECRET_KEY + ":"

        The Secret Key never goes
        to the browser.
      */
      const encodedSecret =
        btoa(
          `${runtimeEnv.TOSS_SECRET_KEY}:`
        );

      const tossResponse =
        await fetch(
          'https://api.tosspayments.com/v1/payments/confirm',
          {
            method:
              'POST',

            headers: {
              Authorization:
                `Basic ${encodedSecret}`,

              'Content-Type':
                'application/json',

              'Accept-Language':
                'en-US',

              'Idempotency-Key':
                orderId,
            },

            body:
              JSON.stringify({
                paymentKey,

                orderId,

                /*
                  Server-stored
                  USD amount.
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
        payment =
          null;
      }

      if (
        !tossResponse.ok
      ) {
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

          tossResponse.status >=
          400
            ? tossResponse.status
            : 400
        );
      }

      /*
        Verify order ID.
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

      /*
        Verify USD currency.
      */
      if (
        payment?.currency !==
        'USD'
      ) {
        return json(
          {
            ok: false,

            error:
              'Payment currency verification failed.',
          },
          409
        );
      }

      /*
        USD supports decimals.

        Convert both values to cents
        before comparing to avoid
        floating-point errors.
      */
      const expectedCents =
        toCents(amount);

      const paidCents =
        toCents(
          payment?.totalAmount
        );

      if (
        expectedCents === null ||
        paidCents === null ||
        expectedCents !==
          paidCents
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
        Only completed payments
        confirm the tutor booking.
      */
      if (
        payment?.status !==
        'DONE'
      ) {
        return json(
          {
            ok: false,

            error:
              'Payment has not been completed.',

            paymentStatus:
              payment?.status ||
              null,
          },
          409
        );
      }

      /*
        Payment confirmed.

        Booking:
        awaiting_payment
        → confirmed

        Payment:
        pending
        → paid

        Slot:
        held
        → booked
      */
      const bookingPatch =
        client
          .patch(
            booking._id
          )
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
            status:
              'booked',
          });

      try {
        await client
          .transaction()
          .patch(
            bookingPatch
          )
          .patch(
            slotPatch
          )
          .commit();
      } catch {
        /*
          Toss payment may already
          be successfully completed
          even if Sanity encounters
          a revision conflict.

          Re-read the booking first.
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

              "slotId":
                slot._ref
            }
            `,
            {
              id:
                booking._id,
            }
          );

        if (
          !(
            latest
              ?.paymentStatus ===
              'paid' &&

            latest
              ?.bookingStatus ===
              'confirmed' &&

            latest
              ?.paymentKey ===
              paymentKey
          )
        ) {
          /*
            Payment is already
            approved at Toss.

            Synchronize our booking
            record with that payment.
          */
          await client
            .transaction()
            .patch(
              booking._id,
              (
                patch
              ) =>
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
              (
                patch
              ) =>
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
            booking.slot
              .startsAt,

          amount,

          currency:
            'USD',
        },

        payment: {
          paymentKey:
            payment.paymentKey,

          orderId:
            payment.orderId,

          currency:
            payment.currency,

          method:
            payment.method ||
            null,

          status:
            payment.status,

          approvedAt:
            payment.approvedAt ||
            null,
        },

        next:
          'booking_confirmed',
      });
    } catch (
      error: any
    ) {
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
