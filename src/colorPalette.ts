/** Żywa, pozytywna paleta do kolorowania kafelków zadań/nagród - ma sprawiać
 *  wrażenie gry/nagrody, a nie nudnej listy "do zrobienia". Kolor jest
 *  deterministyczny (hash z id), więc dana pozycja zawsze wygląda tak samo. */
interface ColorSet {
  bg: string;
  text: string;
  ring: string;
}

const PALETTE: ColorSet[] = [
  { bg: 'bg-emerald-100', text: 'text-emerald-600', ring: 'ring-emerald-200' },
  { bg: 'bg-sky-100', text: 'text-sky-600', ring: 'ring-sky-200' },
  { bg: 'bg-amber-100', text: 'text-amber-600', ring: 'ring-amber-200' },
  { bg: 'bg-violet-100', text: 'text-violet-600', ring: 'ring-violet-200' },
  { bg: 'bg-rose-100', text: 'text-rose-600', ring: 'ring-rose-200' },
  { bg: 'bg-teal-100', text: 'text-teal-600', ring: 'ring-teal-200' },
  { bg: 'bg-orange-100', text: 'text-orange-600', ring: 'ring-orange-200' },
  { bg: 'bg-lime-100', text: 'text-lime-600', ring: 'ring-lime-200' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600', ring: 'ring-fuchsia-200' },
  { bg: 'bg-cyan-100', text: 'text-cyan-600', ring: 'ring-cyan-200' },
];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export const colorForId = (id: string): ColorSet => PALETTE[hash(id) % PALETTE.length];
