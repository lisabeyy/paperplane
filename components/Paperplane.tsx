"use client";

import { useEffect, useRef } from "react";
import { mount } from "@/lib/ui/mount";

export function Paperplane() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return mount(el);
  }, []);
  return <div ref={ref} />;
}
