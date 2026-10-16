import { useRef, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    HiOutlineArrowDownTray,
    HiOutlineArrowUpTray,
    HiOutlineDocumentText,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
    HiOutlineClock,
    HiOutlineEye,
    HiOutlineXMark,
} from 'react-icons/hi2';
import Button from '@shared/components/ui/Button';
import Badge from '@shared/components/ui/Badge';
import DataTable from '@shared/components/ui/DataTable';
import EmptyState from '@shared/components/ui/EmptyState';
import Modal from '@shared/components/ui/Modal';
import Pagination from '@shared/components/ui/Pagination';
import { bulkProductApi } from '@shared/services/bulkProductApi';
import { cn } from '@/lib/utils';

const HISTORY_QUERY_KEY = ['bulkProductUploads'];

const formatDateTime = (value) => {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
        return '—';
    }
};

const saveBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Blob requests carry JSON error bodies as Blobs; unwrap them for a readable message.
const readErrorMessage = async (error, fallback) => {
    const data = error?.response?.data;
    if (data instanceof Blob) {
        try {
            const parsed = JSON.parse(await data.text());
            return parsed?.message || fallback;
        } catch {
            return fallback;
        }
    }
    return data?.message || fallback;
};

const UploadStatusBadge = ({ status }) => {
    if (status === 'processing') return <Badge variant="info">Processing</Badge>;
    if (status === 'failed') return <Badge variant="danger">Failed</Badge>;
    return <Badge variant="success">Completed</Badge>;
};

const SummaryTile = ({ label, value, tone }) => (
    <div className={cn('rounded-xl border px-4 py-3', tone)}>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
        <p className="mt-1 text-xl font-black">{value}</p>
    </div>
);

