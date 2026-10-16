import axiosInstance from '@core/api/axios';

export const bulkProductApi = {
    downloadTemplate: () => axiosInstance.get('/products/bulk/template', { responseType: 'blob' }),
    upload: (formData) => axiosInstance.post('/products/bulk/upload', formData),
    getUploads: (params) => axiosInstance.get('/products/bulk/uploads', { params }),
    getUpload: (id) => axiosInstance.get(`/products/bulk/uploads/${id}`),
    downloadErrorReport: (id) =>
        axiosInstance.get(`/products/bulk/uploads/${id}/error-report`, { responseType: 'blob' }),
};

export default bulkProductApi;
