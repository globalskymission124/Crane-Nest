-- パスポート登録の「国籍」(ISO 3166 の 2 文字: TW / HK / KR …)。
-- パスポートの読み取り・電話番号の国番号から自動で選び、ゲストが確かめて登録する。
-- Crane-Interigent-Switch が WELCOME 地球儀 (国 → 泉佐野の線) と宿泊者の記録に使う。
alter table guests add column if not exists nationality text;
