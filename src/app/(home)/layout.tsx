import Navbar from "@/modules/home/ui/navbar";

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  return (
    <main className="flex flex-col min-h-screen max-h-screen">
      <Navbar />
      <div className="absolute inset-0 -z-10 h-full w-full bg-background dark:bg-[radial-gradient(#393e4a_0.5px,transparent_1px)] bg-[radial-gradient(#dadde2_0.5px,transparent_1px)] [background-size:16px_16px]"></div>
      <div className="flex-1 flex flex-col px-4 pb-4">{children}</div>
    </main>
  );
}
