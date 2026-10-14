import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { appStore, useAppStore } from '@/store/appStore';
import { SHORTCUT_GROUPS } from './shortcuts';

export function ShortcutsDialog() {
    const open = useAppStore((s) => s.ui.helpOpen);

    return (
        <Dialog open={open} onOpenChange={(helpOpen) => appStore.getState().setUI({ helpOpen })}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>キーボードショートカット</DialogTitle>
                    <DialogDescription>入力欄にフォーカスがあるときは無効になります。</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 sm:grid-cols-2">
                    {SHORTCUT_GROUPS.map((group) => (
                        <section key={group.title} className="space-y-2">
                            <h3 className="text-xs font-medium text-muted-foreground">{group.title}</h3>
                            <ul className="space-y-1.5">
                                {group.items.map((item) => (
                                    <li key={item.label} className="flex items-center justify-between gap-4 text-sm">
                                        <span>{item.label}</span>
                                        <KbdGroup>
                                            {item.keys.map((key) => <Kbd key={key}>{key}</Kbd>)}
                                        </KbdGroup>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
