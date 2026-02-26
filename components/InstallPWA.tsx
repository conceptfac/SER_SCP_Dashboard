import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const MOBILE_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isMobilePlatform, setIsMobilePlatform] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standaloneByMedia = window.matchMedia('(display-mode: standalone)').matches;
    const standaloneByNavigator = 'standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const userAgent = navigator.userAgent || navigator.vendor;

    setIsInstalled(standaloneByMedia || standaloneByNavigator);
    setIsMobilePlatform(MOBILE_REGEX.test(userAgent));

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (!isMobilePlatform || isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-3 shadow-xl md:hidden"
      aria-label="Instalar aplicativo"
    >
      <img
        src="/icon-192.png"
        srcSet="/icon-192.png 1x, /icon-512.png 2x"
        alt="SER App"
        className="h-8 w-8 rounded-lg"
      />
      <span className="text-sm font-bold text-secondary">Instalar App</span>
    </button>
  );
};

export default InstallPWA;
