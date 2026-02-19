const fs = require('fs');
const https = require('https');
const path = require('path');

const modelsDir = path.join(__dirname, 'backendonly', 'models', 'face_models');
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

const files = [
    'face_recognition_model-shard1',
    'face_recognition_model-shard2',
    'face_landmark_68_tiny_model-shard1',
    'face_expression_model-weights_manifest.json',
    'face_expression_model-shard1'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

files.forEach(file => {
    const filePath = path.join(modelsDir, file);
    const fileUrl = baseUrl + file;

    console.log(`Downloading ${file}...`);
    const fileStream = fs.createWriteStream(filePath);

    https.get(fileUrl, (response) => {
        response.pipe(fileStream);

        fileStream.on('finish', () => {
            fileStream.close();
            console.log(`Finished ${file}`);
        });
    }).on('error', (err) => {
        fs.unlink(filePath, () => { }); // Delete the file async
        console.error(`Error downloading ${file}: ${err.message}`);
    });
});
