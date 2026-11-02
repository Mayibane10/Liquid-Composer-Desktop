import {
    useState,
    useEffect,
    useLayoutEffect,
    useRef,
    useCallback,
} from "react";
import { useStore } from "@nanostores/react";
import {
    $background,
    updateBackground,
    bgColorsFromHueTint,
} from "../../store/iconStore";
import { ColorPicker } from "../ui/ColorPicker";

function hslToHex(h: number, s: number, l: number): string {
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
    const channel = (n: number) => {
        const k = (n + h / 30) % 12;
        return Math.round(
            (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255,
        )
            .toString(16)
            .padStart(2, "0");
    };
    return `#${channel(0)}${channel(8)}${channel(4)}`;
}

function hexToHSL(hex: string): { h: number; s: number; l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return { h: 0, s: 0, l: Math.round(l * 100) };
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return {
        h: Math.round((h / 6) * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

const PRESET_COLORS = [
    { hex: "#FF383C", label: "Red" },
    { hex: "#FF8D28", label: "Orange" },
    { hex: "#FFCC00", label: "Yellow" },
    { hex: "#34C759", label: "Green" },
    { hex: "#00C8B3", label: "Mint" },
    { hex: "#00C3D0", label: "Teal" },
    { hex: "#00C0E8", label: "Cyan" },
    { hex: "#0088FF", label: "Blue" },
    { hex: "#6155F5", label: "Indigo" },
    { hex: "#CB30E0", label: "Purple" },
    { hex: "#FF2D55", label: "Pink" },
    { hex: "#AC7F5E", label: "Brown" },
    { hex: "#F2F2F7", label: "White" },
    { hex: "#1C1C1E", label: "Near Black" },
];

const GRADIENT_PRESETS = [
    {
        label: "System Light",
        stops: [
            { offset: 0, color: "#FFFFFF" },
            { offset: 1, color: "#F5F5F5" },
        ],
    },
    {
        label: "System Dark",
        stops: [
            { offset: 0, color: "#1F1F1F" },
            { offset: 1, color: "#0F0F0F" },
        ],
    },
];

type Stop = { offset: number; color: string };
const DEFAULT_STOPS: Stop[] = [
    { offset: 0, color: "#2a2a2e" },
    { offset: 1, color: "#1a1a1e" },
];
const MAX_STOPS = 12;

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
    onChange: (v: number) => void;
    onRelease: () => void;
}) {
    const pct = ((value - min) / (max - min)) * 100;
    return (
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
                    left: `calc(${pct}% - 7px)`,
                    background: thumbColor,
                    boxShadow:
                        "0 1px 4px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(255,255,255,0.25)",
                }}
            />
            <input
                type="range"
                aria-label={label}
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
    );
}

