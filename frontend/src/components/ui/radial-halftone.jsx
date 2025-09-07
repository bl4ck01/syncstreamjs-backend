"use client";

import React, { useRef, useEffect } from 'react';

export default function RadialHalftone({ 
  widthPercent = 100, 
  heightPercent = 100, 
  dotColor = '#CFFF00',
  backgroundColor = '#000000',
  centerX = 0.5,
  centerY = 0.3,
  innerRadius = 0.12,
  outerRadius = 0.58,
  maxRadius = 1.0,
  dotSize = 2,
  dotSpacing = 8
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Calculate actual dimensions based on viewport
    const actualWidth = (window.innerWidth * widthPercent) / 100;
    const actualHeight = (window.innerHeight * heightPercent) / 100;
    
    // Set canvas size accounting for device pixel ratio
    canvas.width = actualWidth * dpr;
    canvas.height = actualHeight * dpr;
    canvas.style.width = `${actualWidth}px`;
    canvas.style.height = `${actualHeight}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, actualWidth, actualHeight);

    // Calculate center position
    const centerPixelX = centerX * actualWidth;
    const centerPixelY = centerY * actualHeight;

    // Generate dots
    for (let x = 0; x < actualWidth; x += dotSpacing) {
      for (let y = 0; y < actualHeight; y += dotSpacing) {
        // Calculate distance from center
        const dx = x - centerPixelX;
        const dy = y - centerPixelY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = Math.min(actualWidth, actualHeight) * 0.5;
        const normalizedDistance = distance / maxDistance;

        // Calculate opacity based on radial gradient
        let opacity = 0;
        
        if (normalizedDistance >= innerRadius && normalizedDistance <= outerRadius) {
          // Inner ring: fade in
          if (normalizedDistance <= innerRadius + 0.16) {
            opacity = (normalizedDistance - innerRadius) / 0.16;
          }
          // Outer ring: fade out
          else if (normalizedDistance >= outerRadius - 0.3) {
            opacity = (outerRadius - normalizedDistance) / 0.3;
          }
          // Peak brightness in middle
          else {
            opacity = 1;
          }
        }

        // Apply opacity
        if (opacity > 0) {
          ctx.fillStyle = dotColor;
          ctx.globalAlpha = opacity;
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Reset global alpha
    ctx.globalAlpha = 1;
  }, [widthPercent, heightPercent, dotColor, backgroundColor, centerX, centerY, innerRadius, outerRadius, maxRadius, dotSize, dotSpacing]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ 
        borderRadius: 'inherit',
        filter: 'blur(1px)'
      }}
    />
  );
}
