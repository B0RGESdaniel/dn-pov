"use client";

import { useEffect } from "react";
import { motion, stagger, useAnimate } from "motion/react";

import Floating, { FloatingElement } from "@/components/ui/parallax-floating";
import { Photo } from "@/types/photo";

interface HomeHeroProps {
  photos: Photo[];
}

function photoAlt(photo: Photo): string {
  return photo.tags.map((tag) => tag.name).join(", ") || "Foto";
}

export function HomeHero({ photos }: HomeHeroProps) {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    animate("img", { opacity: [0, 1] }, { duration: 0.5, delay: stagger(0.15) });
  }, [animate]);

  return (
    <div
      className="relative flex h-[calc(100vh-3.5rem)] w-full items-center justify-center overflow-hidden bg-background"
      ref={scope}
    >
      <motion.div
        className="z-50 flex flex-col items-center space-y-4 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.88, delay: 1.5 }}
      >
        <p className="z-50 font-display text-5xl text-foreground md:text-7xl">
          dn-pov.
        </p>
        <p className="z-50 font-mono text-[10px] uppercase tracking-widest text-muted">
          acervo pessoal
        </p>
      </motion.div>

      <Floating sensitivity={-1} className="overflow-hidden">
        <FloatingElement depth={0.5} className="top-[8%] left-[11%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[0]?.thumbUrl}
            alt={photos[0] ? photoAlt(photos[0]) : ""}
            className="h-16 w-16 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:h-24 md:w-24"
          />
        </FloatingElement>
        <FloatingElement depth={1} className="top-[10%] left-[32%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[1]?.thumbUrl}
            alt={photos[1] ? photoAlt(photos[1]) : ""}
            className="h-20 w-20 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:h-28 md:w-28"
          />
        </FloatingElement>
        <FloatingElement depth={2} className="top-[2%] left-[53%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[2]?.thumbUrl}
            alt={photos[2] ? photoAlt(photos[2]) : ""}
            className="h-40 w-28 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:h-52 md:w-40"
          />
        </FloatingElement>
        <FloatingElement depth={1} className="top-[0%] left-[83%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[3]?.thumbUrl}
            alt={photos[3] ? photoAlt(photos[3]) : ""}
            className="h-24 w-24 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:h-32 md:w-32"
          />
        </FloatingElement>

        <FloatingElement depth={1} className="top-[40%] left-[2%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[4]?.thumbUrl}
            alt={photos[4] ? photoAlt(photos[4]) : ""}
            className="h-28 w-28 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:h-36 md:w-36"
          />
        </FloatingElement>
        <FloatingElement depth={2} className="top-[70%] left-[77%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[7]?.thumbUrl}
            alt={photos[7] ? photoAlt(photos[7]) : ""}
            className="h-28 w-28 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:h-48 md:w-36"
          />
        </FloatingElement>

        <FloatingElement depth={4} className="top-[73%] left-[15%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[5]?.thumbUrl}
            alt={photos[5] ? photoAlt(photos[5]) : ""}
            className="h-full w-40 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-52"
          />
        </FloatingElement>
        <FloatingElement depth={1} className="top-[80%] left-[50%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[6]?.thumbUrl}
            alt={photos[6] ? photoAlt(photos[6]) : ""}
            className="h-24 w-24 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:h-32 md:w-32"
          />
        </FloatingElement>
      </Floating>
    </div>
  );
}
