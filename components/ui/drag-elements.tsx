"use client";

import { Children, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { InertiaOptions, motion, Target, Transition } from "motion/react";

// Vendorizado de https://www.fancycomponents.dev/docs/components/blocks/drag-elements
// (`npx shadcn add @fancy/drag-elements`), com dois ajustes: export nomeado
// (padrão do projeto) e `onItemTap` — clicar (sem arrastar) um item também
// dispara um callback, usado em components/memory-stack.tsx pro efeito de
// "pegar a foto" (scale up). Guarda por item se o gesto envolveu arrasto pra
// ignorar o "tap fantasma" que às vezes dispara logo depois de um arrasto.
interface DragElementsProps {
  children: ReactNode;
  dragElastic?:
    | number
    | { top?: number; left?: number; right?: number; bottom?: number }
    | boolean;
  dragConstraints?:
    | { top?: number; left?: number; right?: number; bottom?: number }
    | RefObject<Element | null>;
  dragMomentum?: boolean;
  dragTransition?: InertiaOptions;
  dragPropagation?: boolean;
  selectedOnTop?: boolean;
  className?: string;
  // Ordem inicial de z-index: por padrão o item de menor índice nasce no
  // fundo da pilha (z mais baixo) e o de maior índice no topo. true inverte
  // isso — usado quando a ordem de "pouso" da animação de entrada precisa
  // terminar com o índice 0 por cima (ver components/memory-stack.tsx).
  reverseInitialZOrder?: boolean;
  onItemTap?: (index: number) => void;
  itemStyle?: (index: number) => CSSProperties;
  // Animação de entrada por item (opcional). Pode incluir x/y sem problema —
  // drag só assume essas motion values quando o usuário começa a arrastar,
  // depois que a animação de entrada já terminou.
  itemInitial?: (index: number) => Target;
  itemAnimate?: (index: number) => Target;
  itemTransition?: (index: number) => Transition;
}

export function DragElements({
  children,
  dragElastic = 0.5,
  dragConstraints,
  dragMomentum = true,
  dragTransition = { bounceStiffness: 200, bounceDamping: 300 },
  dragPropagation = true,
  selectedOnTop = true,
  className,
  reverseInitialZOrder = false,
  onItemTap,
  itemStyle,
  itemInitial,
  itemAnimate,
  itemTransition,
}: DragElementsProps) {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const childCount = Children.count(children);

  function initialZIndices(count: number) {
    return Array.from({ length: count }, (_, i) =>
      reverseInitialZOrder ? count - 1 - i : i,
    );
  }

  const [zIndices, setZIndices] = useState<number[]>(() =>
    initialZIndices(childCount),
  );
  const [isDragging, setIsDragging] = useState(false);
  const draggedRef = useRef<Set<number>>(new Set());

  // Reseta a ordem de z-index quando a quantidade de itens muda — ajuste de
  // estado durante a renderização (não num efeito) é o padrão recomendado
  // pra "derivar" estado a partir de props, evita o cascading render de um
  // setState síncrono dentro de useEffect.
  const [prevChildCount, setPrevChildCount] = useState(childCount);
  if (childCount !== prevChildCount) {
    setPrevChildCount(childCount);
    setZIndices(initialZIndices(childCount));
  }

  function bringToFront(index: number) {
    if (!selectedOnTop) return;
    setZIndices((prevIndices) => {
      const newIndices = [...prevIndices];
      const currentIndex = newIndices.indexOf(index);
      newIndices.splice(currentIndex, 1);
      newIndices.push(index);
      return newIndices;
    });
  }

  return (
    <div
      ref={constraintsRef}
      className={`relative h-full w-full${className ? ` ${className}` : ""}`}
    >
      {Children.map(children, (child, index) => (
        <motion.div
          key={index}
          initial={itemInitial?.(index)}
          animate={itemAnimate?.(index)}
          transition={itemTransition?.(index)}
          drag
          dragElastic={dragElastic}
          dragConstraints={dragConstraints || constraintsRef}
          dragMomentum={dragMomentum}
          dragTransition={dragTransition}
          dragPropagation={dragPropagation}
          style={{
            ...itemStyle?.(index),
            zIndex: zIndices.indexOf(index),
            cursor: isDragging ? "grabbing" : "grab",
          }}
          onDragStart={() => {
            draggedRef.current.add(index);
            bringToFront(index);
            setIsDragging(true);
          }}
          onDragEnd={() => setIsDragging(false)}
          whileDrag={{ cursor: "grabbing" }}
          onTap={() => {
            if (draggedRef.current.has(index)) {
              draggedRef.current.delete(index);
              return;
            }
            bringToFront(index);
            onItemTap?.(index);
          }}
          className="absolute"
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
