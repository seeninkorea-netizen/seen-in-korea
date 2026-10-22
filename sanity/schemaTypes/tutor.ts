import { defineField, defineType } from 'sanity';

export const tutorSlot = defineType({
  name: 'tutorSlot',
  title: 'Tutor Availability',
  type: 'document',
  fields: [
    defineField({
      name: 'startsAt',
      title: 'Start time',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'endsAt',
      title: 'End time',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      initialValue: 'open',
      options: {
        layout: 'radio',
        list: [
          { title: 'Open', value: 'open' },
          { title: 'Held', value: 'held' },
          { title: 'Booked', value: 'booked' },
          { title: 'Blocked', value: 'blocked' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'trialAllowed',
      title: 'Allow 10-minute free trial',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'paidAllowed',
      title: 'Allow paid lesson',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'internalNote',
      title: 'Internal note',
      type: 'text',
      rows: 2,
    }),
  ],

  preview: {
    select: {
      startsAt: 'startsAt',
      endsAt: 'endsAt',
      status: 'status',
    },

    prepare({ startsAt, endsAt, status }) {
      const start = startsAt ? new Date(startsAt) : null;
      const end = endsAt ? new Date(endsAt) : null;

      const date = start
        ? new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(start)
        : 'No date';

      const time = start
        ? new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Seoul',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(start)
        : '--:--';

      const endTime = end
        ? new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Seoul',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(end)
        : '--:--';

      return {
        title: `${date} · ${time}–${endTime}`,
        subtitle: String(status || 'open').toUpperCase(),
      };
    },
  },
});

export const tutorBooking = defineType({
  name: 'tutorBooking',
  title: 'Tutor Bookings',
  type: 'document',

  fields: [
    defineField({
      name: 'bookingCode',
      title: 'Booking code',
      type: 'string',
      readOnly: true,
    }),

    defineField({
      name: 'sessionType',
      title: 'Session type',
      type: 'string',
      options: {
        list: [
          { title: '10-minute free trial', value: 'trial10' },
          { title: '30-minute lesson', value: 'paid30' },
          { title: '50-minute lesson', value: 'paid50' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'bookingStatus',
      title: 'Booking status',
      type: 'string',
      initialValue: 'requested',
      options: {
        layout: 'dropdown',
        list: [
          { title: 'Requested', value: 'requested' },
          { title: 'Awaiting payment', value: 'awaiting_payment' },
          { title: 'Confirmed', value: 'confirmed' },
          { title: 'Completed', value: 'completed' },
          { title: 'Cancelled', value: 'cancelled' },
          { title: 'No-show', value: 'no_show' },
          { title: 'Refunded', value: 'refunded' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'paymentStatus',
      title: 'Payment status',
      type: 'string',
      initialValue: 'not_required',
      options: {
        list: [
          { title: 'Not required', value: 'not_required' },
          { title: 'Pending', value: 'pending' },
          { title: 'Paid', value: 'paid' },
          { title: 'Failed', value: 'failed' },
          { title: 'Refunded', value: 'refunded' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'slot',
      title: 'Reserved slot',
      type: 'reference',
      to: [{ type: 'tutorSlot' }],
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'startsAt',
      title: 'Session start',
      type: 'datetime',
      readOnly: true,
    }),

    defineField({
      name: 'durationMinutes',
      title: 'Duration (minutes)',
      type: 'number',
      readOnly: true,
    }),

    defineField({
      name: 'studentName',
      title: 'Student name',
      type: 'string',
      validation: (Rule) => Rule.required().max(100),
    }),

    defineField({
      name: 'studentEmail',
      title: 'Student email',
      type: 'string',
      validation: (Rule) => Rule.required().email(),
    }),

    defineField({
      name: 'contactMethod',
      title: 'Preferred contact',
      type: 'string',
      options: {
        list: [
          { title: 'Email', value: 'email' },
          { title: 'WhatsApp', value: 'whatsapp' },
          { title: 'KakaoTalk', value: 'kakao' },
        ],
      },
      initialValue: 'email',
    }),

    defineField({
      name: 'contactId',
      title: 'WhatsApp number / KakaoTalk ID',
      type: 'string',
    }),

    defineField({
      name: 'level',
      title: 'Korean level',
      type: 'string',
      options: {
        list: [
          { title: 'Complete beginner', value: 'zero' },
          { title: 'Beginner', value: 'beginner' },
          { title: 'Intermediate', value: 'intermediate' },
          { title: 'Advanced', value: 'advanced' },
          { title: 'Not sure', value: 'unsure' },
        ],
      },
    }),

    defineField({
      name: 'practiceGoal',
      title: 'What they want to practice',
      type: 'string',
      options: {
        list: [
          { title: 'Travel', value: 'travel' },
          { title: 'Daily life in Korea', value: 'life' },
          { title: 'Work / Business', value: 'work' },
          { title: 'Friends / Dating', value: 'social' },
          { title: 'K-pop / Drama', value: 'culture' },
          { title: 'TOPIK', value: 'topik' },
          { title: 'Free conversation', value: 'free_talk' },
        ],
      },
    }),

    defineField({
      name: 'studentNote',
      title: 'Student note',
      type: 'text',
      rows: 3,
    }),

    defineField({
      name: 'amount',
      title: 'Amount',
      type: 'number',
      readOnly: true,
    }),

    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      initialValue: 'KRW',
      readOnly: true,
    }),

    defineField({
      name: 'orderId',
      title: 'Payment order ID',
      type: 'string',
      readOnly: true,
    }),

    defineField({
      name: 'paymentKey',
      title: 'Payment key',
      type: 'string',
      readOnly: true,
    }),

    defineField({
      name: 'createdAt',
      title: 'Created at',
      type: 'datetime',
      readOnly: true,
    }),

    defineField({
      name: 'adminNote',
      title: 'Admin note',
      type: 'text',
      rows: 3,
    }),
  ],

  preview: {
    select: {
      studentName: 'studentName',
      sessionType: 'sessionType',
      startsAt: 'startsAt',
      bookingStatus: 'bookingStatus',
    },

    prepare({
      studentName,
      sessionType,
      startsAt,
      bookingStatus,
    }) {
      const start = startsAt
        ? new Date(startsAt)
        : null;

      const when = start
        ? new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(start)
        : 'No slot';

      const typeLabel =
        sessionType === 'trial10'
          ? 'FREE TRIAL'
          : sessionType === 'paid30'
            ? '30 MIN'
            : sessionType === 'paid50'
              ? '50 MIN'
              : 'SESSION';

      return {
        title: `${studentName || 'New student'} · ${typeLabel}`,
        subtitle: `${when} · ${String(
          bookingStatus || 'requested'
        ).toUpperCase()}`,
      };
    },
  },
});
