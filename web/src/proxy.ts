import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 除了靜態資源以外的所有路徑都要刷新 session
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
