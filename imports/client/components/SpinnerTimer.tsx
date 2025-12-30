import { useCallback, useEffect, useRef } from "react";

// A component which animates a grey spinner between startTime and endTime like
//     _____         __            __            __            __            __
//    /  _  \       /  |  _       /  |          /  |          /  |          /  |           |
//   /  / \  \     /  /  \ \     /  /          /  /          /  /           \_/
//  |  |   | | -> |  |   | | -> |  |   --| -> |  |       -> |  |       ->            ->
//   \  \_/  /     \  \_/  /     \  \_/  /     \  \_         \_/
//    \_____/       \_____/       \_____/       \__|
//
//   startTime                              halfway between                             endTime
const SpinnerTimer = ({
  width,
  height,
  startTime,
  endTime,
  className,
}: {
  width: number;
  height: number;
  startTime: number;
  endTime: number;
  className?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const periodicHandle = useRef<number | undefined>(undefined);

  const drawSpinner = useCallback(() => {
    // request repaint on next animation frame
    periodicHandle.current = window.requestAnimationFrame(drawSpinner);

    // Compute fraction of spinner we should show (100% if <= startTime, 0% if >= endTime)
    const now = Date.now();
    let frac: number;
    if (now < startTime) {
      frac = 1;
    } else if (now > endTime) {
      frac = 0;
    } else {
      frac = (now - startTime) / (endTime - startTime);
    }

    // paint, if we have a canvas, the outline of an arc:
    const centerX = width / 2;
    const centerY = height / 2;

    const outerRadius = Math.min(width, height) / 2;
    const innerRadius = outerRadius / 3;

    const startRadians = frac * (Math.PI * 2) + (3 * Math.PI) / 2;
    const endRadians = (3 * Math.PI) / 2;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "rgb(100, 100, 100)"; // this could easily become a prop
        ctx.beginPath();
        // outer arc
        ctx.arc(centerX, centerY, outerRadius, startRadians, endRadians);
        // line to inner arc at endRadians, which is always just straight up
        ctx.lineTo(centerX, centerY + innerRadius);
        // inner arc
        ctx.arc(centerX, centerY, innerRadius, endRadians, startRadians, true);
        // fill to close
        ctx.fill();
      }
    }
  }, [startTime, endTime, width, height]);

  useEffect(() => {
    periodicHandle.current ??= window.requestAnimationFrame(drawSpinner);
    return () => {
      if (periodicHandle.current) {
        window.cancelAnimationFrame(periodicHandle.current);
        periodicHandle.current = undefined;
      }
    };
  }, [drawSpinner]);

  return (
    <canvas
      className={className}
      ref={canvasRef}
      width={width}
      height={height}
    />
  );
};

export default SpinnerTimer;
