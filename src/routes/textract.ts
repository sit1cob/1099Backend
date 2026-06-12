import express, { Request, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// S3 Client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

interface ExtractedApplianceData {
  modelNumber?: string;
  serialNumber?: string;
  brand?: string;
  yearOfManufacturing?: string;
  type?: string;
  voltage?: string;
  amperage?: string;
  powerRating?: string;
  dateOfManufacture?: string;
  model?: string;
  serial?: string;
  error?: string;
}

/**
 * POST /api/textract/extract-appliance-info
 * Extract appliance information from an image using OpenAI GPT-4 Vision
 * 
 * Request: multipart/form-data
 *   - image: File (required)
 *   - email: string (optional, for S3 storage)
 * 
 * Response:
 *   {
 *     success: boolean,
 *     data: {
 *       modelNumber: string,
 *       serialNumber: string,
 *       brand: string,
 *       yearOfManufacturing: string
 *     }
 *   }
 */
router.post('/extract-appliance-info', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided',
      });
    }

    const email = req.body.email || 'unknown-user';

    // Convert image to base64
    const base64Image = req.file.buffer.toString('base64');

    // Call OpenAI GPT-4 Vision API
    const extractedData = await extractTextFromImageUsingChatGPT(base64Image);

    // Upload to S3 if successful
    if (!extractedData.error && process.env.AWS_S3_BUCKET) {
      try {
        const objectKey = generateS3ObjectKey(email, extractedData);
        await uploadToS3(objectKey, req.file.buffer, req.file.mimetype);
        console.log(`Image uploaded to S3 at: ${objectKey}`);
      } catch (s3Error) {
        console.error('S3 upload failed:', s3Error);
        // Don't fail the request if S3 upload fails
      }
    }

    return res.json({
      success: true,
      data: extractedData,
    });
  } catch (error: any) {
    console.error('Error extracting appliance info:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract appliance information',
    });
  }
});

/**
 * POST /api/textract/extract-all-details
 * Extract comprehensive appliance details from an image using OpenAI GPT-4 Vision
 * 
 * Request: multipart/form-data
 *   - image: File (required)
 *   - userId: string (optional, for S3 storage)
 * 
 * Response:
 *   {
 *     success: boolean,
 *     data: {
 *       type: string,
 *       brand: string,
 *       serial: string,
 *       model: string,
 *       voltage: string,
 *       amperage: string,
 *       powerRating: string,
 *       dateOfManufacture: string
 *     }
 *   }
 */
router.post('/extract-all-details', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided',
      });
    }

    const userId = req.body.userId || 'unknown-user';

    // Convert image to base64
    const base64Image = req.file.buffer.toString('base64');

    // Call OpenAI GPT-4 Vision API for all details
    const extractedData = await extractAllApplianceDetails(base64Image);

    // Validate and standardize the extracted details
    validateExtractedDetails(extractedData);

    // Upload to S3 if successful
    if (!extractedData.error && process.env.AWS_S3_BUCKET) {
      try {
        const objectKey = generateS3ObjectKey(userId, extractedData);
        await uploadToS3(objectKey, req.file.buffer, req.file.mimetype);
        console.log(`Image uploaded to S3 at: ${objectKey}`);
      } catch (s3Error) {
        console.error('S3 upload failed:', s3Error);
      }
    }

    return res.json({
      success: true,
      data: extractedData,
    });
  } catch (error: any) {
    console.error('Error extracting all appliance details:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract appliance details',
    });
  }
});

/**
 * Extract basic appliance information (model, serial, brand, year) from image
 */
async function extractTextFromImageUsingChatGPT(base64Image: string): Promise<ExtractedApplianceData> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const requestBody = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an assistant that helps extract information from images.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'What is in this picture? Extract the model number, serial number, brand, and the year of manufacturing. Return the answer as plain text without any newlines. Return an empty string if nothing is specified, and ensure that only the year of manufacturing is returned as a four-digit number (not the month, full date, or any punctuation). The result should be formatted as: Model: [modelNumber], Serial: [serialNumber], Brand: [brand], yearofmanufacturing: [yearofmanufacturing].',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 500,
  };

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    console.log('ChatGPT response:', JSON.stringify(response.data, null, 2));

    return parseChatGPTResponse(response.data);
  } catch (error: any) {
    console.error('Error calling ChatGPT API:', error.response?.data || error.message);
    return { error: 'Failed to call ChatGPT API' };
  }
}

/**
 * Extract comprehensive appliance details from image
 */
