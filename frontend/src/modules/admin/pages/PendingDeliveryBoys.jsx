import React, { useState, useMemo } from 'react';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import {
    Search,
    Filter,
    FileSearch,
    Phone,
    Mail,
    Truck,
    MapPin,
    Calendar,
    RotateCw,
    Check,
    X,
    ExternalLink,
    ImageOff,
    User,
    Droplets,
    IdCard,
    CreditCard,
    Building2,
    Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { adminApi } from '../services/adminApi';

const DOC_LABELS = {
    aadhar: 'Aadhar',
    pan: 'PAN',
    drivingLicense: 'Driving License',
};

const PLACEHOLDER_AVATAR =
    'https://cdn-icons-png.flaticon.com/512/149/149071.png';

function isHttpUrl(value) {
    return /^https?:\/\//i.test(String(value || '').trim());
}

function isProbablyImageUrl(url) {
    const value = String(url || '').toLowerCase();
    if (!isHttpUrl(value)) return false;
    if (/\.(pdf)(\?|#|$)/i.test(value)) return false;
    return (
        /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(value) ||
        value.includes('/image/upload/') ||
        value.includes('res.cloudinary.com')
    );
}

function formatDocumentEntries(documents = {}) {
    if (!documents || typeof documents !== 'object') return [];
    return Object.entries(documents)
        .filter(([, url]) => Boolean(String(url || '').trim()))
        .map(([key, url]) => {
            const href = String(url).trim();
            return {
                key,
                label: DOC_LABELS[key] || key,
                url: href,
                isViewable: isHttpUrl(href),
                isImage: isProbablyImageUrl(href),
            };
        });
}

const PendingDeliveryBoys = () => {
    const [pendingRiders, setPendingRiders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [viewingRider, setViewingRider] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);

    const fetchPendingRiders = async () => {
        setIsLoading(true);
        try {
            const params = { verified: 'false' };
            if (searchTerm.trim()) params.search = searchTerm.trim();
            const response = await adminApi.getDeliveryPartners(params);
            const payload = response.data.result || {};
            const list = Array.isArray(payload.items)
                ? payload.items
                : response.data.results || [];

            const mappedRiders = list.map((r) => {
                const documentFiles = formatDocumentEntries(r.documents);
                const display = (value, fallback = 'Not provided') => {
                    const text = String(value ?? '').trim();
                    return text || fallback;
                };
                return {
                    id: r._id,
                    name: display(r.name, 'Unknown'),
                    phone: display(r.phone),
                    email: display(r.email),
                    address: display(r.address),
                    dob: display(r.dob),
                    bloodGroup: display(r.bloodGroup),
                    preferredArea: display(r.currentArea, display(r.address)),
                    avatar: isHttpUrl(r.profileImage) ? r.profileImage : '',
                    appliedDate: r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                          })
                        : '—',
                    location: display(r.currentArea, display(r.address, 'Unknown')),
                    vehicle: display(r.vehicleType),
                    vehicleNumber: display(r.vehicleNumber),
                    drivingLicenseNumber: display(r.drivingLicenseNumber),
                    aadharNumber: display(r.aadharNumber),
                    panNumber: display(r.panNumber),
                    accountHolder: display(r.accountHolder),
                    accountNumber: display(r.accountNumber),
                    ifsc: display(r.ifsc),
                    documents: documentFiles.map((d) => d.label),
                    documentFiles,
                    status: r.isVerified ? 'approved' : 'pending_review',
                };
            });

            setPendingRiders(mappedRiders);
        } catch (error) {
            console.error('Fetch Pending Riders Error:', error);
            toast.error('Failed to load applications');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        const timer = setTimeout(() => {
            fetchPendingRiders();
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, filterStatus]);

    const filteredRiders = useMemo(() => {
        return pendingRiders.filter((r) => {
            const matchesSearch =
                r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.phone.includes(searchTerm);

            let matchesStatus = true;
            if (filterStatus === 'pending') {
                matchesStatus = r.status === 'pending_review';
            } else if (filterStatus === 'missing_info') {
                matchesStatus =
                    !r.location ||
                    r.location === 'Unknown' ||
                    r.location === 'Not Specified';
            }

            return matchesSearch && matchesStatus;
        });
    }, [pendingRiders, searchTerm, filterStatus]);

    // Audit fix: approving a rider is what puts them live and able to
    // accept deliveries — reject already gates behind a confirmation and
    // approve didn't. Match it.
    const handleApprove = async (id) => {
        if (!window.confirm('Approve this rider? They will be able to accept deliveries immediately.')) {
            return;
        }
        setIsProcessing(true);
        try {
            await adminApi.approveDeliveryPartner(id);
            toast.success('Rider Approved & Activated!');
            setPendingRiders(pendingRiders.filter((r) => r.id !== id));
            setViewingRider(null);
        } catch (error) {
            console.error('Approval Error:', error);
            toast.error('Failed to approve rider');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async (id) => {
        if (window.confirm('Are you sure you want to reject this application?')) {
            setIsProcessing(true);
            try {
                await adminApi.rejectDeliveryPartner(id);
                toast.success('Application Rejected');
                setPendingRiders(pendingRiders.filter((r) => r.id !== id));
                setViewingRider(null);
            } catch (error) {
                console.error('Rejection Error:', error);
                toast.error('Failed to reject rider');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const openDocument = (doc) => {
        if (!doc?.isViewable) {
            toast.error('Document file is not available');
            return;
        }
        if (doc.isImage) {
            setPreviewDoc(doc);
            return;
        }
        window.open(doc.url, '_blank', 'noopener,noreferrer');
    };

    const avatarSrc = (rider) =>
        rider?.avatar && isHttpUrl(rider.avatar)
            ? rider.avatar
            : PLACEHOLDER_AVATAR;

    return (
        <div className="ds-section-spacing animate-in fade-in duration-700">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="ds-h1 flex items-center gap-3">
                        Rider Applications
                        <Badge
                            variant="primary"
                            className="text-[10px] px-2 py-0.5 uppercase"
                        >
                            Pending Review
                        </Badge>
                    </h1>
                    <p className="ds-description mt-1">
                        Review documents for new delivery partners.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={fetchPendingRiders}
                        className="p-3 bg-white ring-1 ring-slate-200 rounded-2xl text-slate-400 hover:text-primary transition-all shadow-sm active:rotate-180 duration-500"
                    >
                        <RotateCw className="h-5 w-5" />
                    </button>
                    <div className="h-10 w-[1px] bg-slate-200 mx-2" />
                    <div className="flex flex-col items-end">
                        <p className="ds-label">Total Pending</p>
                        <h4 className="ds-h2">{pendingRiders.length}</h4>
                    </div>
                </div>
            </div>

            <Card className="p-4 border-none shadow-sm ring-1 ring-slate-100 bg-white/50 backdrop-blur-xl">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name or mobile..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-100/50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-100/50 p-1 rounded-2xl flex items-center">
                            {['all', 'pending', 'missing_info'].map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setFilterStatus(status)}
                                    className={cn(
                                        'px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
                                        filterStatus === status
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600',
                                    )}
                                >
                                    {status === 'pending'
                                        ? 'PENDING'
                                        : status.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            className="p-3.5 bg-white ring-1 ring-slate-200 rounded-2xl text-slate-600 hover:text-primary transition-all"
                        >
                            <Filter className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </Card>

            <Card className="border-none shadow-2xl ring-1 ring-slate-100 overflow-hidden bg-white rounded-xl relative min-h-[400px]">
                {isLoading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-10 w-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Loading Applications...
                            </p>
                        </div>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="ds-table-header-cell px-4">
                                    Applicant Details
                                </th>
                                <th className="ds-table-header-cell px-4">
                                    Operational Intel
                                </th>
                                <th className="ds-table-header-cell px-4">
                                    Submission Status
                                </th>
                                <th className="ds-table-header-cell px-4 text-right">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {!isLoading && filteredRiders.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-20 text-center">
                                        <FileSearch className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                                        <p className="text-sm font-bold text-slate-500">
                                            No pending applications found.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRiders.map((rider) => (
                                    <tr
                                        key={rider.id}
                                        className="group hover:bg-slate-50/50 transition-colors"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <img
                                                    src={avatarSrc(rider)}
                                                    alt=""
                                                    className="h-12 w-12 rounded-lg bg-gray-100 ring-2 ring-white shadow-sm object-cover group-hover:scale-110 transition-all"
                                                />
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">
                                                        {rider.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Phone className="h-3 w-3 text-slate-400" />
                                                        <span className="text-[10px] font-bold text-slate-500">
                                                            {rider.phone}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Truck className="h-3.5 w-3.5" />
                                                    <span className="text-[10px] font-bold">
                                                        {rider.vehicle}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    <span className="text-[10px] font-bold">
                                                        {rider.location}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-2">
                                                <Badge
                                                    variant={
                                                        rider.status ===
                                                        'pending_review'
                                                            ? 'primary'
                                                            : 'warning'
                                                    }
                                                    className="w-fit text-[8px] font-black uppercase"
                                                >
                                                    {rider.status.replace(
                                                        '_',
                                                        ' ',
                                                    )}
                                                </Badge>
                                                <div className="flex gap-1">
                                                    {rider.documents
                                                        .slice(0, 2)
                                                        .map((doc, i) => (
                                                            <div
                                                                key={i}
                                                                className="h-5 px-2 bg-slate-100 rounded-md text-[8px] font-bold text-slate-500 flex items-center"
                                                            >
                                                                {doc}
                                                            </div>
                                                        ))}
                                                    {rider.documents.length >
                                                        2 && (
                                                        <div className="h-5 px-2 bg-slate-100 rounded-md text-[8px] font-bold text-slate-400 flex items-center">
                                                            +
                                                            {rider.documents
                                                                .length - 2}{' '}
                                                            More
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleApprove(rider.id)
                                                    }
                                                    className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-all shadow-sm"
                                                    title="Approve"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleReject(rider.id)
                                                    }
                                                    className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-all shadow-sm"
                                                    title="Reject"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setViewingRider(rider)
                                                    }
                                                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 ml-2"
                                                >
                                                    VIEW APPLICATION
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <AnimatePresence>
                {viewingRider && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
                            onClick={() => setViewingRider(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="w-full max-w-5xl max-h-[92vh] relative z-10 bg-white rounded-[48px] shadow-3xl overflow-hidden flex flex-col lg:flex-row"
                        >
                            <div className="lg:w-80 bg-slate-50 p-5 border-r border-slate-100 overflow-y-auto">
                                <div className="text-center mb-8">
                                    <img
                                        src={avatarSrc(viewingRider)}
                                        alt={viewingRider.name}
                                        className="h-24 w-24 rounded-2xl bg-white shadow-xl object-cover ring-4 ring-white mx-auto"
                                    />
                                    <h3 className="ds-h2 mt-4">
                                        {viewingRider.name}
                                    </h3>
                                    <p className="ds-label text-primary mt-1">
                                        Delivery Applicant
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
                                        Applied {viewingRider.appliedDate}
                                    </p>
                                    {viewingRider.avatar ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                window.open(
                                                    viewingRider.avatar,
                                                    '_blank',
                                                    'noopener,noreferrer',
                                                )
                                            }
                                            className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            Open profile photo
                                        </button>
                                    ) : null}
                                </div>

                                <div className="space-y-4">
                                    {[
                                        {
                                            label: 'Preferred Area',
                                            value: viewingRider.preferredArea,
                                            icon: MapPin,
                                        },
                                        {
                                            label: 'Full Address',
                                            value: viewingRider.address,
                                            icon: Home,
                                        },
                                        {
                                            label: 'Date of Birth',
                                            value: viewingRider.dob,
                                            icon: Calendar,
                                        },
                                        {
                                            label: 'Blood Group',
                                            value: viewingRider.bloodGroup,
                                            icon: Droplets,
                                        },
                                    ].map((row) => (
                                        <div key={row.label} className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {row.label}
                                            </p>
                                            <div className="flex items-start gap-2 text-slate-700">
                                                <row.icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                                <span className="text-xs font-bold break-words">
                                                    {row.value}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-4 border-t border-slate-200">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                            Submission Completeness
                                        </p>
                                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-brand-500"
                                                style={{
                                                    width: `${Math.min(
                                                        100,
                                                        40 +
                                                            (viewingRider
                                                                .documentFiles
                                                                ?.length || 0) *
                                                                20 +
                                                            (viewingRider.avatar
                                                                ? 20
                                                                : 0),
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                        <p className="text-[9px] font-bold text-brand-600 mt-2">
                                            {(viewingRider.documentFiles
                                                ?.length || 0) >= 3 &&
                                            viewingRider.avatar
                                                ? 'Documents complete'
                                                : 'Review uploaded media carefully'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div
                                className="flex-1 p-5 lg:p-10 bg-white overflow-y-auto min-h-0"
                                data-lenis-prevent
                            >
                                <div className="flex justify-between items-start mb-10">
                                    <div>
                                        <h2 className="ds-h1">
                                            Vetting Protocol
                                        </h2>
                                        <p className="ds-description mt-1">
                                            Check submitted legal documents for
                                            platform entry.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setViewingRider(null)}
                                        className="p-3 hover:bg-slate-50 rounded-2xl transition-all"
                                    >
                                        <X className="h-6 w-6 text-slate-400" />
                                    </button>
                                </div>

                                <div className="space-y-8 mb-12">
                                    <section className="space-y-3">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            Contact & Personal
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {[
                                                { label: 'Full Name', value: viewingRider.name, icon: User },
                                                { label: 'Phone', value: viewingRider.phone, icon: Phone },
                                                { label: 'Email', value: viewingRider.email, icon: Mail },
                                                { label: 'Date of Birth', value: viewingRider.dob, icon: Calendar },
                                                { label: 'Blood Group', value: viewingRider.bloodGroup, icon: Droplets },
                                                { label: 'Preferred Area', value: viewingRider.preferredArea, icon: MapPin },
                                                { label: 'Address', value: viewingRider.address, icon: Home },
                                            ].map((item) => (
                                                <div
                                                    key={item.label}
                                                    className="p-4 bg-slate-50 rounded-2xl flex items-start gap-3"
                                                >
                                                    <div className="h-9 w-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary shrink-0">
                                                        <item.icon className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                            {item.label}
                                                        </p>
                                                        <p className="text-sm font-bold text-slate-900 break-words mt-0.5">
                                                            {item.value}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="space-y-3">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            Vehicle Details
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {[
                                                { label: 'Vehicle Type', value: viewingRider.vehicle, icon: Truck },
                                                { label: 'Vehicle Number', value: viewingRider.vehicleNumber, icon: IdCard },
                                                { label: 'Driving License No.', value: viewingRider.drivingLicenseNumber, icon: IdCard },
                                            ].map((item) => (
                                                <div
                                                    key={item.label}
                                                    className="p-4 bg-slate-50 rounded-2xl border border-brand-500/10 flex items-start gap-3"
                                                >
                                                    <div className="h-9 w-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-brand-600 shrink-0">
                                                        <item.icon className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                            {item.label}
                                                        </p>
                                                        <p className="text-sm font-bold text-slate-900 break-words mt-0.5">
                                                            {item.value}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="space-y-3">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            Identity Numbers
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {[
                                                { label: 'Aadhar Number', value: viewingRider.aadharNumber, icon: IdCard },
                                                { label: 'PAN Number', value: viewingRider.panNumber, icon: CreditCard },
                                            ].map((item) => (
                                                <div
                                                    key={item.label}
                                                    className="p-4 bg-slate-50 rounded-2xl flex items-start gap-3"
                                                >
                                                    <div className="h-9 w-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary shrink-0">
                                                        <item.icon className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                            {item.label}
                                                        </p>
                                                        <p className="text-sm font-bold text-slate-900 break-words mt-0.5">
                                                            {item.value}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="space-y-3">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            Bank Details
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {[
                                                { label: 'Account Holder', value: viewingRider.accountHolder, icon: User },
                                                { label: 'Account Number', value: viewingRider.accountNumber, icon: CreditCard },
                                                { label: 'IFSC', value: viewingRider.ifsc, icon: Building2 },
                                            ].map((item) => (
                                                <div
                                                    key={item.label}
                                                    className="p-4 bg-slate-50 rounded-2xl flex items-start gap-3"
                                                >
                                                    <div className="h-9 w-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary shrink-0">
                                                        <item.icon className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                            {item.label}
                                                        </p>
                                                        <p className="text-sm font-bold text-slate-900 break-words mt-0.5">
                                                            {item.value}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>

                                <div className="space-y-4 mb-14">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        Submitted Documents (
                                        {viewingRider.documentFiles?.length ||
                                            0}
                                        )
                                    </h4>
                                    {(viewingRider.documentFiles || [])
                                        .length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                                            <ImageOff className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                                            <p className="text-sm font-bold text-slate-500">
                                                No document files were found for
                                                this application.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {viewingRider.documentFiles.map(
                                                (doc) => (
                                                    <button
                                                        key={doc.key}
                                                        type="button"
                                                        onClick={() =>
                                                            openDocument(doc)
                                                        }
                                                        className="group relative aspect-[4/3] bg-slate-100 rounded-[24px] overflow-hidden hover:ring-2 hover:ring-primary transition-all text-left"
                                                    >
                                                        {doc.isImage ? (
                                                            <img
                                                                src={doc.url}
                                                                alt={doc.label}
                                                                className="absolute inset-0 h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                                                <FileSearch className="h-8 w-8 text-slate-400 group-hover:text-primary transition-colors" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 to-transparent p-3">
                                                            <p className="text-[10px] font-black text-white uppercase tracking-wider">
                                                                {doc.label}
                                                            </p>
                                                            <p className="text-[9px] font-bold text-white/80 mt-0.5 flex items-center gap-1">
                                                                <ExternalLink className="h-3 w-3" />
                                                                {doc.isImage
                                                                    ? 'Tap to enlarge'
                                                                    : 'Open file'}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() =>
                                            handleApprove(viewingRider.id)
                                        }
                                        className="flex-1 py-5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                Processing Vetting...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4" />
                                                APPROVE & ACTIVATE RIDER
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleReject(viewingRider.id)
                                        }
                                        className="py-5 px-5 bg-rose-50 text-rose-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95"
                                    >
                                        REJECT APPLICATION
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {previewDoc && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                            onClick={() => setPreviewDoc(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                <div>
                                    <p className="text-sm font-black text-slate-900 uppercase tracking-wider">
                                        {previewDoc.label}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                        Uploaded document preview
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={previewDoc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Open
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewDoc(null)}
                                        className="p-2 rounded-xl hover:bg-slate-100"
                                    >
                                        <X className="h-5 w-5 text-slate-500" />
                                    </button>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 max-h-[75vh] overflow-auto">
                                <img
                                    src={previewDoc.url}
                                    alt={previewDoc.label}
                                    className="mx-auto max-h-[70vh] w-auto max-w-full rounded-2xl object-contain shadow-sm"
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PendingDeliveryBoys;
