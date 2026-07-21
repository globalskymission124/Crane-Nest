-- =========================================================
-- 便槽（し尿タンク）モニタリング
--   自社ゲストハウス専用。★予約(stays_bookings)から累積水量を自動計算する方式。
--     - confirmed / completed の予約だけを対象（cancelled / pending は自動除外）
--     - 各予約を「泊まった夜」に展開し、前回汲み取り日〜今日より前の“過ぎた夜”のみ加算
--   80%（既定480L）超過で WeCom & Email へ通知する。
--   ※ 環境変数未設定時はアプリ側のインメモリ・モックで動作するため、
--     このマイグレーションは本番運用時に適用する。
-- =========================================================

-- 1. タンクの状態（シングルトン: id=1 の1棟運用。複数棟化する場合は行を増やす）
create table if not exists stays_tank_state (
  id                 integer primary key default 1,
  capacity_liters    numeric not null default 600,    -- タンク総容量
  liters_per_guest   numeric not null default 3.5,    -- 1人1日あたり使用量
  last_emptied_date  date    not null default current_date,  -- 前回汲み取り日
  alerted            boolean not null default false,  -- 警告通知済みフラグ（多重通知抑制）
  updated_at         timestamptz not null default now()
);

-- 既定の1行を用意
insert into stays_tank_state (id) values (1)
  on conflict (id) do nothing;

-- 2. 手動補正(override)テーブル
--    通常は予約から自動計算するが、実人数がズレた日だけスタッフがこの値で上書きする。
--    ここに行が無い日付は「予約からの自動値」を採用する。
create table if not exists stays_tank_logs (
  date        date not null primary key,
  guests      integer not null default 0,   -- 補正後の宿泊人数
  liters      numeric not null default 0,    -- guests * liters_per_guest（参考値）
  created_at  timestamptz not null default now()
);
create index if not exists idx_stays_tank_logs_date on stays_tank_logs (date desc);

-- updated_at 自動更新トリガ（既存の set_updated_at() を再利用）
drop trigger if exists trg_stays_tank_state_updated_at on stays_tank_state;
create trigger trg_stays_tank_state_updated_at
  before update on stays_tank_state for each row execute function set_updated_at();

-- RLS: 管理者/ホストのみ読み書き（プロジェクトの既存ポリシー運用に合わせて調整可）
alter table stays_tank_state enable row level security;
alter table stays_tank_logs  enable row level security;

-- サービスロール(サーバサイド)からのアクセスは常に許可。
-- クライアント直アクセスは想定していない（API Route 経由）ため、
-- 認証済みユーザーへの参照のみ許可する例:
drop policy if exists tank_state_read on stays_tank_state;
create policy tank_state_read on stays_tank_state
  for select using (true);

drop policy if exists tank_logs_read on stays_tank_logs;
create policy tank_logs_read on stays_tank_logs
  for select using (true);
