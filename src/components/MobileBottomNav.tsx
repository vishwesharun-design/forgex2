import React from 'react';
import { MessageSquare, Image as ImageIcon, Music, Code2, LayoutGrid, Plus, Mic } from 'lucide-react';
import { ActiveWorkspace, ForgeXTheme } from '../types';

interface MobileBottomNavProps {
  activeWorkspace: ActiveWorkspace;
  onSelectWorkspace: (workspace: ActiveWorkspace) => void;
  onOpenMobileSidebar: () => void;
  onNewChat?: () => void;
  onOpenVoiceMode?: () => void;
  theme: ForgeXTheme;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeWorkspace,
  onSelectWorkspace,
  onOpenMobileSidebar,
  onNewChat,
  onOpenVoiceMode,
  theme,
}) => {
  const isDark = theme === 'dark';

  const navItems: { id: ActiveWorkspace; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'image', label: 'Images', icon: ImageIcon },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'code', label: 'Code', icon: Code2 },
  ];

  return (
    <nav
      id="mobile-bottom-navigation"
      className={`md:hidden fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-xl transition-colors select-none pb-[env(safe-area-inset-bottom)] ${
        isDark
          ? 'bg-neutral-950/92 border-neutral-850 text-neutral-400'
          : 'bg-white/92 border-neutral-200 text-neutral-600'
      }`}
    >
      <div className="flex items-center justify-around px-2 h-14 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeWorkspace === item.id;
          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              type="button"
              onClick={() => onSelectWorkspace(item.id)}
              className={`flex-1 flex flex-col items-center justify-center h-12 rounded-xl transition-all ${
                isActive
                  ? isDark
                    ? 'text-amber-400 font-semibold'
                    : 'text-amber-600 font-semibold'
                  : isDark
                    ? 'text-neutral-400 hover:text-neutral-200 active:scale-95'
                    : 'text-neutral-500 hover:text-neutral-800 active:scale-95'
              }`}
            >
              <div className={`p-1 rounded-lg transition-transform ${isActive ? 'scale-110 bg-amber-500/15' : ''}`}>
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : ''}`} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* Center / Action button: All 12 Studios & Menu Drawer */}
        <button
          id="mobile-nav-all-studios"
          type="button"
          onClick={onOpenMobileSidebar}
          className={`flex-1 flex flex-col items-center justify-center h-12 rounded-xl transition-all ${
            isDark
              ? 'text-neutral-400 hover:text-white active:scale-95'
              : 'text-neutral-500 hover:text-neutral-900 active:scale-95'
          }`}
          title="All 12 Studios & Settings"
        >
          <div className="p-1 rounded-lg">
            <LayoutGrid className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium text-amber-400">12 Studios</span>
        </button>
      </div>
    </nav>
  );
};
