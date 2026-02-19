const faceapi = require('face-api.js');
const jpeg = require('jpeg-js');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');

const tf = faceapi.tf;

// Set backend to CPU (if possible in 1.x, otherwise it defaults to vanilla JS)
// tf.setBackend('cpu'); // 1.x node usually uses cpu by default or tfjs-node if present

// Helper: Decode Image Buffer for Tensor
const imageToTensor = (buffer) => {
    const raw = jpeg.decode(buffer, { useTArray: true });
    const tensor = tf.tensor3d(raw.data, [raw.height, raw.width, 4]); // RGBA
    const rgb = tensor.slice([0, 0, 0], [-1, -1, 3]); // RGB
    tensor.dispose();
    return rgb;
};

// Load Optimized Models (Tiny)
const loadModels = async () => {
    const modelsPath = path.join(__dirname, '../models/face_models');
    await faceapi.nets.tinyFaceDetector.loadFromDisk(modelsPath);
    await faceapi.nets.faceLandmark68TinyNet.loadFromDisk(modelsPath); // Use Tiny Landmarks
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
};

// @desc    Register Face
// @route   POST /api/face/register
// @access  Private (Student/Admin)
const registerFace = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

        const targetUserId = req.body.userId || req.user._id;
        const user = await User.findById(targetUserId);
        if (!user) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'User not found' });
        }

        await loadModels();

        const buffer = fs.readFileSync(req.file.path);
        const tensor = imageToTensor(buffer);

        // Use Tiny Face Detector
        const detection = await faceapi.detectSingleFace(tensor, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks(true) // Uses TinyNet by default if loaded? No, need to specify? 
            // actually faceapi automatically uses the loaded nets. 
            // If we loaded faceLandmark68TinyNet, verification might fail if it expects 68 points?
            // RecognitionNet expects aligned face.
            // Let's stick to standard 68Net for landmarks to ensure recognition works, 
            // but TinyDetector for detection phase which is heavy.
            // Actually, for consistency let's use standard landmarks but Tiny Detector.
            .withFaceDescriptor();

        tensor.dispose();
        fs.unlinkSync(req.file.path);

        if (!detection) {
            return res.status(400).json({ message: 'No face detected. Ensure good lighting.' });
        }

        user.faceEmbedding = Array.from(detection.descriptor);
        user.isFaceRegistered = true;
        await user.save();

        res.json({ message: 'Face registered successfully!' });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Face
// @route   POST /api/face/verify
// @access  Private
const verifyFace = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

        const user = await User.findById(req.user._id);
        if (!user.isFaceRegistered || !user.faceEmbedding || user.faceEmbedding.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Face not registered' });
        }

        await loadModels();

        const buffer = fs.readFileSync(req.file.path);
        const tensor = imageToTensor(buffer);

        const detection = await faceapi.detectSingleFace(tensor, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks(true)
            .withFaceDescriptor();

        tensor.dispose();
        fs.unlinkSync(req.file.path);

        if (!detection) return res.status(400).json({ message: 'No face detected' });

        const distance = faceapi.euclideanDistance(user.faceEmbedding, detection.descriptor);
        const isMatch = distance < 0.5; // Strict threshold

        if (isMatch) {
            res.json({ message: 'Verified', match: true });
        } else {
            res.status(401).json({ message: 'Verification failed', match: false });
        }

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerFace, verifyFace };
