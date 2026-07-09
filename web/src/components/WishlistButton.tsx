"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleWishlist } from "@/app/actions";

export default function WishlistButton({
  cardId,
  initialIn,
}: {
  cardId: string;
  initialIn: boolean;
}) {
  const router = useRouter();
  const [inList, setInList] = useState(initialIn);
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    setInList(!inList); // 樂觀更新
    const result = await toggleWishlist(cardId);
    if (result.error) {
      setInList(inList);
      window.alert(result.error);
    } else {
      router.refresh();
    }
    setBusy(false);
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      aria-label={inList ? "移出願望清單" : "加入願望清單"}
      className="text-base leading-none disabled:opacity-50"
    >
      {inList ? "❤️" : "🤍"}
    </button>
  );
}
