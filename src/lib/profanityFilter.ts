// Standard English profanity blocklist for the search bar.
// Not exhaustive and not a moderation system — purpose is to prevent the
// search input from echoing slurs/obscenities back to the user via the
// URL bar, result count, and "no results for ..." messaging.

const BLOCKED = [
  // sexual / scatological
  "shit", "shitty", "bullshit", "fuck", "fucker", "fucking", "fuckin",
  "motherfucker", "fck", "fuk", "fuq",
  "cock", "cocks", "dick", "dickhead", "prick", "pussy", "pussies",
  "cunt", "twat", "asshole", "ass", "arse", "bastard", "bitch", "bitches",
  "wank", "wanker", "jerkoff", "jackoff", "blowjob", "handjob",
  "boner", "cum", "jizz", "schlong", "tit", "tits", "titties",
  // slurs
  "faggot", "fag", "fags", "dyke", "tranny",
  "nigger", "nigga", "niggas", "chink", "spic", "kike", "wetback",
  "gook", "raghead", "towelhead", "retard", "retarded",
  // misc obscene compounds
  "cocksucker", "dipshit", "shithead", "shitfaced", "piss", "pissed",
  "douche", "douchebag",
];

// Build a single regex that matches any blocked term as a whole word,
// case-insensitive. Word boundaries prevent false positives like
// "Scunthorpe" or "assess".
const BLOCKED_REGEX = new RegExp(
  `\\b(?:${BLOCKED.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "i"
);

// Normalize common leetspeak (1->i, 0->o, 3->e, 4->a, 5->s, 7->t, @->a, $->s)
// before testing, to catch trivial bypasses like "sh1t" or "f4g".
function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/@/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    // collapse repeated letters: "fuuuck" -> "fuck"
    .replace(/(.)\1{2,}/g, "$1");
}

export function containsProfanity(input: string): boolean {
  if (!input) return false;
  return BLOCKED_REGEX.test(input) || BLOCKED_REGEX.test(normalize(input));
}
