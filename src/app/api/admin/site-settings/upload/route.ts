import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BUCKET = "branding";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

/**
 * Image type specs: name, output dimensions, format
 */
const IMAGE_SPECS = {
  logo: { width: 512, height: 512, format: "png" as const, fit: "contain" as const },
  favicon: { width: 32, height: 32, format: "png" as const, fit: "contain" as const },
  apple_touch_icon: { width: 180, height: 180, format: "png" as const, fit: "contain" as const },
  og_image: { width: 1200, height: 630, format: "png" as const, fit: "cover" as const },
} as const;

type ImageType = keyof typeof IMAGE_SPECS;

/**
 * POST /api/admin/site-settings/upload
 *
 * Uploads a branding image to Supabase Storage.
 * Body: multipart/form-data with "file" field and "type" field.
 *
 * type: "logo" | "favicon" | "apple_touch_icon" | "og_image"
 *
 * When type is "logo", also auto-generates favicon, apple_touch_icon, and og_image.
 * Returns { url, generated?: { favicon_url, apple_touch_icon_url, og_image_url } }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const imageType = formData.get("type") as string;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Ficheiro em falta" }, { status: 400 });
    }

    if (!imageType || !(imageType in IMAGE_SPECS)) {
      return NextResponse.json(
        { error: "Tipo invalido. Usa: logo, favicon, apple_touch_icon, og_image" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Ficheiro demasiado grande (max. 10MB)" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo nao permitido (use JPEG, PNG, WebP ou SVG)" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();

    // Process and upload the requested image
    const url = await processAndUpload(supabase, buffer, imageType as ImageType, timestamp);

    // If uploading a logo, auto-generate the other variants
    let generated: Record<string, string> | undefined;
    if (imageType === "logo") {
      const [faviconUrl, appleTouchUrl, ogUrl] = await Promise.all([
        processAndUpload(supabase, buffer, "favicon", timestamp),
        processAndUpload(supabase, buffer, "apple_touch_icon", timestamp),
        processAndUpload(supabase, buffer, "og_image", timestamp),
      ]);
      generated = {
        favicon_url: faviconUrl,
        apple_touch_icon_url: appleTouchUrl,
        og_image_url: ogUrl,
      };
    }

    return NextResponse.json({ url, generated });
  } catch (error) {
    console.error("[API /admin/site-settings/upload POST] Error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// biome-ignore lint/suspicious/noExplicitAny: Supabase client type
async function processAndUpload(supabase: any, buffer: Buffer, type: ImageType, timestamp: number): Promise<string> {
  const spec = IMAGE_SPECS[type];

  let processed: Buffer;
  if (type === "og_image") {
    // OG image: resize to cover, with white background for padding
    processed = await sharp(buffer)
      .resize(spec.width, spec.height, { fit: spec.fit, background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();
  } else {
    // Icons: resize to contain with transparent background
    processed = await sharp(buffer)
      .resize(spec.width, spec.height, { fit: spec.fit, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  }

  const path = `${type}-${timestamp}.png`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, processed, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed for ${type}: ${error.message}`);
  }

  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${data.path}`;
}
