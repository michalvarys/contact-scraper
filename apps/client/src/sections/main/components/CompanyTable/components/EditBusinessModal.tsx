import type { Company, UpdateCompanyData } from '@contact-scraper/api/routers';
import EditBusinessForm from '../../EditBusinessForm';

interface EditBusinessModalProps {
    business: Company | null;
    onSave: (data: UpdateCompanyData) => void;
    onClose: () => void;
}

export const EditBusinessModal = ({ business, onSave, onClose }: EditBusinessModalProps) => {
    if (!business) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full">
                <h2 className="text-xl font-bold mb-4">Upravit firmu</h2>
                <EditBusinessForm
                    company={business}
                    onSave={onSave}
                    onCancel={onClose}
                />
            </div>
        </div>
    );
};
