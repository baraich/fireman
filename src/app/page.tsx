"use client";
import { useTRPC } from "@/trpc/client";

export default function HomePage() {
  const trpc = useTRPC();

  return <div>Hello, World!</div>;
}
