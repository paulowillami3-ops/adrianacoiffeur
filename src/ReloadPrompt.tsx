import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

function ReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            // console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    return (
        <div className="fixed bottom-4 right-4 z-[9999]">
            {(offlineReady || needRefresh) && (
                <div className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col gap-2 max-w-xs animate-slide-up">
                    <div className="text-sm font-bold text-slate-800 dark:text-white">
                        {offlineReady ? (
                            <span>App pronto para uso offline!</span>
                        ) : (
                            <span>Nova versão disponível!</span>
                        )}
                    </div>
                    <div className="flex gap-2 mt-2">
                        {needRefresh && (
                            <button className="flex-1 bg-primary text-white text-xs font-bold py-2 px-3 rounded-lg active:scale-95 transition-transform" onClick={() => updateServiceWorker(true)}>
                                Atualizar
                            </button>
                        )}
                        <button className="flex-1 bg-gray-100 dark:bg-white/5 text-gray-500 text-xs font-bold py-2 px-3 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors" onClick={close}>
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReloadPrompt;
