import type { Dictionary, Locale } from "../types";
import ja from "./ja";
import en from "./en";
import zh from "./zh";
import es from "./es";
import fr from "./fr";
import ko from "./ko";

export const dictionaries: Record<Locale, Dictionary> = { ja, en, zh, es, fr, ko };
