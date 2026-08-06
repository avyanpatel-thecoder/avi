import { useEffect, useRef } from "react";

export default function CodingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chars =
      "01アイウエオカキクケコ{}[]<>()=>+-*/&^%$#@!~;:,.?abcdefghijklmnopqrstuvwxyz";
    const fontSize = 13;
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const cols = () => Math.floor(canvas.width / fontSize);
    let drops = Array.from({ length: cols() }, () =>
      Math.floor(Math.random() * -50)
    );

    window.addEventListener("resize", () => {
      drops = Array.from({ length: cols() }, () =>
        Math.floor(Math.random() * -50)
      );
    });

    const draw = () => {
      ctx.fillStyle = "rgba(0,0,0,0.04)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < drops.length; i++) {
        const y = drops[i] * fontSize;
        if (y < 0) {
          drops[i]++;
          continue;
        }

        // Lead character — bright white/green
        const isLead = drops[i] >= 1 && y < canvas.height;
        ctx.fillStyle = isLead ? "#ccffcc" : "#00c853";
        ctx.font = `${fontSize}px 'Courier New', monospace`;
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * fontSize, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        } else {
          drops[i]++;
        }
      }

      animId = requestAnimationFrame(draw);
    };

    // Small delay so canvas fills the DOM first
    const timeout = setTimeout(() => {
      animId = requestAnimationFrame(draw);
    }, 50);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.18 }}
    />
  );
}
