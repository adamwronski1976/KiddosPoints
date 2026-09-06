/** Zgaduje pasującą ikonę (emoji) na podstawie nazwy zadania/nagrody, żeby
 *  nowe pozycje miały od razu sensowną ikonę zamiast pustego pola. Admin
 *  zawsze może ją nadpisać ręcznie. */

const TASK_KEYWORDS: [RegExp, string][] = [
  [/zmywark/i, '🍽️'],
  [/naczy/i, '🍽️'],
  [/pranie|suszark/i, '🧺'],
  [/łazienk/i, '🛁'],
  [/śmieci|bio|plastik|papier|szkł/i, '🗑️'],
  [/trawnik|ogr[oó]d|chwast/i, '🌱'],
  [/śnieg|odśnież/i, '❄️'],
  [/podłog/i, '🧹'],
  [/kurz/i, '🪶'],
  [/biurk/i, '🗂️'],
  [/ubra/i, '👕'],
  [/pralk/i, '🌀'],
  [/akwari/i, '🐠'],
  [/blat|stół|posiłk/i, '🧽'],
  [/schod/i, '🪜'],
  [/lustr/i, '🪞'],
  [/drzwi|włączni/i, '🚪'],
  [/pościel|materac/i, '🛏️'],
  [/szaf/i, '👔'],
  [/gara[żz]|kotłowni/i, '🚗'],
  [/porządk/i, '✨'],
  [/wiatrołap/i, '🚪'],
  [/librus|zadań domowych/i, '📚'],
  [/klas[oó]wk|sprawdzian/i, '📝'],
  [/plecak/i, '🎒'],
  [/książk/i, '📖'],
  [/angielsk/i, '🇬🇧'],
  [/hiszpańsk/i, '🇪🇸'],
  [/siłowni/i, '🏋️'],
  [/programowani/i, '💻'],
  [/tus\b/i, '🧩'],
  [/badminton/i, '🏸'],
  [/basen/i, '🏊'],
];

const REWARD_KEYWORDS: [RegExp, string][] = [
  [/komputer/i, '💻'],
  [/tv|telewizj/i, '📺'],
  [/youtube|instagram|telefon/i, '📱'],
  [/słodycz|cukierk/i, '🍬'],
  [/lod[oy]|bubble/i, '🍦'],
  [/kino|film|seans/i, '🎬'],
  [/spa[ćc]|budzik/i, '😴'],
  [/kieszonkow|gotówk|wypłat/i, '💰'],
  [/gr[ay]\b|gier/i, '🎮'],
  [/robux|v-dolc|waluty/i, '🪙'],
  [/książk|manga|komiks/i, '📚'],
  [/menu|obiad|jedzeni/i, '🍽️'],
  [/wycieczk/i, '🚌'],
  [/rodzic|sam na sam/i, '❤️'],
  [/muzyk/i, '🎵'],
  [/samoch[oó]d|podw[oó]zk|szofer/i, '🚗'],
  [/śniadani/i, '🥐'],
  [/cisz/i, '🤫'],
  [/spacer|wyjści/i, '🚶'],
];

function guess(name: string, table: [RegExp, string][], fallback: string): string {
  for (const [re, icon] of table) {
    if (re.test(name)) return icon;
  }
  return fallback;
}

export const guessTaskIcon = (name: string) => guess(name, TASK_KEYWORDS, '📌');
export const guessRewardIcon = (name: string) => guess(name, REWARD_KEYWORDS, '🎁');
