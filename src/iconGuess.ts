/** Zgaduje pasującą ikonę Material Design (mdi:*) na podstawie nazwy
 *  zadania/nagrody, żeby nowe pozycje miały od razu sensowną ikonę zamiast
 *  pustego pola. Admin zawsze może wpisać własną mdi:* ręcznie. */

const TASK_KEYWORDS: [RegExp, string][] = [
  [/zmywark|naczy/i, 'mdi:dishwasher'],
  [/pranie|prania/i, 'mdi:washing-machine'],
  [/łazienk.*doln/i, 'mdi:toilet'],
  [/łazienk.*g[oó]rn/i, 'mdi:shower-head'],
  [/łazienk/i, 'mdi:shower-head'],
  [/swojego pokoju/i, 'mdi:bed-outline'],
  [/śmieci.*zmieszan/i, 'mdi:trash-can'],
  [/śmieci.*bio/i, 'mdi:recycle'],
  [/śmieci/i, 'mdi:trash-can-outline'],
  [/trawnik/i, 'mdi:mower'],
  [/ogr[oó]d.*sezoni|sezoni.*ogr[oó]d|sprzątanie ogrodu/i, 'mdi:rake'],
  [/śnieg|odśnież/i, 'mdi:snowflake'],
  [/podłog/i, 'mdi:mop'],
  [/wiatrołap/i, 'mdi:door'],
  [/kurz/i, 'mdi:feather'],
  [/biurk/i, 'mdi:desk'],
  [/brudnych ubra/i, 'mdi:basket-outline'],
  [/pielenie/i, 'mdi:sprout'],
  [/pralk/i, 'mdi:tumble-dryer-alert'],
  [/zmywark.*czyszcz|czyszczeni.*zmywark/i, 'mdi:silverware-clean'],
  [/suszark/i, 'mdi:tumble-dryer'],
  [/akwari/i, 'mdi:fish'],
  [/blat|st[oó]ł/i, 'mdi:table-furniture'],
  [/schod/i, 'mdi:stairs'],
  [/lustr/i, 'mdi:mirror'],
  [/drzwi|włączni/i, 'mdi:light-switch'],
  [/pościel i pow|zmiana pościeli/i, 'mdi:bed'],
  [/wietrzenie/i, 'mdi:air-filter'],
  [/segregowani|czystych ubra/i, 'mdi:wardrobe'],
  [/gara[żz]|kotłowni/i, 'mdi:garage'],
  [/chwast/i, 'mdi:scissors-cutting'],
  [/porządki kuchni/i, 'mdi:countertop'],
  [/porządki salonu/i, 'mdi:sofa'],
  [/porządki gabinetu/i, 'mdi:bookshelf'],
  [/porządk/i, 'mdi:spray-bottle'],
  [/but[oó]w dzieci|przegląd ubra/i, 'mdi:shoe-sneaker'],
  [/librus|zadań domowych/i, 'mdi:notebook-edit'],
  [/klas[oó]wk|sprawdzian/i, 'mdi:school'],
  [/plecak/i, 'mdi:bag-personal'],
  [/książk/i, 'mdi:book-open-page-variant'],
  [/angielsk/i, 'mdi:flag-variant-outline'],
  [/hiszpańsk/i, 'mdi:translate'],
  [/siłowni/i, 'mdi:dumbbell'],
  [/programowani/i, 'mdi:code-braces'],
  [/\btus\b/i, 'mdi:account-group'],
  [/badminton/i, 'mdi:badminton'],
  [/basen/i, 'mdi:swim'],
];

