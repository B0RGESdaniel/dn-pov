"use client";

import { CSSProperties, useEffect } from "react";
import { motion, stagger, useAnimate } from "motion/react";

import Floating, { FloatingElement } from "@/components/ui/parallax-floating";
import { Photo } from "@/types/photo";

interface HomeHeroProps {
  photos: Photo[];
}

function photoAlt(photo: Photo): string {
  return photo.tags.map((tag) => tag.name).join(", ") || "Foto";
}

// Preserva a proporção real da foto (evita crop forçado do object-cover
// numa caixa de dimensões fixas) — cai pra object-cover só se faltar
// metadado de width/height.
function aspectStyle(photo?: Photo): CSSProperties | undefined {
  if (!photo?.width || !photo?.height) return undefined;
  return { aspectRatio: `${photo.width} / ${photo.height}` };
}

export function HomeHero({ photos }: HomeHeroProps) {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    animate(
      "img",
      { opacity: [0, 1] },
      { duration: 0.5, delay: stagger(0.15) },
    );
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
      {/* mural sp */}
      <Floating sensitivity={-1} className="overflow-hidden">
        <FloatingElement depth={0.5} className="top-[6%] left-[17%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[0]?.thumbUrl}
            alt={photos[0] ? photoAlt(photos[0]) : ""}
            style={aspectStyle(photos[0])}
            className="h-auto w-24 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-40"
          />
        </FloatingElement>

        {/* arnaldo quintela */}
        <FloatingElement
          depth={1}
          className="top-[26%] left-[35%] md:left-[35%] md:top-[16%]"
        >
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[1]?.thumbUrl}
            alt={photos[1] ? photoAlt(photos[1]) : ""}
            style={aspectStyle(photos[1])}
            className="h-auto w-28 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-44"
          />
        </FloatingElement>

        {/* escada vaticano */}
        <FloatingElement depth={2} className="top-[2%] left-[53%] md:top-[9%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[2]?.thumbUrl}
            alt={photos[2] ? photoAlt(photos[2]) : ""}
            style={aspectStyle(photos[2])}
            className="h-auto w-32 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-56"
          />
        </FloatingElement>

        {/* ponte */}
        <FloatingElement
          depth={1}
          className="top-[30%] left-[78%] md:left-[78%] md:top-[25%]"
        >
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[3]?.thumbUrl}
            alt={photos[3] ? photoAlt(photos[3]) : ""}
            style={aspectStyle(photos[3])}
            className="h-auto w-28 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-48"
          />
        </FloatingElement>

        {/* menina */}
        <FloatingElement depth={1} className="top-[42%] left-[9%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[4]?.thumbUrl}
            alt={photos[4] ? photoAlt(photos[4]) : ""}
            style={aspectStyle(photos[4])}
            className="h-auto w-32 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-52"
          />
        </FloatingElement>

        {/* nfl */}
        <FloatingElement
          depth={2}
          className="top-[74%] left-[73%] md:top-[57%]"
        >
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[7]?.thumbUrl}
            alt={photos[7] ? photoAlt(photos[7]) : ""}
            style={aspectStyle(photos[7])}
            className="h-auto w-32 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-52"
          />
        </FloatingElement>

        {/* torre eiffel */}
        <FloatingElement
          depth={4}
          className="top-[80%] left-[20%] md:left-[15%] md:top-[65%]"
        >
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[5]?.thumbUrl}
            alt={photos[5] ? photoAlt(photos[5]) : ""}
            style={aspectStyle(photos[5])}
            className="h-auto w-36 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-56"
          />
        </FloatingElement>

        {/* porto */}
        <FloatingElement
          depth={1}
          className="top-[62%] left-[50%] md:top-[70%]"
        >
          <motion.img
            initial={{ opacity: 0 }}
            src={photos[6]?.thumbUrl}
            alt={photos[6] ? photoAlt(photos[6]) : ""}
            style={aspectStyle(photos[6])}
            className="h-auto w-28 cursor-pointer object-cover transition-transform duration-200 hover:scale-105 md:w-48"
          />
        </FloatingElement>
      </Floating>
    </div>
  );
}
