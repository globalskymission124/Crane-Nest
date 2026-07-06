// =========================================================
// 管理画面（バックエンド）用の多言語辞書の型定義。
// ゲスト向け Dictionary とは独立させ、管理者向けに必要な
// 日本語・中国語・英語の3言語のみをサポートする。
// =========================================================

export type AdminLocale = "ja" | "zh" | "en";

export const ADMIN_DEFAULT_LOCALE: AdminLocale = "ja";

export const ADMIN_LOCALE_OPTIONS: { code: AdminLocale; nativeName: string }[] = [
  { code: "ja", nativeName: "日本語" },
  { code: "zh", nativeName: "中文" },
  { code: "en", nativeName: "English" },
];

export interface AdminDictionary {
  brand: {
    title: string;
    subtitle: string;
    badge: string;
    logoAlt: string;
    heroAlt: string;
  };

  nav: {
    board: string;
    rooms: string;
    destinations: string;
    banners: string;
    records: string;
    settings: string;
  };

  pages: {
    board: { title: string; description: string };
    rooms: { title: string; description: string };
    destinations: { title: string; description: string };
    banners: { title: string; description: string };
    records: { title: string; description: string };
    settings: { title: string; description: string };
  };

  common: {
    loading: string;
    add: string;
    save: string;
    cancel: string;
    active: string;
    inactive: string;
    photoLabel: string;
    processingLabel: string;
    deleteLabel: string;
    displayOrder: (n: number) => string;
    moveUpAria: (name: string) => string;
    moveDownAria: (name: string) => string;
    uploadPhotoAria: (name: string) => string;
    removePhotoAria: (name: string) => string;
    photoAlt: (name: string) => string;
    editNameAria: (name: string) => string;
    saveAria: string;
    cancelAria: string;
    toggleAria: (name: string, makeActive: boolean) => string;
    deleteAria: (name: string) => string;
    confirmRemovePhoto: (label: string) => string;
    confirmDelete: (name: string) => string;
    photoUploadFailed: string;
    photoSaveFailed: string;
    photoRemoveFailed: string;
    imageReadFailed: string;
    orderChangeFailed: string;
    toggleFailed: string;
  };

  rooms: {
    namePlaceholder: string;
    emptyList: string;
    addFailed: string;
    nameRequired: string;
    nameUpdateFailed: string;
    deleteFailed: string;
    loadFailed: string;
    orderLabel: (n: number) => string;
  };

  destinations: {
    namePlaceholder: string;
    emptyList: string;
    addFailed: string;
    deleteFailed: string;
    loadFailed: string;
    setPriceLabel: string;
    priceInvalid: string;
    priceSaveFailed: string;
  };

  banners: {
    uploadButton: string;
    uploading: string;
    sizeHint: string;
    ratioWarning: (width: number, height: number, ratio: string) => string;
    emptyList: string;
    previewAlt: string;
    shown: string;
    hidden: string;
    toggleAria: (makeVisible: boolean) => string;
    moveUpAria: string;
    moveDownAria: string;
    deleteAria: string;
    confirmDelete: string;
    uploadFailed: string;
    insertFailed: string;
    deleteFailed: string;
    loadFailed: string;
    imageReadFailed: string;
  };

  board: {
    summary: (date: string, count: number) => string;
    heavyHint: (n: number) => string;
    laneCount: (n: number) => string;
    laneEmpty: string;
    loadFailed: string;
    todayBadge: string;
    tomorrowBadge: string;
    cardDepartureEstimate: (time: string) => string;
    cardFlight: (time: string) => string;
    cardDestinationFlight: (destination: string, time: string) => string;
    cardPassengers: (n: number) => string;
    cardLuggageTotal: (n: number) => string;
    cardHeavyBadge: string;
    unnamedGuest: string;
    unsetDestination: string;
  };

  settings: {
    brandColorTitle: string;
    brandColorDescription: string;
    colorInputAria: string;
    saveColor: string;
    savingColor: string;
    invalidColor: string;
    saveColorFailed: string;
    colorSaved: string;
    scaleHint: string;
    logoTitle: string;
    logoDescription: string;
    logoUploadLabel: string;
    logoUpdated: string;
    logoRemoved: string;
    heroTitle: string;
    heroDescription: string;
    heroUploadLabel: string;
    heroUpdated: string;
    heroRemoved: string;
    notSet: string;
    previewAlt: (title: string) => string;
    uploadingLabel: string;
    confirmRemoveImage: string;
    uploadFailed: string;
    saveSettingsFailed: string;
    removeFailed: string;
    imageReadFailed: string;
    loadFailed: string;
  };

  records: {
    monthLabel: string;
    noData: string;
    monthOption: (label: string, count: number) => string;
    showingCount: (n: number) => string;
    downloadButton: string;
    creating: string;
    helpText: string;
    emptyForMonth: string;
    noPhoto: string;
    stayDateLabel: string;
    transferDateLabel: string;
    roomLabel: string;
    destinationLabel: string;
    bookingDateTimeLabel: string;
    phoneLabel: string;
    unregisteredName: string;
    unsetDestination: string;
    undecided: string;
    monthFormat: (year: string, month: number) => string;
    allPeriod: string;
    summaryHeaders: [string, string, string, string, string, string, string];
    noPhotoCell: string;
    csvFileName: string;
    htmlFileName: string;
    zipFileName: (monthKey: string) => string;
    htmlTitle: (monthName: string) => string;
    htmlHeading: (monthName: string) => string;
    htmlNote: string;
    photoFolderName: string;
    downloadCreateFailed: string;
    loadFailed: string;
    passportPhotoAlt: (name: string) => string;
  };

  languageSwitcher: {
    label: string;
  };
}
