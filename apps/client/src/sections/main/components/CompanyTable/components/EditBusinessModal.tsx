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
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold px-6 pt-6 pb-4 shrink-0">Upravit firmu</h2>
        <div className="px-6 pb-6 overflow-y-auto">
          <EditBusinessForm company={business} onSave={onSave} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
};
