// =========================================================
// ゲスト用WiFi（訪客網路）の接続情報
// 完了画面でQRコードを表示し、ゲストがワンタップで接続できるようにする。
// ネットワーク情報を変更する場合はこのファイルだけを編集すればよい。
// =========================================================

export interface GuestWifiConfig {
  /** ネットワーク名（SSID） */
  ssid: string;
  /** パスワード */
  password: string;
  /** 暗号化方式。WPA/WPA2 は "WPA"、暗号なしは "nopass"。 */
  encryption: "WPA" | "WEP" | "nopass";
  /** SSIDが隠し（ステルス）ネットワークかどうか */
  hidden: boolean;
}

export const GUEST_WIFI: GuestWifiConfig = {
  ssid: "Crane Nest_Guest",
  password: "RemenberPassport1234",
  encryption: "WPA",
  hidden: false,
};

/**
 * WiFi QRコードの標準ペイロード文字列を生成する。
 * iOS / Android のカメラアプリがこの形式を認識し、
 * スキャンするだけでWiFi接続の確認ダイアログを表示する。
 * 仕様: WIFI:S:<SSID>;T:<WPA|WEP|nopass>;P:<password>;H:<true|false>;;
 */
export function buildWifiQrPayload(config: GuestWifiConfig = GUEST_WIFI): string {
  // 特殊文字（\ ; , : " ）はバックスラッシュでエスケープする必要がある。
  const escape = (value: string) => value.replace(/([\\;,:"])/g, "\\$1");

  const ssid = escape(config.ssid);
  const password = config.encryption === "nopass" ? "" : escape(config.password);
  const type = config.encryption;
  const hidden = config.hidden ? "true" : "false";

  return `WIFI:S:${ssid};T:${type};P:${password};H:${hidden};;`;
}

