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

export const MobileBottomNav: React.FC<MobileBottomNavProps> = () => {
  return null;
};
