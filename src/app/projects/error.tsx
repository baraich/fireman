"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Error() {
  const router = useRouter();
  useEffect(function () {
    const timeout = setTimeout(() => {
      router.push("/");
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <main className="w-screen h-screen overflow-hidden">
      <p>
        Something Went Wrong! Redirecting to homepage in 3 seconds...
      </p>
    </main>
  );
}
