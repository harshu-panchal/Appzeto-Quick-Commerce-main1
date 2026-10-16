import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HiOutlineBuildingStorefront } from 'react-icons/hi2';
import PageHeader from '@shared/components/ui/PageHeader';
import BulkProductUploader from '@shared/components/products/BulkProductUploader';
import { adminApi } from '../services/adminApi';

const BulkProductUpload = () => {
    const [sellerId, setSellerId] = useState('');

    const { data: sellers = [], isLoading } = useQuery({
        queryKey: ['admin', 'sellerOptions', 'active'],
        queryFn: async () => {
            const response = await adminApi.getSellers({ activeOnly: true });
            if (!response.data.success) return [];
            return response.data.result || response.data.results || [];
        },
    });

    const sellerSelector = (
        <div className="flex flex-col space-y-1.5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <label className="ml-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                <HiOutlineBuildingStorefront className="h-3.5 w-3.5" />
                Seller <span className="text-danger">*</span>
            </label>
            <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                disabled={isLoading}
                className="h-10 w-full cursor-pointer rounded-md border border-primary/30 bg-white px-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            >
                <option value="">{isLoading ? 'Loading sellers…' : 'Select the seller these products belong to'}</option>
                {sellers.map((s) => (
                    <option key={s._id} value={s._id}>
                        {s.shopName || s.name} ({s.email})
                    </option>
                ))}
            </select>
            <p className="ml-1 text-[10px] font-medium text-primary/70">
                Products are created for this seller and auto-approved, as if they added them themselves.
            </p>
        </div>
    );

    return (
        <div className="space-y-5">
            <PageHeader
                title="Bulk Upload Products"
                description="Add many products with all their variants for a seller at once from an Excel sheet; rows with problems are reported row by row."
            />
            <BulkProductUploader sellerSelector={sellerSelector} sellerId={sellerId} requireSeller showSellerColumn />
        </div>
    );
};

export default BulkProductUpload;
