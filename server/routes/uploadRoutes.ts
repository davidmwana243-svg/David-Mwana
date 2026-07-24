import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

router.post('/', async (req, res) => {
  const { image, fileName } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image data is required' });
  }

  try {
    // Check if the uploads folder exists, if not create it
    const uploadsDir = path.join('/tmp', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Clean base64 string
    const matches = image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    let base64Data = image;
    let extension = 'jpg';

    if (matches && matches.length === 3) {
      const mimeType = matches[1];
      base64Data = matches[2];
      extension = mimeType.split('/')[1] || 'jpg';
    }

    const safeFileName = fileName 
      ? fileName.replace(/[^a-zA-Z0-9.-]/g, '_') 
      : `image_${Date.now()}.${extension}`;

    const filePath = path.join(uploadsDir, safeFileName);
    const buffer = Buffer.from(base64Data, 'base64');
    
    fs.writeFileSync(filePath, buffer);

    // Return the relative URL of the uploaded image
    const imageUrl = `/uploads/${safeFileName}`;
    res.json({ imageUrl });
  } catch (error: any) {
    console.error('Error saving uploaded file:', error);
    res.status(500).json({ error: 'Failed to upload image to local server' });
  }
});

export default router;
