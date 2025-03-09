import React, { HTMLProps, useEffect, useRef } from 'react';

interface IndeterminateCheckboxProps extends HTMLProps<HTMLInputElement> {
    indeterminate?: boolean;
}

/**
 * Checkbox s podporou indeterminate stavu
 */
export const IndeterminateCheckbox: React.FC<IndeterminateCheckboxProps> = ({
    indeterminate,
    className = '',
    ...rest
}) => {
    const ref = useRef<HTMLInputElement>(null!);

    useEffect(() => {
        if (typeof indeterminate === 'boolean') {
            ref.current.indeterminate = !rest.checked && indeterminate;
        }
    }, [ref, indeterminate, rest.checked]);

    return (
        <input
            type="checkbox"
            ref={ref}
            className={className + ' cursor-pointer h-4 w-4'}
            {...rest}
        />
    );
};

export default IndeterminateCheckbox;
