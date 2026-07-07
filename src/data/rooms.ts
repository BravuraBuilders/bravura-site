import type { RoomData } from '../lib/journey/types';

// Each room = an image sequence extracted from a wide-angle walkthrough; the
// camera flies INTO the space as the frame index increases, so scrolling down
// carries you deeper. Frames live in /public/frames/desktop/<id>/frame_NNNN.jpg
// (landscape sets only — portrait phones reuse them letterboxed).
// Order in this array = order in the journey.
export const rooms: RoomData[] = [
  {
    id: 'exterior',
    desktop: 222, // arrival + living-room push-in, decimated to every-other frame (was 443) for smooth decode on Safari; cross-dissolve keeps motion fluid
    focusX: 0.5, // image x-fraction held at screen center; raise → house shifts left, lower → right
    top: '#dcedfa', // documentary: the engine live-samples the frame's top edge instead
    kicker: 'The Home',
    title: 'Built to turn heads.',
    body: 'From the curb to the backyard — a home designed to be lived in, and impossible to ignore.',
  },
  {
    id: 'kitchen',
    desktop: 204,
    top: '#827b6a',
    kicker: 'The Kitchen',
    title: 'Where family comes together.',
    body: 'Walls come down and light pours in — the room where meals get made, the day gets shared, and everyone somehow ends up.',
  },
  {
    id: 'bathroom',
    desktop: 241,
    top: '#94948c',
    kicker: 'The Bath',
    title: 'Your everyday retreat.',
    body: 'Spa-grade materials, exacting tile work, and daylight framed like a view worth waking up to.',
  },
  {
    id: 'bedroom',
    desktop: 241,
    top: '#837a68',
    kicker: 'The Bedroom',
    title: 'Rest, reimagined.',
    body: 'Calm, considered rooms to end the day — where the details you never notice are the ones done right.',
  },
];

// Canonical contact info — the single source of truth for everything the site shows.
export const contact = {
  phone: '470-504-3420',
  phoneHref: 'tel:+14705043420',
  smsHref: 'sms:+14705043420',
  email: 'nano@bravurabuilders.com',
  emailHref: 'mailto:nano@bravurabuilders.com',
  address: '11720 Amber Park Dr, Alpharetta GA 30009',
};
