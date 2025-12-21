import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../contexts/ToastContext';
import { compressImage } from '../lib/imageOptimizer';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    onSuccess: () => void;
}

export default function EditProfileModal({ isOpen, onClose, user, onSuccess }: EditProfileModalProps) {
    // Toast notifications
    const { success, error } = useToast();

    // State for fields
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [password, setPassword] = useState('');

    // State for Images
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState(user?.avatar_url || user?.profile_image || null);

    const [loading, setLoading] = useState(false);

    // Sync state when user prop changes
    useEffect(() => {
        if (user) {
            setFullName(user.full_name || '');
            // Try both common column names for the avatar
            setPreview(user.avatar_url || user.profile_image || null);
        }
        setPassword(''); // Always reset password field
    }, [user, isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            setFile(selected);
            setPreview(URL.createObjectURL(selected)); // Show immediate preview
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const userId = user.id;
            let finalAvatarUrl = user.avatar_url || user.profile_image;

            // --- STEP 1: UPDATE PASSWORD (Auth API) ---
            if (password && password.trim() !== '') {
                console.log("Updating Password...");
                const { error: passError } = await supabase.auth.updateUser({
                    password: password
                });
                if (passError) throw passError;
            }

            // --- STEP 2: UPLOAD IMAGE (Storage API) ---
            if (file) {
                console.log("Compressing and uploading image...");

                // Compress image before upload
                const compressedFile = await compressImage(file);
                console.log('Original size:', (file.size / 1024).toFixed(0) + 'KB',
                    '→ Compressed:', (compressedFile.size / 1024).toFixed(0) + 'KB');

                const fileExt = compressedFile.name.split('.').pop();
                // Unique filename prevents cache issues
                const fileName = `avatar-${Date.now()}.${fileExt}`;
                const filePath = `${userId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, compressedFile, { upsert: true });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
                finalAvatarUrl = data.publicUrl;
            }

            // --- STEP 3: UPDATE PROFILE DATA (Database API) ---
            console.log("Saving Profile Data...");

            const updates = {
                full_name: fullName,
                updated_at: new Date().toISOString(),
                // "Double-Shot": Send to both potential column names. 
                // Supabase will ignore the one that doesn't exist.
                avatar_url: finalAvatarUrl,
                profile_image: finalAvatarUrl
            };

            const { error: updateError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId);

            if (updateError) throw updateError;

            // --- DONE ---
            success('Profile saved successfully!');
            onSuccess(); // Refresh parent data
            onClose();   // Close modal

        } catch (err: any) {
            console.error('SAVE ERROR:', err);
            error(err.message || 'Failed to save profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96 shadow-xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>

                <h2 className="text-xl font-bold mb-6">Edit Profile</h2>

                {/* Image Preview */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 mb-2">
                        {preview ? (
                            <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xl">
                                {fullName ? fullName[0].toUpperCase() : 'U'}
                            </div>
                        )}
                    </div>
                    <label className="text-sm text-blue-600 cursor-pointer font-medium hover:underline">
                        Change Photo
                        <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                    </label>
                </div>

                {/* Name Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1 text-gray-700">Full Name</label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                {/* Password Input */}
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-1 text-gray-700">New Password (Optional)</label>
                    <input
                        type="password"
                        placeholder="Leave blank to keep current"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <button onClick={onClose} disabled={loading} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
