"use client";
import Link from "next/link";
import { useEffect, useState, type ComponentProps } from "react";
import { currentUrlParams } from "@/lib/url-state";
import { researchHref } from "@/lib/research-navigation";

export default function ResearchLink({
  href,
  ...props
}: ComponentProps<typeof Link>) {
  const [context, setContext] = useState("");
  useEffect(() => {
    const sync = () => setContext(currentUrlParams().toString());
    sync();
    window.addEventListener("research-context", sync);
    return () => window.removeEventListener("research-context", sync);
  }, []);
  return (
    <Link
      {...props}
      href={
        typeof href === "string" && href.startsWith("/")
          ? researchHref(href, new URLSearchParams(context))
          : href
      }
    />
  );
}
