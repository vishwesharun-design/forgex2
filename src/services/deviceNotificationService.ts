export type DeviceNotificationPermission = NotificationPermission | 'unsupported';

export const deviceNotificationService = {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  getPermission(): DeviceNotificationPermission {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  async requestPermission(): Promise<DeviceNotificationPermission> {
    if (!this.isSupported()) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  },

  async sendNotification(options: {
    title: string;
    body: string;
    tag?: string;
    onClick?: () => void;
  }): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (Notification.permission !== 'granted') return false;

    const cleanBody = options.body
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[#*_`>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);

    try {
      const notif = new Notification(options.title, {
        body: cleanBody || 'Your scheduled ForgeX briefing is ready.',
        icon: '/logo.svg',
        badge: '/logo.svg',
        tag: options.tag || `forgex_sched_${Date.now()}`,
      });
      notif.onclick = () => {
        try {
          window.focus();
          options.onClick?.();
          notif.close();
        } catch {}
      };
      return true;
    } catch {
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && typeof reg.showNotification === 'function') {
            await reg.showNotification(options.title, {
              body: cleanBody || 'Your scheduled ForgeX briefing is ready.',
              icon: '/logo.svg',
              tag: options.tag || `forgex_sched_${Date.now()}`,
            });
            return true;
          }
        }
      } catch {}
      return false;
    }
  },
};
