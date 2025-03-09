import React from 'react';

interface TruncatedTextProps {
    text: string | null | undefined;
    maxLength?: number;
    className?: string;
}

/**
 * Komponenta pro zobrazení zkráceného textu s vytečkováním
 */
export const TruncatedText: React.FC<TruncatedTextProps> = ({
    text,
    maxLength = 50,
    className = '',
}) => {
    if (!text) return null;

    return (
        <div
            className={`truncate ${className}`}
            title={text.length > maxLength ? text : undefined}
        >
            {text.length > maxLength ? `${text.substring(0, maxLength)}...` : text}
        </div>
    );
};

export default TruncatedText;
