import { Atom, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NumberField } from '@/components/number-field';
import { PanelSection } from '@/components/panel-section';
import { COMPACT_INPUT_CLASS, ToggleRow, WithUnit } from '@/components/controls';
import { useEngine } from '@/engine/EngineContext';
import { appStore, useAppStore } from '@/store/appStore';
import { OrbitSection } from './OrbitSection';

/** 軌道・力学: 基準軌道、力学モデル、外乱と衝突 */
export function OrbitTab() {
    return (
        <div>
            <OrbitSection />
            <DynamicsSection />
            <DisturbanceSection />
        </div>
    );
}

function DynamicsSection() {
    const simulation = useAppStore((s) => s.simulation);
    const setSimulation = appStore.getState().setSimulation;

    return (
        <PanelSection title="力学モデル" icon={<Atom />}>
            <ToggleRow
                label="J2 摂動"
                help="地球の扁平（J2 項）による摂動を Schweighart-Sedwick 方程式で考慮します。"
                checked={simulation.j2Perturbation}
                onCheckedChange={(j2Perturbation) => setSimulation({ j2Perturbation })}
            />
            <ToggleRow
                label="J2 安定配置で初期化"
                help="J2 摂動下でドリフトしない初期速度で衛星を配置します。切り替えると再配置されます。"
                checked={simulation.j2StableArrangement}
                onCheckedChange={(j2StableArrangement) => setSimulation({ j2StableArrangement })}
            />
        </PanelSection>
    );
}

function DisturbanceSection() {
    const engine = useEngine();
    const simulation = useAppStore((s) => s.simulation);
    const collisionAvailable = useAppStore((s) => s.display.satelliteShape === 'sphere');
    const setSimulation = appStore.getState().setSimulation;

    return (
        <PanelSection title="外乱と衝突" icon={<Sparkles />} collapsible defaultOpen={false}>
            <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs text-fg-muted">摂動量</span>
                <WithUnit unit="m/s">
                    <NumberField
                        min={0.001}
                        max={0.1}
                        step={0.001}
                        value={simulation.perturbationAmount}
                        onValueChange={(perturbationAmount) => setSimulation({ perturbationAmount })}
                        className={COMPACT_INPUT_CLASS}
                        aria-label="摂動量"
                    />
                </WithUnit>
                <Button size="sm" variant="secondary" onClick={() => engine.addPerturbation()}>
                    加える
                </Button>
            </div>
            <ToggleRow
                label="衝突検出"
                help={
                    collisionAvailable ? '衛星同士の衝突を検出して弾性衝突させます。' : '球体形状のときだけ使えます。'
                }
                checked={simulation.collisionEnabled}
                disabled={!collisionAvailable}
                onCheckedChange={(collisionEnabled) => setSimulation({ collisionEnabled })}
            />
            <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs text-fg-muted">衛星質量</span>
                <WithUnit unit="kg">
                    <NumberField
                        min={0.1}
                        max={1000}
                        step={0.1}
                        value={simulation.satelliteMass}
                        onValueChange={(satelliteMass) => setSimulation({ satelliteMass })}
                        className={COMPACT_INPUT_CLASS}
                        aria-label="衛星質量"
                    />
                </WithUnit>
            </div>
        </PanelSection>
    );
}
