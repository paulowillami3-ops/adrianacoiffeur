import React, { useState, useEffect } from 'react';

interface IOSNotificationProps {
  message: string;
  visible: boolean;
  onClose: () => void;
}

export const IOSNotification: React.FC<IOSNotificationProps> = ({ message, visible, onClose }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 300);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [visible, onClose]);

  if (!visible && !show) return null;

  return (
    <div className={`fixed top-4 left-4 right-4 z-[100] transition-all duration-500 ease-out transform ${show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
      <div className="bg-white/80 dark:bg-black/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/50 dark:border-white/10 p-4 flex items-center gap-4 max-w-sm mx-auto">
        <div className="size-10 rounded-xl bg-green-500 flex items-center justify-center text-white shrink-0">
          <span className="material-symbols-outlined">chat</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">Nova Mensagem</h4>
          <p className="text-xs text-gray-500 dark:text-gray-300 truncate">{message}</p>
        </div>
        <button onClick={() => setShow(false)} className="size-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-gray-500">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </div>
  );
};

export default IOSNotification;
