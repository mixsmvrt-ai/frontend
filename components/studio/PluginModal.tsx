"use client";

import type React from "react";
import { useEffect, useState } from "react";
import type { TrackPlugin } from "./pluginTypes";
import PluginShell from "./plugins/PluginShell";
import ParametricEQ from "./plugins/ParametricEQ";
import Compressor from "./plugins/Compressor";
import DeEsser from "./plugins/DeEsser";
import PitchCorrectionPlugin from "./plugins/PitchCorrection";
import Saturation from "./plugins/Saturation";
import Reverb from "./plugins/Reverb";
import Delay from "./plugins/Delay";
import Limiter from "./plugins/Limiter";
import MasteringEQ from "./plugins/MasteringEQ";
import MasterBusCompressor from "./plugins/MasterBusCompressor";
import StereoImager from "./plugins/StereoImager";

type PluginModalProps = {
  plugin: TrackPlugin;
  onChange: (plugin: TrackPlugin) => void;
  onClose: () => void;
  shellClassName?: string;
  onHeaderPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  onHeaderPointerMove?: React.PointerEventHandler<HTMLDivElement>;
  onHeaderPointerUp?: React.PointerEventHandler<HTMLDivElement>;
  onHeaderPointerCancel?: React.PointerEventHandler<HTMLDivElement>;
};

export default function PluginModal({
  plugin,
  onChange,
  onClose,
  shellClassName,
  onHeaderPointerDown,
  onHeaderPointerMove,
  onHeaderPointerUp,
  onHeaderPointerCancel,
}: PluginModalProps) {
  const [local, setLocal] = useState<TrackPlugin>(plugin);

  useEffect(() => {
    setLocal(plugin);
  }, [plugin]);

  const commit = (next: TrackPlugin) => {
    setLocal(next);
    onChange(next);
  };

  const renderPlugin = () => {
    switch (local.pluginType) {
      case "EQ":
        return <ParametricEQ plugin={local} onChange={commit} />;
      case "Compressor":
        return <Compressor plugin={local} onChange={commit} />;
      case "De-esser":
        return <DeEsser plugin={local} onChange={commit} />;
      case "Pitch Correction":
        return <PitchCorrectionPlugin plugin={local} onChange={commit} />;
      case "Saturation":
        return <Saturation plugin={local} onChange={commit} />;
      case "Reverb":
        return <Reverb plugin={local} onChange={commit} />;
      case "Delay":
        return <Delay plugin={local} onChange={commit} />;
      case "Limiter":
        return <Limiter plugin={local} onChange={commit} />;
      case "Mastering EQ":
        return <MasteringEQ plugin={local} onChange={commit} />;
      case "Master Bus Compressor":
        return <MasterBusCompressor plugin={local} onChange={commit} />;
      case "Stereo Imager":
        return <StereoImager plugin={local} onChange={commit} />;
      default:
        return (
          <p className="text-[12px] text-white/60">
            This plugin type does not yet expose detailed controls.
          </p>
        );
    }
  };

  return (
    <PluginShell
      plugin={local}
      onChange={commit}
      onClose={onClose}
      className={shellClassName}
      onHeaderPointerDown={onHeaderPointerDown}
      onHeaderPointerMove={onHeaderPointerMove}
      onHeaderPointerUp={onHeaderPointerUp}
      onHeaderPointerCancel={onHeaderPointerCancel}
    >
      {renderPlugin()}
    </PluginShell>
  );
}
