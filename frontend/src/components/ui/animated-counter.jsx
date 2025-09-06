'use client';

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

function Number({ mv, number }) {
  let y = useTransform(mv, (latest) => {
    let placeValue = latest % 10;
    let offset = (10 + number - placeValue) % 10;
    let memo = offset * 80; // Use 80px (h-20 height)
    if (offset > 5) {
      memo -= 10 * 80;
    }
    return memo;
  });

  return (
    <motion.span 
      className="absolute top-0 left-0 right-0 flex items-center justify-center h-20"
      style={{ y }}
    >
      {number}
    </motion.span>
  );
}

function Digit({ place, value }) {
  let valueRoundedToPlace = Math.floor(value / place);
  let animatedValue = useSpring(valueRoundedToPlace);

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace);
  }, [animatedValue, valueRoundedToPlace]);

  return (
    <div className="relative w-[1ch] tabular-nums h-full overflow-hidden">
      {Array.from({ length: 10 }, (_, i) => (
        <Number key={i} mv={animatedValue} number={i} />
      ))}
    </div>
  );
}

const AnimatedCounter = ({
  value,
  places = [10, 1],
  className = "",
}) => {
  return (
    <div className={cn(
      "relative inline-block text-8xl font-bold text-white gap-2 rounded-xl px-4 h-20",
      className
    )}>
      <div className="flex leading-none h-full items-center overflow-hidden">
        {places.map((place) => (
          <Digit
            key={place}
            place={place}
            value={value}
          />
        ))}
      </div>
    </div>
  );
};

export { AnimatedCounter };
