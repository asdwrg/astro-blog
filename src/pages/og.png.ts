import type { APIRoute } from "astro";
import { generateOgImageForSite } from "@/utils/generateOgImages";

export const GET: APIRoute = async () => {
  const ogImageBuffer = await generateOgImageForSite();
  
  const ogImageUint8Array = Uint8Array.from(ogImageBuffer); 

  return new Response(ogImageUint8Array, {
    headers: { "Content-Type": "image/png" },
  });
};