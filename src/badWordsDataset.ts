// Optimized high-performance and low-memory dataset of forbidden words (125,000+ words/patterns)
import { badWordsList } from "./badWordsData";

const GOVNOED_FORMS = [
  "говноед", "говноеда", "говноеду", "говноедом", "говноеде",
  "говноеды", "говноедов", "говноедам", "говноедами", "говноедах",
  "говноедка", "говноедки", "говноедке", "говноедку", "говноедкой", "говноедок",
  "говноедина", "говноедины", "говноедине", "говноедину", "говноединой", "говноедин",
  "говноедище", "говноедища", "говноедищу", "говноедищем", "говноедищи",
  "говноедский", "говноедская", "говноедское", "говноедские", "говноедского", "говноедскому", "говноедским", "говноедских", "говноедскими", "говноедском",
  "говноедство", "говноедства", "говноедству", "говноедством", "говноедстве",
  "говноедствовать", "говноедствую", "говноедствует", "говноедствуют", "говноедствовал", "говноедствовала", "говноедствовали",
  "говноедик", "говноедика", "говноедику", "говноедиком", "говноедики", "говноедиков",
  "говноедишко", "говноедишка", "говноедишку", "говноедишком",
  "govnoed", "govnoyed", "gawnoed", "gavnoed", "gowneyed", "govnoeda", "govnoedu", "govnoedom", "govnoedy", "govnoedov",
  "говна", "говно", "говну", "говном", "говне", "говнище", "говнища", "говнищу", "говнищем", "говнищи",
  "говнюк", "говнюка", "говнюку", "говнюком", "говнюке", "говнюки", "говнюков", "говнюкам", "говнюками", "говнюках",
  "говнючка", "говнючки", "говнючке", "говнючку", "говнючкой", "говнючек",
  "говнятина", "говнятины", "говнятине", "говнятину", "говнятиной",
  "говняный", "говняная", "говняное", "говняные", "говняного", "говняному", "говняным", "говняных",
  "говнять", "заговнять", "обговнять", "изговнять", "разговнять", "переговнять"
];

const BASE_OBSCENE_STEMS = [
  "хуй", "хуя", "хуе", "хуи", "хую", "хуем", "хуё", "xui", "xyi", "hui", "huy",
  "пизд", "пизда", "pizd", "пезд", "пизж",
  "еб", "ёб", "ебат", "ебан", "ебли", "ебу", "ебо", "ebat", "ebal", "eblo", "ebuch", "yeb",
  "бля", "бляд", "blya", "blyad",
  "мудак", "мудил", "mudak",
  "пидор", "пидар", "педик", "pidor", "pidar", "pedik", "педрило",
  "гандон", "гондон", "gandon",
  "залуп", "zalup",
  "шлюх", "shlyuh", "курв", "kurwa", "давалк",
  "сука", "суч", "сучар", "suka",
  "чмо", "чмош", "chmo",
  "дроч", "droch",
  "манду", "манда", "манде", "мандой", "manda",
  "целка", "минет", "сиськ", "письк", "сперм", "жоп", "залуп", "говн", "перд", "дрис",
  "хач", "чурк", "ниггер", "нигер", "nigger", "nigga", "хохол", "жид", "москаль",
  "тцк", "tck", "tzk", "сво", "svo", "cvo"
];

function buildCompactBadWordsSet(): Set<string> {
  const set = new Set<string>();

  // Add all words from badWordsData (125,000+ words)
  if (Array.isArray(badWordsList)) {
    for (let i = 0; i < badWordsList.length; i++) {
      const w = badWordsList[i];
      if (w) set.add(w.toLowerCase());
    }
  }

  // Add all base and govnoed words
  for (const w of GOVNOED_FORMS) {
    set.add(w.toLowerCase());
  }

  for (const stem of BASE_OBSCENE_STEMS) {
    set.add(stem.toLowerCase());
  }

  return set;
}

export const EXTENDED_BAD_WORDS_SET = buildCompactBadWordsSet();
export const BAD_WORDS_ARRAY: string[] = Array.from(EXTENDED_BAD_WORDS_SET);

console.log(`[BadWordsDataset] Loaded ${EXTENDED_BAD_WORDS_SET.size} bad words in compact memory footprint.`);
