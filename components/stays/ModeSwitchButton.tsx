"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";

type Mode = "guest" | "host";

const COPY: Record<Mode, { button: string; loading: string }> = {
  guest: { button: "切换至旅行模式", loading: "切换至旅行模式" },
  host: { button: "切换至经营模式", loading: "切换至经营模式" },
};

export default function ModeSwitchButton({
  from,
  to,
  href,
  label = COPY[to].button,
}: {
  from: Mode;
  to: Mode;
  href: string;
  label?: string;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function startSwitch() {
    if (switching) return;
    setSwitching(true);
    timerRef.current = setTimeout(() => router.push(href), 1980);
  }

  return (
    <>
      <button
        type="button"
        onClick={startSwitch}
        disabled={switching}
        aria-label={label}
        className="fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-950 px-7 py-3.5 text-base font-black text-white shadow-[0_14px_34px_rgba(15,23,42,0.24)] transition active:scale-95 disabled:opacity-80 sm:hidden"
        style={{ bottom: "calc(max(env(safe-area-inset-bottom), 0.45rem) + 4.85rem)" }}
      >
        <ArrowUpDown className="h-5 w-5" />
        <span className="whitespace-nowrap">{label}</span>
      </button>

      {switching && (
        <div className="mode-switch-overlay fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden bg-white" aria-live="assertive">
          <span className="mode-switch-grid" />
          <div className="mode-switch-stage">
            <span className="mode-switch-ring mode-switch-ring-a" />
            <span className="mode-switch-ring mode-switch-ring-b" />
            <span className="mode-switch-scan" />
            <div className="mode-switch-perspective">
              <div className="mode-switch-card">
                <div className="mode-switch-face mode-switch-front">
                  <div className="mode-switch-shell">
                    <Scene mode={from} />
                  </div>
                </div>
                <div className="mode-switch-face mode-switch-back">
                  <div className="mode-switch-shell">
                    <Scene mode={to} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mode-switch-title">{COPY[to].loading}</p>
          <span className="mode-switch-progress">
            <span />
          </span>
        </div>
      )}

      <style jsx>{`
        .mode-switch-overlay {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.98)),
            radial-gradient(circle at 50% 42%, rgba(14, 165, 233, 0.16), transparent 36%),
            radial-gradient(circle at 50% 56%, rgba(244, 63, 94, 0.12), transparent 35%);
        }

        .mode-switch-grid {
          background-image:
            linear-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 23, 42, 0.05) 1px, transparent 1px);
          background-size: 28px 28px;
          inset: -10%;
          mask-image: radial-gradient(circle at center, black 0%, transparent 66%);
          opacity: 0.5;
          position: absolute;
          transform: perspective(900px) rotateX(62deg) translateY(115px);
          animation: gridDrift 1.9s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .mode-switch-stage {
          height: 260px;
          position: relative;
          width: 280px;
        }

        .mode-switch-stage::after {
          background: radial-gradient(ellipse at center, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0) 68%);
          border-radius: 50%;
          bottom: 10px;
          content: "";
          height: 34px;
          left: 30px;
          position: absolute;
          width: 220px;
          animation: shadowPulse 1.9s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .mode-switch-ring {
          border: 1px solid rgba(14, 165, 233, 0.35);
          border-radius: 50%;
          box-shadow:
            0 0 18px rgba(14, 165, 233, 0.12),
            inset 0 0 18px rgba(244, 63, 94, 0.08);
          height: 232px;
          left: 24px;
          position: absolute;
          top: 2px;
          width: 232px;
          animation: ringSpin 1.9s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .mode-switch-ring-b {
          border-color: rgba(244, 63, 94, 0.24);
          height: 196px;
          left: 42px;
          top: 20px;
          transform: rotateX(68deg) rotateZ(22deg);
          width: 196px;
          animation-name: ringCounterSpin;
        }

        .mode-switch-scan {
          background: linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.54), rgba(255, 255, 255, 0.92), transparent);
          filter: blur(0.5px);
          height: 2px;
          left: -22px;
          position: absolute;
          top: 112px;
          width: 324px;
          animation: scanSweep 1.9s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .mode-switch-perspective {
          height: 214px;
          left: 20px;
          perspective: 1400px;
          position: absolute;
          top: 0;
          width: 240px;
        }

        .mode-switch-card {
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          width: 100%;
          animation: modeFlip 1.78s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .mode-switch-face {
          align-items: center;
          backface-visibility: hidden;
          display: flex;
          height: 100%;
          inset: 0;
          justify-content: center;
          position: absolute;
          width: 100%;
        }

        .mode-switch-shell {
          align-items: center;
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.88), rgba(248, 250, 252, 0.74)),
            linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(244, 63, 94, 0.14));
          border: 1px solid rgba(148, 163, 184, 0.28);
          border-radius: 34px;
          box-shadow:
            0 34px 68px rgba(15, 23, 42, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.92),
            inset 0 -28px 42px rgba(15, 23, 42, 0.04);
          display: flex;
          height: 196px;
          justify-content: center;
          overflow: hidden;
          position: relative;
          transform: translateZ(34px);
          width: 224px;
        }

        .mode-switch-shell::before {
          background: linear-gradient(115deg, transparent 0%, rgba(255, 255, 255, 0.76) 48%, transparent 62%);
          content: "";
          height: 280px;
          left: -150px;
          position: absolute;
          top: -40px;
          transform: rotate(8deg);
          width: 96px;
          animation: glassSweep 1.78s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .mode-switch-shell::after {
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 28px;
          content: "";
          inset: 10px;
          position: absolute;
        }

        .mode-switch-back {
          transform: rotateY(180deg);
        }

        .mode-switch-title {
          color: #0f172a;
          font-size: 1.55rem;
          font-weight: 900;
          margin-top: 22px;
          position: relative;
          text-align: center;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8);
          animation: titleResolve 1.9s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .mode-switch-progress {
          background: rgba(15, 23, 42, 0.08);
          border-radius: 999px;
          display: block;
          height: 4px;
          margin-top: 18px;
          overflow: hidden;
          position: relative;
          width: 156px;
        }

        .mode-switch-progress span {
          background: linear-gradient(90deg, #0ea5e9, #f43f5e);
          border-radius: inherit;
          display: block;
          height: 100%;
          transform-origin: left center;
          animation: progressFill 1.9s linear forwards;
        }

        @keyframes modeFlip {
          0% {
            transform: rotateY(0deg) rotateX(0deg) translateY(16px) scale(0.9);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          42% {
            transform: rotateY(92deg) rotateX(8deg) translateY(-4px) scale(1.04);
          }
          58% {
            transform: rotateY(126deg) rotateX(-5deg) translateY(-8px) scale(1.02);
          }
          100% {
            transform: rotateY(180deg) rotateX(0deg) translateY(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes gridDrift {
          from {
            transform: perspective(900px) rotateX(62deg) translateY(145px);
            opacity: 0;
          }
          to {
            transform: perspective(900px) rotateX(62deg) translateY(115px);
            opacity: 0.5;
          }
        }

        @keyframes ringSpin {
          from {
            transform: rotateX(68deg) rotateZ(-26deg) scale(0.9);
            opacity: 0;
          }
          to {
            transform: rotateX(68deg) rotateZ(128deg) scale(1);
            opacity: 1;
          }
        }

        @keyframes ringCounterSpin {
          from {
            transform: rotateX(68deg) rotateZ(70deg) scale(0.86);
            opacity: 0;
          }
          to {
            transform: rotateX(68deg) rotateZ(-58deg) scale(1);
            opacity: 0.9;
          }
        }

        @keyframes scanSweep {
          0% {
            transform: translateY(-74px) scaleX(0.3);
            opacity: 0;
          }
          18% {
            opacity: 1;
          }
          100% {
            transform: translateY(88px) scaleX(1);
            opacity: 0;
          }
        }

        @keyframes glassSweep {
          0% {
            transform: translateX(0) rotate(8deg);
            opacity: 0;
          }
          24% {
            opacity: 1;
          }
          100% {
            transform: translateX(420px) rotate(8deg);
            opacity: 0;
          }
        }

        @keyframes shadowPulse {
          from {
            transform: scaleX(0.72);
            opacity: 0;
          }
          45% {
            transform: scaleX(1.1);
            opacity: 1;
          }
          to {
            transform: scaleX(1);
            opacity: 0.8;
          }
        }

        @keyframes titleResolve {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          58% {
            opacity: 0;
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes progressFill {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mode-switch-grid,
          .mode-switch-ring,
          .mode-switch-scan,
          .mode-switch-shell::before,
          .mode-switch-stage::after,
          .mode-switch-title,
          .mode-switch-progress span {
            animation: none;
          }

          .mode-switch-card {
            animation: none;
            transform: rotateY(180deg);
          }
        }
      `}</style>
    </>
  );
}

function Scene({ mode }: { mode: Mode }) {
  return (
    <div className={`scene ${mode === "guest" ? "scene-guest" : "scene-host"}`} aria-hidden="true">
      {mode === "guest" ? <GuestScene /> : <HostScene />}
      <style jsx>{`
        .scene {
          height: 170px;
          position: relative;
          width: 210px;
        }

        .scene :global(*) {
          position: absolute;
        }

        .scene-guest {
          filter: drop-shadow(0 26px 26px rgba(15, 23, 42, 0.12));
        }

        .scene-host {
          filter: drop-shadow(0 24px 24px rgba(15, 23, 42, 0.14));
        }
      `}</style>
    </div>
  );
}

function GuestScene() {
  return (
    <>
      <span className="sand" />
      <span className="shade" />
      <span className="trunk" />
      <span className="leaf leaf-a" />
      <span className="leaf leaf-b" />
      <span className="leaf leaf-c" />
      <span className="leaf leaf-d" />
      <span className="coconut coconut-a" />
      <span className="coconut coconut-b" />
      <span className="chair chair-a" />
      <span className="chair chair-b" />
      <span className="parasol" />
      <span className="parasol-stick" />
      <style jsx>{`
        .sand {
          background: radial-gradient(ellipse at center, #f3d7a1 0%, #e8c383 64%, rgba(232, 195, 131, 0) 73%);
          border-radius: 50%;
          bottom: 18px;
          height: 86px;
          left: 18px;
          transform: rotate(-3deg);
          width: 174px;
        }

        .shade {
          background: rgba(148, 163, 184, 0.18);
          border-radius: 50%;
          bottom: 30px;
          height: 54px;
          right: 10px;
          transform: rotate(-8deg);
          width: 86px;
        }

        .trunk {
          background: linear-gradient(90deg, #8b5a2b, #c47a3a);
          border-radius: 999px;
          height: 92px;
          left: 90px;
          top: 20px;
          transform: rotate(18deg);
          transform-origin: bottom center;
          width: 10px;
        }

        .leaf {
          background: linear-gradient(90deg, #2f8f3d, #79c44c);
          border-radius: 100% 8% 100% 8%;
          height: 22px;
          left: 80px;
          top: 12px;
          transform-origin: left center;
          width: 58px;
        }

        .leaf-a {
          transform: rotate(-34deg);
        }

        .leaf-b {
          transform: rotate(8deg);
        }

        .leaf-c {
          left: 48px;
          top: 22px;
          transform: rotate(165deg);
        }

        .leaf-d {
          left: 60px;
          top: 2px;
          transform: rotate(214deg);
        }

        .coconut {
          background: #7a451d;
          border-radius: 50%;
          height: 10px;
          left: 86px;
          top: 42px;
          width: 10px;
        }

        .coconut-b {
          left: 96px;
          top: 43px;
        }

        .chair {
          background: linear-gradient(135deg, #f8fafc 0 34%, #4aa3df 35% 100%);
          border-radius: 999px 999px 6px 6px;
          bottom: 52px;
          height: 16px;
          left: 68px;
          transform: rotate(-16deg);
          width: 52px;
        }

        .chair::after {
          background: #b7791f;
          border-radius: 999px;
          content: "";
          height: 5px;
          left: -2px;
          position: absolute;
          top: 16px;
          width: 58px;
        }

        .chair-b {
          left: 110px;
          transform: rotate(-12deg);
        }

        .parasol {
          background: conic-gradient(from 180deg, #f8e2b8, #f1c36f, #f8e2b8);
          border-radius: 80px 80px 12px 12px;
          height: 35px;
          right: 28px;
          top: 76px;
          width: 68px;
        }

        .parasol-stick {
          background: #b7791f;
          height: 42px;
          right: 61px;
          top: 104px;
          width: 4px;
        }
      `}</style>
    </>
  );
}

function HostScene() {
  return (
    <>
      <span className="yard" />
      <span className="house" />
      <span className="roof" />
      <span className="door" />
      <span className="window window-a" />
      <span className="window window-b" />
      <span className="tree-trunk" />
      <span className="tree-top" />
      <span className="key-ring" />
      <span className="key-stem" />
      <span className="key-bit" />
      <style jsx>{`
        .yard {
          background: radial-gradient(ellipse at center, #d9ecd2 0%, #b7dda8 58%, rgba(183, 221, 168, 0) 72%);
          border-radius: 50%;
          bottom: 14px;
          height: 80px;
          left: 20px;
          width: 172px;
        }

        .house {
          background: linear-gradient(180deg, #fff8ef, #f4e3cd);
          border: 2px solid #e2c7a1;
          border-radius: 12px;
          bottom: 46px;
          height: 76px;
          left: 54px;
          width: 108px;
        }

        .roof {
          background: linear-gradient(135deg, #dc244f, #f0647d);
          clip-path: polygon(50% 0, 100% 58%, 90% 100%, 10% 100%, 0 58%);
          height: 58px;
          left: 42px;
          top: 30px;
          width: 132px;
        }

        .door {
          background: linear-gradient(180deg, #72411f, #a85f2b);
          border-radius: 8px 8px 2px 2px;
          bottom: 47px;
          height: 42px;
          left: 92px;
          width: 28px;
        }

        .door::after {
          background: #f7d36b;
          border-radius: 50%;
          content: "";
          height: 5px;
          position: absolute;
          right: 5px;
          top: 21px;
          width: 5px;
        }

        .window {
          background: linear-gradient(135deg, #dff7ff, #86d7f3);
          border: 3px solid #ffffff;
          border-radius: 8px;
          height: 24px;
          top: 84px;
          width: 24px;
        }

        .window-a {
          left: 66px;
        }

        .window-b {
          right: 60px;
        }

        .tree-trunk {
          background: #8b5a2b;
          border-radius: 999px;
          bottom: 42px;
          height: 44px;
          right: 30px;
          width: 8px;
        }

        .tree-top {
          background: radial-gradient(circle at 35% 35%, #7fc35c, #2f8f3d 70%);
          border-radius: 50%;
          height: 44px;
          right: 12px;
          top: 66px;
          width: 54px;
        }

        .key-ring {
          border: 5px solid #f2b84b;
          border-radius: 50%;
          height: 25px;
          left: 28px;
          top: 72px;
          width: 25px;
        }

        .key-stem {
          background: #f2b84b;
          border-radius: 999px;
          height: 7px;
          left: 50px;
          top: 82px;
          width: 34px;
        }

        .key-bit {
          border-bottom: 8px solid #f2b84b;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          height: 0;
          left: 75px;
          top: 88px;
          width: 16px;
        }
      `}</style>
    </>
  );
}
