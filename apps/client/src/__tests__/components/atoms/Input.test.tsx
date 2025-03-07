import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input, Textarea } from '@/components/atoms/Input';

describe('Input Component', () => {
    it('renders correctly with default props', () => {
        render(<Input />);
        const input = screen.getByRole('textbox');
        expect(input).toBeInTheDocument();
    });

    it('applies custom className', () => {
        render(<Input className="custom-class" />);
        const input = screen.getByRole('textbox');
        expect(input).toHaveClass('custom-class');
    });

    it('handles value changes', () => {
        const handleChange = jest.fn();
        render(<Input onChange={handleChange} />);
        const input = screen.getByRole('textbox');

        fireEvent.change(input, { target: { value: 'test value' } });
        expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('is disabled when disabled prop is true', () => {
        render(<Input disabled />);
        const input = screen.getByRole('textbox');
        expect(input).toBeDisabled();
    });

    it('passes other props to the input element', () => {
        render(<Input placeholder="Enter text" maxLength={10} />);
        const input = screen.getByPlaceholderText('Enter text');
        expect(input).toHaveAttribute('maxLength', '10');
    });
});

describe('Textarea Component', () => {
    it('renders correctly with default props', () => {
        render(<Textarea />);
        const textarea = screen.getByRole('textbox');
        expect(textarea).toBeInTheDocument();
    });

    it('applies custom className', () => {
        render(<Textarea className="custom-class" />);
        const textarea = screen.getByRole('textbox');
        expect(textarea).toHaveClass('custom-class');
    });

    it('handles value changes', () => {
        const handleChange = jest.fn();
        render(<Textarea onChange={handleChange} />);
        const textarea = screen.getByRole('textbox');

        fireEvent.change(textarea, { target: { value: 'test value' } });
        expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('is disabled when disabled prop is true', () => {
        render(<Textarea disabled />);
        const textarea = screen.getByRole('textbox');
        expect(textarea).toBeDisabled();
    });

    it('passes other props to the textarea element', () => {
        render(<Textarea placeholder="Enter text" rows={5} cols={40} />);
        const textarea = screen.getByPlaceholderText('Enter text');
        expect(textarea).toHaveAttribute('rows', '5');
        expect(textarea).toHaveAttribute('cols', '40');
    });
});
