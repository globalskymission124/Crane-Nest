import { createClient } from "@supabase/supabase-js";

// Vercel/Cloudflare Pagesの環境変数に NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を設定して利用する想定。
// ローカル開発時は .env.local に同名のキーを設定すること。
//
// 環境変数が未設定の場合でも createClient() 自体が例外を投げないよう、
// ビルド時・開発時用にダミー値へフォールバックする（実際の通信は失敗するが、
// 各画面側でエラーハンドリング/フォールバック表示を用意しているため問題ない）。
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
