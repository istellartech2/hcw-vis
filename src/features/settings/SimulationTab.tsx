import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from '@/components/ui/field';
import { NumberField } from '@/components/number-field';
import { useEngine } from '@/engine/EngineContext';
import { appStore, useAppStore } from '@/store/appStore';
import { OrbitForm } from './OrbitForm';
import { SwitchRow, UnitLabel } from './SettingRow';

export function SimulationTab() {
    const engine = useEngine();
    const simulation = useAppStore((s) => s.simulation);
    const shape = useAppStore((s) => s.display.satelliteShape);
    const setSimulation = appStore.getState().setSimulation;
    const collisionAvailable = shape === 'sphere';

    return (
        <FieldGroup>
            <FieldSet>
                <FieldLegend>力学モデル</FieldLegend>
                <FieldGroup className="gap-4">
                    <SwitchRow
                        id="j2-perturbation"
                        label="J2摂動を考慮"
                        checked={simulation.j2Perturbation}
                        onCheckedChange={(j2Perturbation) => setSimulation({ j2Perturbation })}
                    />
                    <SwitchRow
                        id="j2-stable"
                        label="衛星配置をJ2安定配置にする"
                        checked={simulation.j2StableArrangement}
                        onCheckedChange={(j2StableArrangement) => setSimulation({ j2StableArrangement })}
                    />
                </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
                <FieldLegend>基準軌道</FieldLegend>
                <FieldDescription>円軌道（離心率 0）として計算します。</FieldDescription>
                <OrbitForm />
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
                <FieldLegend>外力</FieldLegend>
                <div className="flex items-end gap-2">
                    <Field className="flex-1">
                        <FieldLabel htmlFor="perturbation"><UnitLabel unit="m/s">摂動量</UnitLabel></FieldLabel>
                        <NumberField
                            id="perturbation"
                            min={0.001}
                            max={0.1}
                            step={0.001}
                            value={simulation.perturbationAmount}
                            onValueChange={(perturbationAmount) => setSimulation({ perturbationAmount })}
                        />
                    </Field>
                    <Button variant="secondary" onClick={() => engine.addPerturbation()}>
                        <Sparkles />
                        摂動を加える
                    </Button>
                </div>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
                <FieldLegend>衝突検出</FieldLegend>
                <FieldGroup className="gap-4">
                    <SwitchRow
                        id="collision"
                        label="衝突検出を有効化"
                        description={collisionAvailable ? undefined : '球体形状の場合のみ有効です'}
                        checked={simulation.collisionEnabled}
                        disabled={!collisionAvailable}
                        onCheckedChange={(collisionEnabled) => setSimulation({ collisionEnabled })}
                    />
                    <Field>
                        <FieldLabel htmlFor="satellite-mass"><UnitLabel unit="kg">衛星質量</UnitLabel></FieldLabel>
                        <NumberField
                            id="satellite-mass"
                            min={0.1}
                            max={1000}
                            step={0.1}
                            value={simulation.satelliteMass}
                            onValueChange={(satelliteMass) => setSimulation({ satelliteMass })}
                        />
                    </Field>
                </FieldGroup>
            </FieldSet>
        </FieldGroup>
    );
}
