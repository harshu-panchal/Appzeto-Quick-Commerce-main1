import React from 'react';
import { useSettings } from '@core/context/SettingsContext';

const MobileFooterMessage = () => {
    const { settings } = useSettings();
    const appName = settings?.appName || 'Appzeto Quick Commerce';
    return (
        <div className="md:hidden w-full flex flex-col items-start mt-6 pt-6 pb-28 px-6 bg-transparent">
            <div className="w-full flex flex-col max-w-sm">
                <h2 className="text-[34px] sm:text-[38px] leading-[1.08] font-black text-[#506173] tracking-tight text-left">
                    India's last<br />minute app <span className="inline-block text-red-500">❤️</span>
                </h2>

                <div className="w-full h-[1px] bg-slate-200 mt-5 mb-4" />

                <div className="text-[#506173] font-black text-2xl tracking-tight text-left">
                    {appName}
                </div>
            </div>
        </div>
    );
};

export default MobileFooterMessage;

