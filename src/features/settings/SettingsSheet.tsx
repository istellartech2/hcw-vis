import { Clapperboard, Eye, Zap } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { appStore, useAppStore } from '@/store/appStore';
import { SimulationTab } from './SimulationTab';
import { DisplayTab } from './DisplayTab';
import { PlaybackTab } from '@/features/playback/PlaybackTab';

export function SettingsSheet() {
    const open = useAppStore((s) => s.ui.settingsOpen);

    return (
        <Sheet modal={false} open={open} onOpenChange={(settingsOpen) => appStore.getState().setUI({ settingsOpen })}>
            <SheetContent side="left" className="w-full gap-0 p-0 sm:max-w-sm">
                <SheetHeader className="border-b">
                    <SheetTitle>設定</SheetTitle>
                    <SheetDescription className="sr-only">シミュレーション・表示・CSV再生の設定</SheetDescription>
                </SheetHeader>
                <Tabs defaultValue="simulation" className="min-h-0 flex-1 gap-0">
                    <div className="border-b px-4 py-3">
                        <TabsList className="w-full">
                            <TabsTrigger value="simulation">
                                <Zap />
                                シミュレーション
                            </TabsTrigger>
                            <TabsTrigger value="display">
                                <Eye />
                                表示
                            </TabsTrigger>
                            <TabsTrigger value="playback">
                                <Clapperboard />
                                CSV再生
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <div className="p-4">
                            <TabsContent value="simulation">
                                <SimulationTab />
                            </TabsContent>
                            <TabsContent value="display">
                                <DisplayTab />
                            </TabsContent>
                            <TabsContent value="playback">
                                <PlaybackTab />
                            </TabsContent>
                        </div>
                    </div>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}
