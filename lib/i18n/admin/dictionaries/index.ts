import type { AdminDictionary, AdminLocale } from "../types";
import ja from "./ja";
import zh from "./zh";
import en from "./en";

export const adminDictionaries: Record<AdminLocale, AdminDictionary> = {
  ja,
  zh,
  en,
};

export default adminDictionaries;
