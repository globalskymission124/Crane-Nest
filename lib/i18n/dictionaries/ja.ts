import type { Dictionary } from "../types";

const ja: Dictionary = {
  stepLabel: (current, total) => `Step ${current} / ${total}`,

  passport: {
    title: "パスポートを撮影してください",
    description:
      "顔写真のページ全体が写るように撮影・アップロードしてください。情報を自動で読み取ります。",
    uploadCta: "タップして撮影 / 画像を選択",
    uploadAlt: "アップロードされたパスポート画像",
    processing: "情報を読み取っています...",
    recognized: "読み取り完了",
    reviewHint: "内容に間違いがあれば修正してください。",
    fullNameLabel: "氏名（パスポート記載のローマ字）",
    passportNumberLabel: "パスポート番号",
    phoneNumberLabel: "電話番号・連絡先",
    phoneNumberPlaceholder: "例）090-1234-5678",
    retake: "撮り直す",
    next: "次へ進む",
  },

  transfer: {
    title: "送迎の詳細を入力してください",
    description: "送迎予約に必要な情報を入力します。",
    transferDateLabel: "送迎ご希望日",
    transferDateNote: "送迎をご希望される日付を選択してください。",
    roomLabel: "お部屋を選択",
    roomLoading: "お部屋を読み込み中...",
    destinationLabel: "行き先",
    destinationLoading: "目的地を読み込み中...",
    flightTimeLabel: "出発便のフライト時刻",
    flightTimeOptionalBadge: "任意",
    flightTimeOptionalNote: "フライト時刻が未定の場合は入力しなくても次に進めます。",
    suggestion: (time) =>
      `関西国際空港へは余裕を持って、${time} 発をおすすめします（フライト時刻の2.5時間前）。`,
    preferredDepartureTimeLabel: "ご希望の出発時刻",
    preferredDepartureTimeNote: "送迎をご希望される時刻があれば選択してください（任意）。",
    checkoutNote: "チェックアウトは朝10時までとなっております。",
    luggageSectionLabel: "人数・お荷物",
    passengerLabel: "乗車人数",
    luggageLargeLabel: "大型スーツケース",
    luggageSmallLabel: "小型手荷物",
    luggageSpecialLabel: "特殊荷物（自転車・ゴルフバッグ等）",
    back: "戻る",
    confirm: "予約内容を確認する",
  },

  complete: {
    title: "予約が完了しました！",
    description: "これがあなたの送迎チケット。当日はスタッフにスッとご提示を。",
    boardingPass: "Digital Boarding Pass",
    transferTo: (destination) => `${destination} 行き 送迎`,
    guestNameLabel: "お客様名",
    guestFallbackName: "ゲスト様",
    roomLabel: "お部屋",
    preferredDepartureLabel: "ご希望の出発時刻",
    suggestedDepartureLabel: "出発推奨時刻",
    specifiedDepartureLabel: "ご指定の出発時刻",
    flightTimeLabel: "フライト時刻",
    bookingRefLabel: "予約番号",
    passengerCount: (n) => `乗車 ${n}名`,
    luggageTotal: (n) => `荷物 計${n}個`,
    destinationPhotoLabel: "目的地",
    roomPhotoLabel: "お部屋",
    luggageBreakdownLabel: "お荷物の内訳",
    qrHint: "QRをかざすだけ。スマートにチェックイン。",
    note1: "ご予約内容の変更はフロントまでお問い合わせください。",
    note2: "お迎え時刻の変更がある場合はアプリ内通知でお知らせします。",
  },

  counter: {
    increase: (label) => `${label}を増やす`,
    decrease: (label) => `${label}を減らす`,
  },

  languageSwitcher: {
    label: "言語",
  },
};

export default ja;
