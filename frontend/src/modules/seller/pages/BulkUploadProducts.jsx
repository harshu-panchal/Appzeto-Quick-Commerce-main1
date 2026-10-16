import PageHeader from '@shared/components/ui/PageHeader';
import BulkProductUploader from '@shared/components/products/BulkProductUploader';

const BulkUploadProducts = () => (
    <div className="space-y-5">
        <PageHeader
            title="Bulk Upload Products"
            description="Add many products with all their variants at once from an Excel sheet; rows with problems are reported row by row."
        />
        <BulkProductUploader />
    </div>
);

export default BulkUploadProducts;
