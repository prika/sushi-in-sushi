import { unstable_cache } from "next/cache";
import Script from "next/script";
import { createClient } from "@/lib/supabase/server";

async function fetchGtmId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    // biome-ignore lint/suspicious/noExplicitAny: site_settings not in generated types yet
    const { data } = await (supabase as any)
      .from("site_settings")
      .select("gtm_id")
      .eq("id", 1)
      .single();

    return data?.gtm_id ?? null;
  } catch {
    return null;
  }
}

const getCachedGtmId = unstable_cache(
  fetchGtmId,
  ["gtm-id"],
  { revalidate: 3600, tags: ["site-settings"] },
);

export async function GoogleTagManager() {
  const gtmId = await getCachedGtmId();

  if (!gtmId) return null;

  return (
    <>
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
        }}
      />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
