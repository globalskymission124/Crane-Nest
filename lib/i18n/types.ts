// =========================================================
// 多言語対応: 型定義
// 対応言語: 日本語(ja) / 英語(en) / 中国語簡体字(zh) / スペイン語(es) / フランス語(fr) / 韓国語(ko)
// =========================================================

export type Locale = "ja" | "en" | "zh" | "es" | "fr" | "ko";

export const DEFAULT_LOCALE: Locale = "en";

// 言語切替UIに表示する候補一覧（その言語自身の表記で表示する = ネイティブネーム）
export const LOCALE_OPTIONS: { code: Locale; nativeName: string }[] = [
  { code: "ja", nativeName: "日本語" },
  { code: "en", nativeName: "English" },
  { code: "zh", nativeName: "中文" },
  { code: "es", nativeName: "Español" },
  { code: "fr", nativeName: "Français" },
  { code: "ko", nativeName: "한국어" },
];

export interface Dictionary {
  stepLabel: (current: number, total: number) => string;

  passport: {
    title: string;
    description: string;
    uploadCta: string;
    uploadAlt: string;
    processing: string;
    recognized: string;
    reviewHint: string;
    fullNameLabel: string;
    passportNumberLabel: string;
    phoneNumberLabel: string;
    phoneNumberPlaceholder: string;
    retake: string;
    next: string;
  };

  transfer: {
    title: string;
    description: string;
    transferDateLabel: string;
    transferDateNote: string;
    roomLabel: string;
    roomLoading: string;
    destinationLabel: string;
    destinationLoading: string;
    flightTimeLabel: string;
    flightTimeOptionalBadge: string;
    flightTimeOptionalNote: string;
    suggestion: (time: string) => string;
    preferredDepartureTimeLabel: string;
    preferredDepartureTimeNote: string;
    checkoutNote: string;
    luggageSectionLabel: string;
    passengerLabel: string;
    luggageLargeLabel: string;
    luggageSmallLabel: string;
    luggageSpecialLabel: string;
    back: string;
    confirm: string;
  };

  complete: {
    title: string;
    description: string;
    boardingPass: string;
    transferTo: (destination: string) => string;
    guestNameLabel: string;
    guestFallbackName: string;
    roomLabel: string;
    preferredDepartureLabel: string;
    suggestedDepartureLabel: string;
    specifiedDepartureLabel: string;
    flightTimeLabel: string;
    bookingRefLabel: string;
    passengerCount: (n: number) => string;
    luggageTotal: (n: number) => string;
    destinationPhotoLabel: string;
    roomPhotoLabel: string;
    luggageBreakdownLabel: string;
    qrHint: string;
    note1: string;
    note2: string;
  };

  counter: {
    increase: (label: string) => string;
    decrease: (label: string) => string;
  };

  languageSwitcher: {
    label: string;
  };
}