async function extractAllApplianceDetails(base64Image: string): Promise<ExtractedApplianceData> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const prompt = `Extract the following details in strict JSON format: { "type": "", "brand": "", "serial": "", "model": "", "voltage": "", "amperage": "", "dateOfManufacture": "" }. The 'type' should specify the appliance category (e.g., Refrigerator, AC, Microwave, etc.). Ensure all keys are included in the output, even if their values are empty. The 'brand' should be extracted as the name of the manufacturer or company of the appliance, which is usually indicated prominently on the label. Examples include 'Samsung', 'LG', 'Kenmore', 'Sears' or 'General Electric'. For 'dateOfManufacture', return only the year as a four-digit number. This represents the year the appliance was manufactured, which should be extracted from any text or label specifying manufacturing details such as 'Manufactured in', 'MFG Date', or similar terms. If the year is not explicitly mentioned but a complete date is available, extract the year from that date. Return 'voltage' and 'amperage' as plain numbers without any units (e.g., '220' instead of '220V' or '5' instead of '5A'). Do not include Markdown formatting, additional quotes, or explanatory text.`;

  const requestBody = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a precise assistant that extracts structured data from images consistently.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 500,
  };

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    console.log('ChatGPT response:', JSON.stringify(response.data, null, 2));

    return parseAllDetailsResponse(response.data);
  } catch (error: any) {
    console.error('Error calling ChatGPT API:', error.response?.data || error.message);
    return { error: 'Failed to call ChatGPT API' };
  }
}

/**
 * Parse ChatGPT response for basic appliance info
 */
function parseChatGPTResponse(chatGptResponse: any): ExtractedApplianceData {
  const extractedData: ExtractedApplianceData = {};

  try {
    const content = chatGptResponse.choices?.[0]?.message?.content || '';

    // Split the content string and extract details
    const parts = content.split(',');

    for (const part of parts) {
      const lowerPart = part.toLowerCase();
      if (lowerPart.includes('model')) {
        extractedData.modelNumber = part.split(':')[1]?.trim() || '';
      } else if (lowerPart.includes('serial')) {
        extractedData.serialNumber = part.split(':')[1]?.trim() || '';
      } else if (lowerPart.includes('brand')) {
        extractedData.brand = part.split(':')[1]?.trim() || '';
      } else if (lowerPart.includes('yearofmanufacturing')) {
        const extractedYear = part.split(':')[1]?.trim() || '';
        const yearOfManufacturing = extractedYear.replace(/[^\d]/g, '').trim();
        extractedData.yearOfManufacturing = yearOfManufacturing;
      }
    }
  } catch (error) {
    console.error('Error parsing ChatGPT response:', error);
  }

  return extractedData;
}

/**
 * Parse ChatGPT response for comprehensive appliance details
 */
function parseAllDetailsResponse(response: any): ExtractedApplianceData {
  try {
    const content = response.choices?.[0]?.message?.content || '';

    // Attempt to parse the content as JSON
    if (content.startsWith('{') && content.endsWith('}')) {
      const parsed = JSON.parse(content);
      return parsed;
    }

    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    console.warn('Content is not valid JSON:', content);
  } catch (error) {
    console.error('Error parsing response JSON:', error);
  }

  return {};
}

/**
 * Validate and standardize extracted details
 */
function validateExtractedDetails(details: ExtractedApplianceData): void {
  const requiredKeys = ['type', 'brand', 'serial', 'model', 'dateOfManufacture'];

  // Ensure all required keys are present
  for (const key of requiredKeys) {
    if (!(key in details)) {
      (details as any)[key] = '';
    }
  }

  // Calculate power rating if voltage and amperage are available
  if (!details.powerRating || details.powerRating === '') {
    try {
      const voltage = parseFloat(details.voltage || '');
      const amperage = parseFloat(details.amperage || '');
      if (!isNaN(voltage) && !isNaN(amperage) && voltage > 0 && amperage > 0) {
        const wattage = voltage * amperage;
        details.powerRating = `${wattage}W`;
      }
    } catch (error) {
      console.warn('Failed to calculate power rating:', error);
    }
  }
}

/**
 * Generate S3 object key for storing the image
 */
function generateS3ObjectKey(identifier: string, extractedData: ExtractedApplianceData): string {
  const modelNumber = extractedData.modelNumber || extractedData.model || 'unknown-model';
  const serialNumber = extractedData.serialNumber || extractedData.serial || 'unknown-serial';

  // Format the object key using the identifier, model number, and serial number
  return `${identifier.replace(/@/g, '_at_')}/appliances/${modelNumber}/${serialNumber}.jpg`;
}

/**
 * Upload file to S3
 */
async function uploadToS3(key: string, buffer: Buffer, contentType: string): Promise<void> {
  const bucketName = process.env.AWS_S3_BUCKET;

  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET is not configured');
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
}

export default router;
