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

const sessionDurations: Record<string, number> = {
  trial10: 10,
  paid30: 30,
  paid50: 50,
};

export const GET: APIRoute = async ({
  request,
}) => {
  if (!projectId) {
    return json(
      {
        ok: false,
        error:
          'Sanity project is not configured.',
      },
      503
    );
  }

  const url = new URL(request.url);

  const sessionType =
    url.searchParams.get('sessionType') || '';

  if (
    sessionType &&
    !Object.keys(sessionDurations).includes(
      sessionType
    )
  ) {
    return json(
      {
        ok: false,
        error: 'Invalid session type.',
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
      runtimeEnv.SANITY_API_TOKEN ||
      undefined,
  });

  try {
    const slots = await client.fetch(
      `
      *[
        _type == "tutorSlot" &&
        status == "open" &&
        startsAt > now()
      ]
      | order(startsAt asc)
      [0...100]
      {
        _id,
        startsAt,
        endsAt,
        trialAllowed,
        paidAllowed
      }
      `
    );

    const requiredDuration =
      sessionType
        ? sessionDurations[sessionType]
        : 0;

    const filteredSlots = slots
      .map((slot: any) => {
        const start =
          new Date(slot.startsAt);

        const end =
          new Date(slot.endsAt);

        const durationMinutes =
          Math.round(
            (
              end.getTime() -
              start.getTime()
            ) /
              60000
          );

        return {
          id: slot._id,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          durationMinutes,
          trialAllowed:
            slot.trialAllowed === true,
          paidAllowed:
            slot.paidAllowed === true,
        };
      })
      .filter((slot: any) => {
        if (!sessionType) {
          return true;
        }

        if (
          slot.durationMinutes <
          requiredDuration
        ) {
          return false;
        }

        if (
          sessionType === 'trial10'
        ) {
          return slot.trialAllowed;
        }

        return slot.paidAllowed;
      });

    return json({
      ok: true,
      timezone: 'Asia/Seoul',
      sessionType:
        sessionType || null,
      slots: filteredSlots,
    });
  } catch (error: any) {
    return json(
      {
        ok: false,
        error:
          error?.message ||
          'Could not load tutor availability.',
      },
      500
    );
  }
};
