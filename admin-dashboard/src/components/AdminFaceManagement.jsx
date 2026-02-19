import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import api from '../api';

const AdminFaceManagement = ({ userId, onClose, onSuccess }) => {
    const [mode, setMode] = useState('upload'); // 'upload' or 'camera'
    const [file, setFile] = useState(null);
    const [imgSrc, setImgSrc] = useState(null);
    const [loading, setLoading] = useState(false);
    const webcamRef = useRef(null);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setImgSrc(imageSrc);
        // Convert base64 to blob
        fetch(imageSrc)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], "webcam-face.jpg", { type: "image/jpeg" });
                setFile(file);
            });
    }, [webcamRef]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setImgSrc(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleRegister = async () => {
        if (!file) return alert('Please select or capture an image');

        const formData = new FormData();
        formData.append('image', file);
        formData.append('userId', userId);

        setLoading(true);
        try {
            await api.post('/face/register', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Face registered successfully!');
            onSuccess();
            onClose();
        } catch (error) {
            alert(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Manage Face Data</h2>

                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => { setMode('upload'); setImgSrc(null); setFile(null); }}
                        className={`flex-1 py-1 rounded ${mode === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >
                        Upload
                    </button>
                    <button
                        onClick={() => { setMode('camera'); setImgSrc(null); setFile(null); }}
                        className={`flex-1 py-1 rounded ${mode === 'camera' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >
                        Camera
                    </button>
                </div>

                {mode === 'upload' ? (
                    <div className="mb-4">
                        <input type="file" accept="image/*" onChange={handleFileChange} className="w-full" />
                    </div>
                ) : (
                    <div className="mb-4 text-center">
                        {!imgSrc ? (
                            <>
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    className="w-full rounded mb-2"
                                />
                                <button onClick={capture} className="bg-green-600 text-white px-4 py-1 rounded">Capture</button>
                            </>
                        ) : (
                            <button onClick={() => setImgSrc(null)} className="bg-gray-500 text-white px-4 py-1 rounded">Retake</button>
                        )}
                    </div>
                )}

                {imgSrc && (
                    <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Preview:</p>
                        <img src={imgSrc} alt="Preview" className="w-full h-48 object-cover rounded border" />
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
                    <button
                        onClick={handleRegister}
                        disabled={loading || !file}
                        className={`px-4 py-2 text-white rounded ${loading || !file ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {loading ? 'Registering...' : 'Register Face'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminFaceManagement;
