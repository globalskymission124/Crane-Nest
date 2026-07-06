"use client";

// お気に入り（ハート）ボタン。未ログイン時はログインへ誘導。
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStaysSession } from "@/lib/stays/auth";
import { toggleWishlist } from "@/lib/stays/v2";

export default function WishlistButton({
  listingId,
  saved,
  onChange,
  className = "",
}: {
  listingId: string;
  saved: boolean;
  onChange: (saved: boolean) => void;
  className?: string;
}) {
  const { session } = useStaysSession();
  const router = useRouter();

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      router.push("/stays/login");
      return;
    }
    const nowSaved = await toggleWishlist(session.email, listingId);
    onChange(nowSaved);
  }

  return (
    <button
      onClick={handleClick}
      aria-label="お気に入り"
      className={`rounded-full bg-white/90 p-2 shadow transition hover:scale-110 ${className}`}
    >
      <Heart
        className={`h-4 w-4 ${saved ? "fill-rose-500 text-rose-500" : "text-slate-500"}`}
      />
    </button>
  );
}
