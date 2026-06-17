// Redirect to the canonical Hijri calendar (`/hijri`, app/hijri.tsx).
//
// This screen previously shipped its own divergent Hijri engine (a Yallop-style
// converter that rolled over ~2 days behind Umm al-Qura and ignored the admin
// override + system offset entirely). It is only reachable via deep link
// (`hijri-calendar` in lib/deep-linking.ts) — no in-app UI links here — so to
// guarantee a SINGLE Hijri source of truth everywhere we forward it to the
// authoritative calendar instead of maintaining a second, wrong engine.
import { Redirect } from 'expo-router';

export default function HijriCalendarRedirect() {
  return <Redirect href="/hijri" />;
}
