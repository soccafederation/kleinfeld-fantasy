import type { MetadataRoute } from "next";
import { REGISTRATION_OPEN } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return REGISTRATION_OPEN ? { rules: { userAgent: "*", allow: "/", disallow: ["/app", "/admin"] } } : { rules: { userAgent: "*", disallow: "/" } };
}
