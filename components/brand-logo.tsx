"use client"

import Image from "next/image"

import { cn } from "@/lib/utils"

type BrandLogoProps = {
  className?: string
  priority?: boolean
}

export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <>
      <Image
        src="/logo-aguita.png"
        alt="Agüita"
        width={160}
        height={160}
        className={cn("object-contain dark:hidden", className)}
        priority={priority}
      />
      <Image
        src="/logo-aguita-dark.png"
        alt="Agüita"
        width={160}
        height={160}
        className={cn("hidden object-contain dark:block", className)}
        priority={priority}
      />
    </>
  )
}
