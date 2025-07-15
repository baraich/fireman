"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function HomePage() {
  const trpc = useTRPC();
  const router = useRouter();
  const [value, setValue] = useState<string>("");

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        router.push(`/projects/${data.id}`);
      },
      onError: (error) => {
        toast.error(error.message, { richColors: true });
      },
    })
  );

  return (
    <main style={{ zoom: 1.4 }}>
      <div className="flex gap-4 p-4">
        <Input
          value={value}
          className="p-6"
          placeholder="Describe your app..."
          onChange={(e) => setValue(e.target.value)}
        />
        <Button
          className="p-6 w-24"
          disabled={createProject.isPending}
          onClick={() => createProject.mutate({ prompt: value })}
        >
          <ArrowRight />
        </Button>
      </div>
    </main>
  );
}
