import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';

// Komponenta pro indikátor načítání - musí být mimo TableBody
const LoadingIndicator = memo(() => (
    <div className="absolute bottom-0 left-0 w-full text-center py-2 bg-white/80 backdrop-blur-sm z-10">
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
    </div>
));

LoadingIndicator.displayName = 'LoadingIndicator';

export default LoadingIndicator;
