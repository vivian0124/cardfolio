import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 快速通道：直接解析 auth cookie 裡的 expires_at，
 * token 還有超過 5 分鐘壽命就不用打 Supabase Auth（省掉每次導覽 100~300ms 的往返）。
 * 看不懂 cookie 或快過期時回傳 true，走完整的 getUser() 刷新。
 */
function needsRefresh(request: NextRequest): boolean {
  try {
    const chunks = request.cookies
      .getAll()
      .filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name));
    if (chunks.length === 0) return false; // 沒登入，不用刷新
    const joined = chunks
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => c.value)
      .join("");
    const raw = joined.startsWith("base64-")
      ? atob(joined.slice(7).replace(/-/g, "+").replace(/_/g, "/"))
      : decodeURIComponent(joined);
    const expiresAt = JSON.parse(raw)?.expires_at;
    if (typeof expiresAt !== "number") return true;
    return expiresAt * 1000 - Date.now() < 5 * 60 * 1000;
  } catch {
    return true;
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // 尚未設定 Supabase 環境變數時直接放行，方便本機初期開發
    return supabaseResponse;
  }

  if (!needsRefresh(request)) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // 觸發 token 刷新，讓 Server Component 拿到有效 session
  await supabase.auth.getUser();

  return supabaseResponse;
}