const UploadResult = ({ upload, onDownloadErrors, downloadingErrors }) => {
    const rows = upload?.rowResults || [];
    const failedRows = rows.filter((r) => r.status === 'failed');
    const isProcessing = upload?.status === 'processing';
    const progress = upload?.totalRows ? Math.round(((upload.processedRows || 0) / upload.totalRows) * 100) : 0;

    if (upload?.status === 'failed' && upload?.errorMessage) {
        return (
            <div className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/5 p-4 text-danger">
                <HiOutlineExclamationTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                    <p className="text-sm font-bold">Upload could not be processed</p>
                    <p className="mt-1 text-sm">{upload.errorMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {isProcessing && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                        <span>Processing rows… {upload.processedRows || 0} / {upload.totalRows}</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-400">You can leave this page — progress is saved in the upload history.</p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <SummaryTile label="Rows" value={upload?.totalRows ?? 0} tone="border-slate-200 bg-slate-50 text-slate-800" />
                <SummaryTile label="Created" value={upload?.successCount ?? 0} tone="border-success/20 bg-success/5 text-success" />
                <SummaryTile label="Failed" value={upload?.failedCount ?? 0} tone="border-danger/20 bg-danger/5 text-danger" />
                <SummaryTile label="Pending approval" value={upload?.pendingApprovalCount ?? 0} tone="border-warning/20 bg-warning/5 text-warning" />
            </div>

            {!isProcessing && failedRows.length > 0 && (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900">
                            Errors in {failedRows.length} row{failedRows.length > 1 ? 's' : ''}
                        </h4>
                        <Button variant="outline" size="sm" onClick={onDownloadErrors} isLoading={downloadingErrors}>
                            <HiOutlineArrowDownTray className="h-4 w-4" />
                            Download error report
                        </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                        Fix these rows in the error report (it has the same columns plus the errors) and upload it again — successful rows were already created and are not in the report.
                    </p>
                    <div className="max-h-[420px] overflow-y-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                <tr>
                                    <th className="px-4 py-2.5">Excel Row</th>
                                    <th className="px-4 py-2.5">Product</th>
                                    <th className="px-4 py-2.5">Errors</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {failedRows.map((r) => (
                                    <tr key={r.rowNumber} className="align-top">
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-slate-700">#{r.rowNumber}</td>
                                        <td className="px-4 py-3 text-xs font-semibold text-slate-800">{r.productName || <span className="text-slate-400">(no name)</span>}</td>
                                        <td className="px-4 py-3">
                                            <ul className="list-disc space-y-1 pl-4 text-xs text-danger">
                                                {(r.errorMessages || []).map((msg, i) => <li key={i}>{msg}</li>)}
                                            </ul>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!isProcessing && upload?.status === 'completed' && failedRows.length === 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 p-4 text-sm font-semibold text-success">
                    <HiOutlineCheckCircle className="h-5 w-5" />
                    All {upload.successCount} product{upload.successCount === 1 ? '' : 's'} were created successfully.
                </div>
            )}
        </div>
    );
};

/**
 * Shared bulk Excel product upload flow for the seller and admin panels.
 * - sellerSelector: optional node rendered above the file picker (admin seller picker)
 * - sellerId: required when `requireSeller` (admin uploads on behalf of a seller)
 */
const BulkProductUploader = ({ sellerSelector = null, sellerId = '', requireSeller = false, showSellerColumn = false, historySellerId = '' }) => {
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
    const [downloadingReportId, setDownloadingReportId] = useState('');
    const [activeUploadId, setActiveUploadId] = useState('');
    const [viewingUploadId, setViewingUploadId] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const fetchUpload = async (id) => {
        const res = await bulkProductApi.getUpload(id);
        return res.data.result;
    };
    const pollWhileProcessing = (query) => (query.state.data?.status === 'processing' ? 2000 : false);

    const { data: activeUpload } = useQuery({
        queryKey: ['bulkProductUpload', activeUploadId],
        queryFn: () => fetchUpload(activeUploadId),
        enabled: Boolean(activeUploadId),
        refetchInterval: pollWhileProcessing,
    });

    const { data: viewingUpload, isLoading: isViewingLoading } = useQuery({
        queryKey: ['bulkProductUpload', viewingUploadId],
        queryFn: () => fetchUpload(viewingUploadId),
        enabled: Boolean(viewingUploadId),
        refetchInterval: pollWhileProcessing,
    });

    const historyParams = { page, limit: pageSize, ...(historySellerId ? { sellerId: historySellerId } : {}) };
    const { data: history, isFetching: isHistoryFetching } = useQuery({
        queryKey: [...HISTORY_QUERY_KEY, historyParams],
        queryFn: async () => {
            const res = await bulkProductApi.getUploads(historyParams);
            return res.data.result || { items: [], total: 0 };
        },
        placeholderData: keepPreviousData,
        refetchInterval: (query) =>
            (query.state.data?.items || []).some((u) => u.status === 'processing') ? 4000 : false,
    });

    const refreshHistory = () => queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });

    const handleDownloadTemplate = async () => {
        setIsDownloadingTemplate(true);
        try {
            const res = await bulkProductApi.downloadTemplate();
            saveBlob(res.data, 'bulk-product-upload-template.xlsx');
        } catch (error) {
            toast.error(await readErrorMessage(error, 'Could not download the template'));
        } finally {
            setIsDownloadingTemplate(false);
        }
    };

    const handleDownloadErrors = async (upload) => {
        if (!upload?._id) return;
        setDownloadingReportId(upload._id);
        try {
            const res = await bulkProductApi.downloadErrorReport(upload._id);
            const base = String(upload.fileName || 'upload').replace(/\.xlsx$/i, '');
            saveBlob(res.data, `${base}-errors.xlsx`);
        } catch (error) {
            toast.error(await readErrorMessage(error, 'Could not download the error report'));
        } finally {
            setDownloadingReportId('');
        }
    };

    const handleFileChange = (e) => {
        const picked = e.target.files?.[0];
        if (!picked) return;
        if (!/\.xlsx$/i.test(picked.name)) {
            toast.error('Please choose an .xlsx Excel file');
            e.target.value = '';
            return;
        }
        if (picked.size > 5 * 1024 * 1024) {
            toast.error('The Excel file must be 5 MB or smaller');
            e.target.value = '';
            return;
        }
        setFile(picked);
    };

    const clearFile = () => {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUpload = async () => {
        if (requireSeller && !sellerId) {
            toast.error('Please select a seller first');
            return;
        }
        if (!file) {
            toast.error('Please choose the filled Excel file');
            return;
        }
        setIsUploading(true);
        try {
            const data = new FormData();
            if (requireSeller) data.append('sellerId', sellerId);
            data.append('file', file);
            const res = await bulkProductApi.upload(data);
            const created = res.data.result;
            toast.success(res.data.message || 'Upload started');
            setActiveUploadId(created?._id || '');
            clearFile();
        } catch (error) {
            const failedUploadId = error?.response?.data?.result?.uploadId;
            toast.error(error?.response?.data?.message || 'Upload failed');
            if (failedUploadId) setActiveUploadId(failedUploadId);
        } finally {
            setIsUploading(false);
            refreshHistory();
        }
    };

    const historyColumns = [
        {
            header: 'Uploaded',
            key: 'createdAt',
            primary: true,
            cell: (u) => (
                <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-900" title={u.fileName}>{u.fileName || 'upload.xlsx'}</p>
                    <p className="text-[11px] text-slate-400">{formatDateTime(u.createdAt)} · by {u.uploadedByRole === 'admin' ? 'Admin' : 'Seller'}</p>
                </div>
            ),
        },
        ...(showSellerColumn
            ? [{
                header: 'Seller',
                key: 'seller',
                cell: (u) => <span className="text-[13px] font-medium text-slate-700">{u.sellerId?.shopName || u.sellerId?.name || '—'}</span>,
            }]
            : []),
        { header: 'Status', key: 'status', align: 'center', cell: (u) => <UploadStatusBadge status={u.status} /> },
        {
            header: 'Rows',
            key: 'rows',
            align: 'center',
            cell: (u) => (
                <span className="text-xs font-semibold text-slate-700">
                    {u.status === 'processing' ? `${u.processedRows || 0}/${u.totalRows}` : u.totalRows}
                </span>
            ),
        },
        { header: 'Created', key: 'success', align: 'center', cell: (u) => <span className="text-xs font-bold text-success">{u.successCount}</span> },
        { header: 'Failed', key: 'failed', align: 'center', cell: (u) => <span className={cn('text-xs font-bold', u.failedCount ? 'text-danger' : 'text-slate-400')}>{u.failedCount}</span> },
        {
            header: 'Actions',
            key: 'actions',
            align: 'center',
            cell: (u) => (
                <div className="flex items-center justify-center gap-1.5">
                    <button
                        onClick={() => setViewingUploadId(u._id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-400 shadow-sm transition-all hover:bg-primary/10 hover:text-primary"
                        title="View row results"
                    >
                        <HiOutlineEye className="h-4 w-4" />
                    </button>
                    {u.status === 'completed' && u.failedCount > 0 && (
                        <button
                            onClick={() => handleDownloadErrors(u)}
                            disabled={downloadingReportId === u._id}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-400 shadow-sm transition-all hover:bg-danger/10 hover:text-danger disabled:opacity-60"
                            title="Download error report"
                        >
                            <HiOutlineArrowDownTray className="h-4 w-4" />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const historyItems = history?.items || [];
    const historyTotal = history?.total || 0;

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-black text-primary">1</div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Download the template</h3>
                            <p className="text-xs text-slate-500">Includes instructions and the list of valid categories.</p>
                        </div>
                    </div>
                    <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                        <li>One row per product; put all its variants in the same row, comma separated.</li>
                        <li>Variant names, prices and stocks must have the same number of values, in the same order (e.g. <span className="font-mono">1kg, 5kg</span> / <span className="font-mono">200, 900</span> / <span className="font-mono">50, 20</span>).</li>
                        <li>Images: paste direct, public image links (https://…jpg/png/webp).</li>
                    </ul>
                    <Button variant="outline" onClick={handleDownloadTemplate} isLoading={isDownloadingTemplate}>
                        <HiOutlineArrowDownTray className="h-4 w-4" />
                        Download Excel template
                    </Button>
                </div>

                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-black text-primary">2</div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Upload the filled file</h3>
                            <p className="text-xs text-slate-500">.xlsx only, up to 5 MB and 1000 products.</p>
                        </div>
                    </div>

                    {sellerSelector}

                    {file ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2">
                                <HiOutlineDocumentText className="h-5 w-5 shrink-0 text-primary" />
                                <span className="truncate text-sm font-semibold text-slate-800">{file.name}</span>
                                <span className="shrink-0 text-[11px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
                            </div>
                            <button onClick={clearFile} className="rounded-full p-1 text-slate-400 hover:bg-white hover:text-danger" aria-label="Remove file">
                                <HiOutlineXMark className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center transition-all hover:border-primary hover:bg-primary/5">
                            <HiOutlineArrowUpTray className="h-7 w-7 text-slate-300" />
                            <span className="text-xs font-bold text-slate-500">Click to choose an Excel file</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </label>
                    )}

                    <Button onClick={handleUpload} isLoading={isUploading} disabled={!file || (requireSeller && !sellerId)}>
                        <HiOutlineArrowUpTray className="h-4 w-4" />
                        {isUploading ? 'Uploading…' : 'Upload & create products'}
                    </Button>
                </div>
            </div>

            {activeUploadId && activeUpload && (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">Latest upload</h3>
                            <UploadStatusBadge status={activeUpload.status} />
                        </div>
                        <span className="text-xs text-slate-400">{activeUpload.fileName}</span>
                    </div>
                    <UploadResult
                        upload={activeUpload}
                        onDownloadErrors={() => handleDownloadErrors(activeUpload)}
                        downloadingErrors={downloadingReportId === activeUpload._id}
                    />
                </div>
            )}

            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <HiOutlineClock className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-900">Upload history</h3>
                </div>
                <DataTable
                    columns={historyColumns}
                    data={historyItems}
                    rowKey={(u) => u._id}
                    loading={isHistoryFetching && historyItems.length > 0}
                    emptyState={
                        <EmptyState
                            icon={<HiOutlineDocumentText className="h-6 w-6" />}
                            title="No uploads yet"
                            description="Bulk uploads you make will appear here with their row-wise results."
                        />
                    }
                />
                {historyTotal > pageSize && (
                    <Pagination
                        page={page}
                        totalPages={Math.ceil(historyTotal / pageSize) || 1}
                        total={historyTotal}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        onPageSizeChange={(size) => {
                            setPageSize(size);
                            setPage(1);
                        }}
                        loading={isHistoryFetching}
                    />
                )}
            </div>

            <Modal
                isOpen={Boolean(viewingUploadId)}
                onClose={() => setViewingUploadId('')}
                title={viewingUpload ? `Upload results — ${viewingUpload.fileName || 'upload.xlsx'}` : 'Upload results'}
                size="lg"
            >
                <div className="space-y-4 py-2">
                    {isViewingLoading || !viewingUpload ? (
                        <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <UploadStatusBadge status={viewingUpload.status} />
                                <span>{formatDateTime(viewingUpload.createdAt)}</span>
                                {viewingUpload.sellerId?.shopName && <span>· Seller: {viewingUpload.sellerId.shopName}</span>}
                                <span>· by {viewingUpload.uploadedByRole === 'admin' ? 'Admin' : 'Seller'}</span>
                            </div>
                            <UploadResult
                                upload={viewingUpload}
                                onDownloadErrors={() => handleDownloadErrors(viewingUpload)}
                                downloadingErrors={downloadingReportId === viewingUpload._id}
                            />
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default BulkProductUploader;
