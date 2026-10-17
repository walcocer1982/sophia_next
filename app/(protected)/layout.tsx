import { Suspense } from "react";
import { Navbar, NavbarConVista } from "@/components/navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* La barra lee `?vista=estudiante` (useSearchParams): sin Suspense, las
          páginas estáticas no compilan. Mientras tanto, la barra normal. */}
      <Suspense fallback={<Navbar />}>
        <NavbarConVista />
      </Suspense>
      {children}
    </>
  );
}