const REWARD_KEYWORDS: [RegExp, string][] = [
  [/komputera.*30|30.*komputera/i, 'mdi:timer-plus-outline'],
  [/komputer/i, 'mdi:laptop'],
  [/tv.*30|30.*tv/i, 'mdi:tv-clock'],
  [/tv|telewizj/i, 'mdi:television'],
  [/youtube|instagram|telefon/i, 'mdi:cellphone-play'],
  [/słodycz|cukierk/i, 'mdi:candy'],
  [/kino|film.*seans|nocny seans/i, 'mdi:ticket'],
  [/spa[ćc]|budzik/i, 'mdi:weather-night'],
  [/zwolnieni.*obowiązk/i, 'mdi:shield-check'],
  [/bez budzika|bez porannych/i, 'mdi:alarm-off'],
  [/veto/i, 'mdi:close-octagon'],
  [/robux|v-dolc|waluty/i, 'mdi:circle-multiple'],
  [/kieszonkow|gotówk|wypłat/i, 'mdi:cash-fast'],
  [/nowej gry/i, 'mdi:gamepad-variant'],
  [/książk|manga|komiks|gadżet|zabawk/i, 'mdi:gift'],
  [/menu.*obiad/i, 'mdi:silverware-fork-knife'],
  [/dostawą|zam[oó]wieni.*jedzeni/i, 'mdi:food-takeout-box'],
  [/lod[oy]|bubble/i, 'mdi:ice-cream'],
  [/przekąsek|popcorn/i, 'mdi:popcorn'],
  [/sam na sam|wybranym rodzicem/i, 'mdi:account-heart'],
  [/wiecz[oó]r gier|wideo/i, 'mdi:dice-multiple'],
  [/szofer|podw[oó]zk/i, 'mdi:car-side'],
  [/śniadani/i, 'mdi:tray-full'],
  [/cisz/i, 'mdi:door-closed-lock'],
  [/muzyk/i, 'mdi:music-note-bluetooth'],
  [/wycieczk/i, 'mdi:wallet-plus'],
  [/przełożeni.*termin/i, 'mdi:calendar-clock'],
  [/bez pytania o szkoł/i, 'mdi:comment-off'],
  [/spacer|wyjści.*rodzinn/i, 'mdi:home-export-outline'],
];

const PENALTY_KEYWORDS: [RegExp, string][] = [
  [/pracy domowej|zadań domowych|librus/i, 'mdi:notebook-remove-outline'],
  [/uwag.*zachowani|przeszkadzani/i, 'mdi:message-alert-outline'],
  [/wulgaryzm|agresj[eę] słown|agresj[eę] fizyczn/i, 'mdi:emoticon-angry-outline'],
  [/niszczeni.*mieni|cudzych rzeczy/i, 'mdi:hammer-wrench'],
  [/spóźnieni/i, 'mdi:clock-alert-outline'],
  [/plecak/i, 'mdi:bag-personal-off-outline'],
  [/stroju na wf|legitymacj|obuwia zmienne/i, 'mdi:shoe-sneaker'],
  [/ukrywani.*ocen|zatajeni/i, 'mdi:eye-off-outline'],
  [/nieprzygotowani/i, 'mdi:book-alert-outline'],
  [/naczy/i, 'mdi:silverware-variant'],
  [/brudnych ubra/i, 'mdi:basket-off-outline'],
  [/łóżku|przy komputerze wbrew/i, 'mdi:food-off-outline'],
  [/bójk|prowokowani|agresj[aę] fizyczn/i, 'mdi:boxing-glove'],
  [/bez pukania|prywatnoś/i, 'mdi:door-closed-lock'],
  [/pyskowani|trzaskani.*drzwi|podnoszeni.*głos/i, 'mdi:volume-high'],
  [/ignorowani/i, 'mdi:ear-hearing-off'],
  [/pójści.*spa[ćc]|ustalonej godzin/i, 'mdi:bed-clock'],
  [/limitu.*komputer|konsoli|tv bez zgod/i, 'mdi:timer-off-outline'],
  [/telefonu.*noc|tablet.*noc/i, 'mdi:cellphone-off'],
];

function guess(name: string, table: [RegExp, string][], fallback: string): string {
  for (const [re, icon] of table) {
    if (re.test(name)) return icon;
  }
  return fallback;
}

export const guessTaskIcon = (name: string) => guess(name, TASK_KEYWORDS, 'mdi:checkbox-marked-circle-outline');
export const guessRewardIcon = (name: string) => guess(name, REWARD_KEYWORDS, 'mdi:gift-outline');
export const guessPenaltyIcon = (name: string) => guess(name, PENALTY_KEYWORDS, 'mdi:alert-circle-outline');