export function BackgroundControls() {
    const bg = useStore($background);
    const storeBgType = bg.bgType ?? "preset";
    const storeStops = bg.stops?.length ? bg.stops : DEFAULT_STOPS;
    const storeHue = bg.hue ?? 220;
    const storeTint = bg.tint ?? 20;
    const storeBrightness = bg.brightness ?? 100;
    const storeLightAngle = bg.lightAngle ?? 315;
    const storeLightIntensity = bg.lightIntensity ?? 0;
    const storeGradientAngle = bg.angle ?? 90;

    const [localBgType, setLocalBgType] = useState(storeBgType);
    const [localStops, setLocalStops] = useState<Stop[]>(storeStops);
    const [localHue, setLocalHue] = useState(storeHue);
    const [localTint, setLocalTint] = useState(storeTint);
    const [localBrightness, setLocalBrightness] = useState(storeBrightness);
    const [lightAngle, setLightAngle] = useState(storeLightAngle);
    const [lightIntensity, setLightIntensity] = useState(storeLightIntensity);
    const [gradientAngle, setGradientAngle] = useState(storeGradientAngle);

    const hue = localHue;
    const tint = localTint;
    const brightness = localBrightness;

    const bgValuesRef = useRef({
        type: storeBgType,
        stops: storeStops,
        hue: storeHue,
        tint: storeTint,
        brightness: storeBrightness,
        lightAngle: storeLightAngle,
        lightIntensity: storeLightIntensity,
        gradientAngle: storeGradientAngle,
    });

    const rafRef = useRef(0);

    const applyUpdate = useCallback(() => {
        const v = bgValuesRef.current;
        const common = {
            lightAngle: v.lightAngle,
            lightIntensity: v.lightIntensity,
        };
        if (v.type === "custom") {
            updateBackground({
                type: "gradient",
                bgType: "custom",
                stops: v.stops,
                angle: v.gradientAngle,
                ...common,
            });
        } else {
            updateBackground({
                type: "gradient",
                bgType: "preset",
                hue: v.hue,
                tint: v.tint,
                brightness: v.brightness,
                colors: bgColorsFromHueTint(v.hue, v.tint, v.brightness),
                angle: v.gradientAngle,
                ...common,
            });
        }
    }, []);

    const flushUpdate = useCallback(() => {
        if (!rafRef.current) return;
        clearTimeout(rafRef.current);
        rafRef.current = 0;
        applyUpdate();
    }, [applyUpdate]);

    const scheduleUpdate = useCallback(() => {
        if (rafRef.current) return;
        rafRef.current = window.setTimeout(() => {
            rafRef.current = 0;
            applyUpdate();
        }, 33);
    }, [applyUpdate]);

    useLayoutEffect(() => {
        if (rafRef.current) {
            clearTimeout(rafRef.current);
            rafRef.current = 0;
        }
        setLocalBgType(storeBgType);
        setLocalStops(storeStops);
        setLocalHue(storeHue);
        setLocalTint(storeTint);
        setLocalBrightness(storeBrightness);
        setLightAngle(storeLightAngle);
        setLightIntensity(storeLightIntensity);
        setGradientAngle(storeGradientAngle);
        bgValuesRef.current = {
            type: storeBgType,
            stops: storeStops,
            hue: storeHue,
            tint: storeTint,
            brightness: storeBrightness,
            lightAngle: storeLightAngle,
            lightIntensity: storeLightIntensity,
            gradientAngle: storeGradientAngle,
        };
    }, [bg]);

    useEffect(
        () => () => {
            if (rafRef.current) flushUpdate();
        },
        [flushUpdate],
    );

    const handleHueChange = (h: number) => {
        setLocalHue(h);
        bgValuesRef.current.hue = h;
        scheduleUpdate();
    };
    const handleTintChange = (t: number) => {
        setLocalTint(t);
        bgValuesRef.current.tint = t;
        scheduleUpdate();
    };
    const handleBrightnessChange = (v: number) => {
        setLocalBrightness(v);
        bgValuesRef.current.brightness = v;
        scheduleUpdate();
    };

    const handleCustomColor = (hex: string) => {
        if (localBgType === "preset") {
            const { h, s, l } = hexToHSL(hex);
            const newTint = Math.round(
                Math.min(100, Math.max(0, (1 - s / 85) * 100)),
            );
            const newBrightness = Math.round(
                Math.min(100, Math.max(0, (l * 100) / (48 + newTint * 0.52))),
            );
            setLocalHue(h);
            setLocalTint(newTint);
            setLocalBrightness(newBrightness);
            bgValuesRef.current = {
                ...bgValuesRef.current,
                type: "preset",
                hue: h,
                tint: newTint,
                brightness: newBrightness,
            };
        } else {
            const next = localStops.map((s, i) =>
                i === 0 ? { ...s, color: hex } : s,
            );
            setLocalStops(next);
            bgValuesRef.current = {
                ...bgValuesRef.current,
                type: "custom",
                stops: next,
            };
        }
        scheduleUpdate();
    };

    const commitStops = (next: Stop[]) => {
        const sorted = [...next].sort((a, b) => a.offset - b.offset);
        setLocalStops(sorted);
        bgValuesRef.current = {
            ...bgValuesRef.current,
            type: "custom",
            stops: sorted,
        };
        setLocalBgType("custom");
        scheduleUpdate();
    };

    const handleStopColor = (index: number, color: string) => {
        if (!/^#[0-9a-f]{6}$/i.test(color)) return;
        commitStops(
            localStops.map((s, i) => (i === index ? { ...s, color } : s)),
        );
    };

    const handleStopOffset = (index: number, offset: number) => {
        commitStops(
            localStops.map((s, i) =>
                i === index
                    ? { ...s, offset: Math.max(0, Math.min(1, offset)) }
                    : s,
            ),
        );
    };

    const addGradientStop = () => {
        if (localStops.length >= MAX_STOPS) return;
        const sorted = [...localStops].sort((a, b) => a.offset - b.offset);
        let bestGap = -1,
            insertOffset = 0.5,
            color = sorted[0]?.color ?? "#808080";
        for (let i = 0; i < sorted.length - 1; i++) {
            const gap = sorted[i + 1].offset - sorted[i].offset;
            if (gap > bestGap) {
                bestGap = gap;
                insertOffset = (sorted[i].offset + sorted[i + 1].offset) / 2;
                color = sorted[i].color;
            }
        }
        commitStops([...sorted, { offset: insertOffset, color }]);
    };

    const removeGradientStop = (index: number) => {
        if (localStops.length <= 2) return;
        commitStops(localStops.filter((_, i) => i !== index));
    };

    const updateLight = (angle: number, intensity: number) => {
        setLightAngle(angle);
        setLightIntensity(intensity);
        bgValuesRef.current = {
            ...bgValuesRef.current,
            lightAngle: angle,
            lightIntensity: intensity,
        };
        scheduleUpdate();
    };
    const updateGradientAngle = (angle: number) => {
        setGradientAngle(angle);
        bgValuesRef.current = { ...bgValuesRef.current, gradientAngle: angle };
        scheduleUpdate();
    };

    const sat = Math.round(85 * (1 - tint / 100));
    const l1cur = Math.min(
        100,
        Math.round(((48 + tint * 0.52) * brightness) / 100),
    );
    const hueTrack = [
        0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360,
    ]
        .map(h => `hsl(${h},100%,50%)`)
        .join(", ");
    const tintTrack = `linear-gradient(to right, hsl(${hue},85%,${Math.round((48 * brightness) / 100)}%), hsl(${hue},0%,${Math.min(100, Math.round(brightness))}%))`;
    const brightTrack = `linear-gradient(to right, #000, hsl(${hue},${sat}%,${Math.min(100, 48 + tint * 0.52)}%))`;
    const currentHue = `hsl(${hue},100%,50%)`;
    const currentTint = `hsl(${hue},${sat}%,${l1cur}%)`;
    const bgPreview =
        localBgType === "custom"
            ? `linear-gradient(135deg, ${[...localStops]
                  .sort((a, b) => a.offset - b.offset)
                  .map(s => s.color)
                  .join(", ")})`
            : `linear-gradient(135deg, ${bgColorsFromHueTint(hue, tint, brightness).join(", ")})`;

    const previewLightAlpha =
        (Math.max(0, Math.min(100, lightIntensity)) / 100) * 0.48;
    const previewLight = `linear-gradient(${lightAngle + 90}deg, rgba(0,0,0,${previewLightAlpha * 0.7}) 0%, rgba(255,255,255,0) 48%, rgba(255,255,255,${previewLightAlpha}) 100%)`;
    const bgPreviewStyle = {
        backgroundImage: `${previewLight}, ${bgPreview}`,
        backgroundBlendMode: "soft-light, normal" as const,
        boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.12)",
    };

    return (
        <div>
            <div className="flex border-b border-white/[0.06]">
                {(["preset", "custom"] as const).map(type => (
                    <button
                        key={type}
                        type="button"
                        aria-pressed={localBgType === type}
                        className={`flex-1 text-[11px] font-semibold py-2 transition-all ${localBgType === type ? "text-white border-b-2 border-[#0a84ff]" : "text-white/35 hover:text-white/60"}`}
                        style={{ marginBottom: localBgType === type ? -1 : 0 }}
                        onClick={() => {
                            setLocalBgType(type);
                            bgValuesRef.current.type = type;
                            scheduleUpdate();
                        }}>
                        {type === "preset" ? "Solid" : "Gradient"}
                    </button>
                ))}
            </div>

            {localBgType === "preset" ? (
                <div className="p-4 space-y-4">
                    <ColorPicker
                        label="Background color"
                        value={hslToHex(hue, sat, l1cur)}
                        onChange={handleCustomColor}
                        className="relative group block w-full rounded-[8px]">
                        <span
                            aria-hidden="true"
                            className="block w-full h-8 rounded-[8px]"
                            style={bgPreviewStyle}
                        />
                        <span
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-[10px]"
                            style={{ background: "rgba(0,0,0,0.35)" }}>
                            <span className="text-[10px] text-white font-medium">
                                Custom color
                            </span>
                        </span>
                    </ColorPicker>
                    <div>
                        <span
                            className="text-[10px] font-semibold uppercase tracking-widest mb-2 block"
                            style={{ color: "rgba(255,255,255,0.28)" }}>
                            Presets
                        </span>
                        <div className="grid grid-cols-7 gap-1.5 w-full">
                            {PRESET_COLORS.map(({ hex, label }) => (
                                <button
                                    type="button"
                                    key={hex}
                                    title={label}
                                    aria-label={label}
                                    onClick={() => handleCustomColor(hex)}
                                    className="aspect-square rounded-lg transition-transform hover:scale-110 active:scale-95"
                                    style={{
                                        background: hex,
                                        boxShadow:
                                            "0 0 0 0.5px rgba(255,255,255,0.15), 0 1px 4px rgba(0,0,0,0.3)",
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <span
                            className="text-[10px] font-semibold uppercase tracking-widest mb-2 block"
                            style={{ color: "rgba(255,255,255,0.28)" }}>
                            Hue
                        </span>
                        <GradientSlider
                            label="Hue"
                            value={hue}
                            min={0}
                            max={360}
                            trackGradient={`linear-gradient(to right, ${hueTrack})`}
                            thumbColor={currentHue}
                            onChange={handleHueChange}
                            onRelease={flushUpdate}
                        />
                    </div>
                    <div>
                        <span
                            className="text-[10px] font-semibold uppercase tracking-widest mb-2 block"
                            style={{ color: "rgba(255,255,255,0.28)" }}>
                            Tint
                        </span>
                        <GradientSlider
                            label="Tint"
                            value={tint}
                            min={0}
                            max={100}
                            trackGradient={tintTrack}
                            thumbColor={currentTint}
                            onChange={handleTintChange}
                            onRelease={flushUpdate}
                        />
                    </div>
                    <div>
                        <span
                            className="text-[10px] font-semibold uppercase tracking-widest mb-2 block"
                            style={{ color: "rgba(255,255,255,0.28)" }}>
                            Brightness
                        </span>
                        <GradientSlider
                            label="Brightness"
                            value={brightness}
                            min={0}
                            max={100}
                            trackGradient={brightTrack}
                            thumbColor={currentTint}
                            onChange={handleBrightnessChange}
                            onRelease={flushUpdate}
                        />
                    </div>
                </div>
            ) : (
                <div className="p-4 space-y-3">
                    <div
                        className="w-full h-8 rounded-[8px]"
                        style={bgPreviewStyle}
                    />
                    <div className="space-y-3">
                        {localStops.map((stop, i) => (
                            <div
                                key={`${i}-${stop.offset}`}
                                className="rounded-lg border border-white/[0.07] p-2 space-y-2">
                                <div className="flex items-center gap-2">
                                    <ColorPicker
                                        label={`Gradient stop ${i + 1} color`}
                                        value={stop.color}
                                        onChange={hex =>
                                            handleStopColor(i, hex)
                                        }
                                    />
                                    <input
                                        type="text"
                                        aria-label={`Gradient stop ${i + 1} hex color`}
                                        value={stop.color.toUpperCase()}
                                        onChange={e =>
                                            handleStopColor(i, e.target.value)
                                        }
                                        className="flex-1 min-w-0 text-xs bg-[#1a1a1c] border border-white/[0.08] rounded-[6px] px-2 py-1.5 text-[#ebebf5] focus:outline-hidden focus:border-[#0a84ff] font-mono"
                                    />
                                    <button
                                        type="button"
                                        aria-label={`Remove gradient stop ${i + 1}`}
                                        title="Remove stop"
                                        disabled={localStops.length <= 2}
                                        onClick={() => removeGradientStop(i)}
                                        className="text-white/50 hover:text-white disabled:opacity-20 px-2">
                                        ×
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-white/40 w-12">
                                        Position
                                    </span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={Math.round(stop.offset * 100)}
                                        aria-label={`Gradient stop ${i + 1} position`}
                                        onChange={e =>
                                            handleStopOffset(
                                                i,
                                                Number(e.target.value) / 100,
                                            )
                                        }
                                        className="flex-1 accent-[#0a84ff]"
                                    />
                                    <span className="text-[10px] text-white/55 font-mono w-9 text-right">
                                        {Math.round(stop.offset * 100)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        disabled={localStops.length >= MAX_STOPS}
                        onClick={addGradientStop}
                        className="w-full rounded-lg border border-dashed border-white/20 py-2 text-xs font-medium text-white/70 hover:text-white hover:border-white/40 disabled:opacity-30">
                        + Add gradient stop ({localStops.length}/{MAX_STOPS})
                    </button>
                    <div>
                        <span
                            className="text-[10px] font-semibold uppercase tracking-widest mb-2 block"
                            style={{ color: "rgba(255,255,255,0.28)" }}>
                            Presets
                        </span>
                        <div className="grid grid-cols-7 gap-1.5 w-full">
                            {GRADIENT_PRESETS.map(({ label, stops }) => (
                                <button
                                    type="button"
                                    key={label}
                                    title={label}
                                    aria-label={label}
                                    onClick={() => commitStops(stops)}
                                    className="aspect-square rounded-lg transition-transform hover:scale-110 active:scale-95"
                                    style={{
                                        background: `linear-gradient(180deg, ${stops.map(s => s.color).join(", ")})`,
                                        boxShadow:
                                            "0 0 0 0.5px rgba(255,255,255,0.15), 0 1px 4px rgba(0,0,0,0.3)",
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="border-t border-white/[0.08] pt-3 space-y-2">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label
                                    htmlFor="bg-gradient-angle"
                                    className="text-xs text-white/65">
                                    Gradient orientation
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="359"
                                    value={gradientAngle}
                                    aria-label="Gradient orientation in degrees"
                                    onChange={e => {
                                        if (e.target.value === "") return;
                                        updateGradientAngle(
                                            Math.max(
                                                0,
                                                Math.min(
                                                    359,
                                                    Number(e.target.value),
                                                ),
                                            ),
                                        );
                                    }}
                                    className="w-16 text-right text-xs font-mono bg-[#1a1a1c] border border-white/10 rounded px-1.5 py-1 text-white"
                                />
                            </div>
                            <input
                                id="bg-gradient-angle"
                                type="range"
                                min="0"
                                max="359"
                                value={gradientAngle}
                                onChange={e =>
                                    updateGradientAngle(Number(e.target.value))
                                }
                                className="w-full accent-[#0a84ff]"
                            />
                        </div>
                        <span
                            className="text-[10px] font-semibold uppercase tracking-widest block"
                            style={{ color: "rgba(255,255,255,0.45)" }}>
                            Directional background light
                        </span>
                        <div className="flex items-center justify-between">
                            <label
                                htmlFor="bg-light-angle"
                                className="text-xs text-white/65">
                                Direction
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="359"
                                value={lightAngle}
                                aria-label="Light direction in degrees"
                                onChange={e => {
                                    if (e.target.value === "") return;
                                    updateLight(
                                        Math.max(
                                            0,
                                            Math.min(
                                                359,
                                                Number(e.target.value),
                                            ),
                                        ),
                                        lightIntensity,
                                    );
                                }}
                                className="w-16 text-right text-xs font-mono bg-[#1a1a1c] border border-white/10 rounded px-1.5 py-1 text-white"
                            />
                        </div>
                        <input
                            id="bg-light-angle"
                            type="range"
                            min="0"
                            max="359"
                            value={lightAngle}
                            onChange={e =>
                                updateLight(
                                    Number(e.target.value),
                                    lightIntensity,
                                )
                            }
                            className="w-full accent-[#0a84ff]"
                        />
                        <div className="flex items-center justify-between">
                            <label
                                htmlFor="bg-light-intensity"
                                className="text-xs text-white/65">
                                Intensity
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={lightIntensity}
                                aria-label="Light intensity percentage"
                                onChange={e => {
                                    if (e.target.value === "") return;
                                    updateLight(
                                        lightAngle,
                                        Math.max(
                                            0,
                                            Math.min(
                                                100,
                                                Number(e.target.value),
                                            ),
                                        ),
                                    );
                                }}
                                className="w-16 text-right text-xs font-mono bg-[#1a1a1c] border border-white/10 rounded px-1.5 py-1 text-white"
                            />
                        </div>
                        <input
                            id="bg-light-intensity"
                            type="range"
                            min="0"
                            max="100"
                            value={lightIntensity}
                            onChange={e =>
                                updateLight(lightAngle, Number(e.target.value))
                            }
                            className="w-full accent-[#0a84ff]"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
