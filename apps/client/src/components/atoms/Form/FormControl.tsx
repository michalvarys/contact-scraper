import React from "react";

/**
 * FormControl - wrapper pro kontrolní prvek ve formuláři
 */
const FormControl = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-1">{children}</div>
);

export default FormControl;
