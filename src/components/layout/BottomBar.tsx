import { useStore } from "@nanostores/react";
import {
    $appearanceMode,
    $tintHue,
    $tintSaturation,
    $tintLightness,
    setAppearanceMode,
} from "../../store/uiStore";
import type { AppearanceMode } from "../../types/index";

function GradientSlider({
    value,
    min,
    max,
    trackGradient,
    thumbColor,
    onChange,
    onRelease,
    label,
}: {
    value: number;
    min: number;
    max: number;
    trackGradient: string;
    thumbColor: string;
    label: string;
    onChange: (value: number) => void;
    onRelease: () => void;
}) {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div className="tint-gradient-slider">
            <label
                className="tint-gradient-label"
                htmlFor={`tint-${label.toLowerCase()}`}>
                {label}
            </label>
            <div className="relative h-8 flex items-center select-none rounded focus-within:outline-2 focus-within:outline-[#64a8ff]">
                <div
                    className="absolute left-0 right-0 h-[10px] rounded-full"
                    style={{
                        background: trackGradient,
                        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)",
                    }}
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-[14px] h-[14px] rounded-full pointer-events-none"
                    style={{
                        left: `${pct}%`,
                        transform: "translate(-50%, -0%)",
                        background: thumbColor,
                        boxShadow:
                            "0 1px 4px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(255,255,255,0.25)",
                    }}
                />
                <input
                    id={`tint-${label.toLowerCase()}`}
                    type="range"
                    aria-label={`Tint ${label}`}
                    min={min}
                    max={max}
                    value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    onPointerUp={onRelease}
                    onPointerCancel={onRelease}
                    onKeyUp={onRelease}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
            </div>
            {/* <input className="tint-gradient-value" type="number" aria-label={`Tint ${label} value`} min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} onBlur={e => onChange(Math.max(min, Math.min(max, Number(e.currentTarget.value) || 0)))} /> */}
            {/* <span className="tint-gradient-unit">%</span> */}
        </div>
    );
}

const MODES: { value: AppearanceMode; label: string }[] = [
    { value: "default", label: "Default" },
    { value: "dark", label: "Dark" },
    { value: "clear", label: "Clear" },
    { value: "tintedLight", label: "Tinted" },
];

export function BottomBar() {
    const mode = useStore($appearanceMode);
    const hue = useStore($tintHue),
        saturation = useStore($tintSaturation),
        lightness = useStore($tintLightness);
    const clearFamily = mode === "clear" || mode === "clearDark";
    const tintedFamily = mode === "tintedLight" || mode === "tintedDark";
    const family = clearFamily ? "clear" : tintedFamily ? "tinted" : null;
    const setTint = (
        kind: "hue" | "saturation" | "lightness",
        value: number,
    ) => {
        const v =
            kind === "hue"
                ? Math.max(0, Math.min(360, value))
                : Math.max(0, Math.min(100, value));
        if (kind === "hue") $tintHue.set(v);
        else if (kind === "saturation") $tintSaturation.set(v);
        else $tintLightness.set(v);
    };
    const hueTrack = `linear-gradient(to right, ${Array.from({ length: 13 }, (_, i) => `hsl(${i * 30},100%,50%)`).join(", ")})`;
    const tintTrack = `linear-gradient(to right, hsl(${hue},0%,${lightness}%), hsl(${hue},100%,${lightness}%))`;
    const brightnessTrack = `linear-gradient(to right, #000, hsl(${hue},${saturation}%,50%), #fff)`;
    const thumbColor = `hsl(${hue},${saturation}%,${lightness}%)`;
    return (
        <div className="appearance-controls">
            <div
                className="appearance-segments"
                role="group"
                aria-label="Icon appearance">
                {MODES.map(m => {
                    const isFamily =
                        m.value === "clear" || m.value === "tintedLight";
                    const active = isFamily
                        ? family === (m.value === "clear" ? "clear" : "tinted")
                        : mode === m.value;
                    return (
                        <button
                            key={m.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => {
                                if (isFamily)
                                    setAppearanceMode(
                                        m.value === "clear"
                                            ? clearFamily
                                                ? mode
                                                : "clear"
                                            : tintedFamily
                                              ? mode
                                              : "tintedLight",
                                    );
                                else if (!active) setAppearanceMode(m.value);
                            }}>
                            {m.label}
                        </button>
                    );
                })}
                {family && (
                    <>
                        <span className="segment-divider" aria-hidden="true" />
                        <button
                            type="button"
                            aria-pressed={
                                family === "clear"
                                    ? mode === "clear"
                                    : mode === "tintedLight"
                            }
                            onClick={() =>
                                setAppearanceMode(
                                    family === "clear"
                                        ? "clear"
                                        : "tintedLight",
                                )
                            }>
                            Light
                        </button>
                        <button
                            type="button"
                            aria-pressed={
                                family === "clear"
                                    ? mode === "clearDark"
                                    : mode === "tintedDark"
                            }
                            onClick={() =>
                                setAppearanceMode(
                                    family === "clear"
                                        ? "clearDark"
                                        : "tintedDark",
                                )
                            }>
                            Dark
                        </button>
                    </>
                )}
            </div>
            {tintedFamily && (
                <div className="tint-controls" aria-label="Tint color sliders">
                    <span
                        className="tint-swatch"
                        style={{
                            background: `hsl(${hue} ${saturation}% ${lightness}%)`,
                        }}
                    />
                    <GradientSlider
                        label="Hue"
                        value={hue}
                        min={0}
                        max={360}
                        onChange={v => setTint("hue", v)}
                        onRelease={() => {}}
                        trackGradient={hueTrack}
                        thumbColor={`hsl(${hue},100%,50%)`}
                    />
                    <GradientSlider
                        label="Tint"
                        value={saturation}
                        min={0}
                        max={100}
                        onChange={v => setTint("saturation", v)}
                        onRelease={() => {}}
                        trackGradient={tintTrack}
                        thumbColor={thumbColor}
                    />
                    <GradientSlider
                        label="Brightness"
                        value={lightness}
                        min={0}
                        max={100}
                        onChange={v => setTint("lightness", v)}
                        onRelease={() => {}}
                        trackGradient={brightnessTrack}
                        thumbColor={thumbColor}
                    />
                </div>
            )}
        </div>
    );
}
