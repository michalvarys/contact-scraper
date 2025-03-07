import React from 'react';
import { render, screen } from '@testing-library/react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/atoms/Table';

describe('Table Components', () => {
    it('renders Table correctly with default props', () => {
        render(
            <Table>
                <tbody>
                    <tr>
                        <td>Test Content</td>
                    </tr>
                </tbody>
            </Table>
        );

        expect(screen.getByText('Test Content')).toBeInTheDocument();
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
    });

    it('applies custom className to Table', () => {
        render(
            <Table className="custom-table-class">
                <tbody>
                    <tr>
                        <td>Test Content</td>
                    </tr>
                </tbody>
            </Table>
        );

        const table = screen.getByRole('table');
        expect(table).toHaveClass('custom-table-class');
    });

    it('renders TableHeader correctly', () => {
        render(
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Header 1</TableHead>
                        <TableHead>Header 2</TableHead>
                    </TableRow>
                </TableHeader>
            </Table>
        );

        expect(screen.getByText('Header 1')).toBeInTheDocument();
        expect(screen.getByText('Header 2')).toBeInTheDocument();
    });

    it('renders TableBody correctly', () => {
        render(
            <Table>
                <TableBody>
                    <TableRow>
                        <TableCell>Cell 1</TableCell>
                        <TableCell>Cell 2</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        );

        expect(screen.getByText('Cell 1')).toBeInTheDocument();
        expect(screen.getByText('Cell 2')).toBeInTheDocument();
    });

    it('renders TableRow correctly with custom className', () => {
        render(
            <Table>
                <TableBody>
                    <TableRow className="custom-row-class">
                        <TableCell>Cell Content</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        );

        const row = screen.getByText('Cell Content').closest('tr');
        expect(row).toHaveClass('custom-row-class');
    });

    it('renders TableCell correctly with custom className', () => {
        render(
            <Table>
                <TableBody>
                    <TableRow>
                        <TableCell className="custom-cell-class">Cell Content</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        );

        const cell = screen.getByText('Cell Content').closest('td');
        expect(cell).toHaveClass('custom-cell-class');
    });

    it('renders TableHead correctly with custom className', () => {
        render(
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="custom-head-class">Header Content</TableHead>
                    </TableRow>
                </TableHeader>
            </Table>
        );

        const head = screen.getByText('Header Content').closest('th');
        expect(head).toHaveClass('custom-head-class');
    });
});
