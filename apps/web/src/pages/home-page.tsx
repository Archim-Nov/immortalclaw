import React, { useEffect, useRef, useState } from "react";
import { isPremiumLandingTabId, premiumLandingMarkup, type PremiumLandingTabId } from "./premium-landing-markup";

interface DustParticle {
  color: string;
  radius: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

function buildParticles(width: number, height: number): DustParticle[] {
  return Array.from({ length: 150 }, () => ({
    color: Math.random() > 0.5 ? "rgba(0, 255, 170, 0.8)" : "rgba(251, 191, 36, 0.8)",
    radius: Math.random() * 2 + 0.5,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5 - 0.2,
    x: Math.random() * width,
    y: Math.random() * height,
  }));
}

export function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<PremiumLandingTabId>("dashboard");

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const currentRoot = root;

    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) {
        return;
      }

      const tabTrigger = event.target.closest<HTMLElement>("[data-tab-target]");

      if (!tabTrigger || !currentRoot.contains(tabTrigger)) {
        return;
      }

      const nextTab = tabTrigger.dataset.tabTarget;

      if (nextTab && isPremiumLandingTabId(nextTab)) {
        setActiveTab(nextTab);
      }
    }

    currentRoot.addEventListener("click", handleClick);

    return () => {
      currentRoot.removeEventListener("click", handleClick);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    root.querySelectorAll<HTMLElement>("[data-tab-target]").forEach((link) => {
      const isActive = link.dataset.tabTarget === activeTab;

      link.classList.toggle("active", isActive);
      link.setAttribute("aria-pressed", String(isActive));
    });

    root.querySelectorAll<HTMLElement>(".bg-layer").forEach((background) => {
      background.classList.toggle("active", background.id === `bg-${activeTab}`);
    });

    root.querySelectorAll<HTMLElement>(".view-section").forEach((section) => {
      section.classList.remove("active");
    });

    const targetSection = root.querySelector<HTMLElement>(`#${activeTab}`);

    if (targetSection) {
      void targetSection.offsetWidth;
      targetSection.classList.add("active");
    }

    const mainWrapper = root.querySelector<HTMLElement>(".main-wrapper");

    if (mainWrapper) {
      mainWrapper.scrollTop = 0;
    }

    if (activeTab !== "messages") {
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      const history = root.querySelector<HTMLElement>(".chat-history");

      if (history) {
        history.scrollTop = history.scrollHeight;
      }
    }, 50);

    return () => {
      window.clearTimeout(scrollTimer);
    };
  }, [activeTab]);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const canvas = root.querySelector<HTMLCanvasElement>("#dust-canvas");

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    let animationFrameId = 0;
    let particles = buildParticles(window.innerWidth, window.innerHeight);

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = buildParticles(canvas.width, canvas.height);
    };

    const animateParticles = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width || particle.y < 0) {
          particle.x = Math.random() * canvas.width;
          particle.y = canvas.height;
        }

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = particle.color;
        context.shadowBlur = particle.radius * 3;
        context.shadowColor = particle.color;
        context.fill();
      });

      animationFrameId = window.requestAnimationFrame(animateParticles);
    };

    resizeCanvas();
    animateParticles();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return <div ref={rootRef} className="premium-landing-page" dangerouslySetInnerHTML={{ __html: premiumLandingMarkup }} />;
}
