# Textract API - Image Text Extraction using OpenAI GPT-4 Vision

## Overview
This API extracts appliance information from images using OpenAI's GPT-4 Vision model. It follows the same implementation pattern as the Java service.

## Prerequisites

1. **OpenAI API Key**: Get your API key from https://platform.openai.com/api-keys
2. **AWS S3 Credentials** (optional): For storing uploaded images

## Environment Variables

Add these to your `.env` file:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# AWS S3 Configuration (optional)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-2
AWS_S3_BUCKET=your-bucket-name
```

## API Endpoints

### 1. Extract Basic Appliance Info

**Endpoint:** `POST /api/textract/extract-appliance-info`

**Description:** Extracts model number, serial number, brand, and year of manufacturing from an appliance image.

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `image` (file, required): Image file of the appliance label
  - `email` (string, optional): User email for S3 storage path

**Response:**
```json
{
  "success": true,
  "data": {
    "modelNumber": "GTS18GTHWW",
    "serialNumber": "SN123456789",
    "brand": "GE",
    "yearOfManufacturing": "2020"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5010/api/textract/extract-appliance-info \
  -F "image=@/path/to/appliance-label.jpg" \
  -F "email=user@example.com"
```

---

### 2. Extract All Appliance Details

**Endpoint:** `POST /api/textract/extract-all-details`

**Description:** Extracts comprehensive appliance details including type, voltage, amperage, and calculates power rating.

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `image` (file, required): Image file of the appliance label
  - `userId` (string, optional): User ID for S3 storage path

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "Refrigerator",
    "brand": "Samsung",
    "serial": "ABC123XYZ",
    "model": "RF28R7351SR",
    "voltage": "220",
    "amperage": "5",
    "powerRating": "1100W",
    "dateOfManufacture": "2021"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5010/api/textract/extract-all-details \
  -F "image=@/path/to/appliance-label.jpg" \
  -F "userId=user-123"
```

---

## Features

### ✅ Implemented
- **GPT-4 Vision Integration**: Uses OpenAI's latest vision model
- **Base64 Image Encoding**: Converts uploaded images to base64
- **Structured Data Extraction**: Parses GPT response into structured JSON
- **Power Rating Calculation**: Automatically calculates wattage from voltage × amperage
- **S3 Upload**: Optionally stores images in AWS S3
- **Error Handling**: Comprehensive error handling and logging
- **Type Safety**: Full TypeScript support

### 🔄 Processing Flow

```
1. Upload Image (multipart/form-data)
   ↓
2. Convert to Base64
   ↓
3. Send to OpenAI GPT-4 Vision API
   ↓
4. Parse Structured Response
   ↓
5. Validate & Calculate Derived Fields
   ↓
6. Upload to S3 (optional)
   ↓
7. Return JSON Response
```

---

## Testing with Postman

### Request Setup

1. **Method**: POST
2. **URL**: `http://localhost:5010/api/textract/extract-appliance-info`
3. **Body**: 
   - Select `form-data`
   - Add key `image` with type `File`
   - Select an image file
   - Add key `email` with type `Text` and value `test@example.com`

### Expected Response Time
- Typical: 2-5 seconds (depends on OpenAI API response time)
- Image size: Up to 10MB

---

## S3 Storage Structure

Images are stored with the following path structure:

```
{email_or_userId}/appliances/{modelNumber}/{serialNumber}.jpg
```

Example:
```
user_at_example.com/appliances/GTS18GTHWW/SN123456789.jpg
```

---

## Error Handling

### Common Errors

**1. Missing OpenAI API Key**
```json
{
  "success": false,
  "error": "OPENAI_API_KEY is not configured"
}
```

**2. No Image Provided**
```json
{
  "success": false,
  "error": "No image file provided"
}
```

**3. Invalid Image Format**
```json
{
  "success": false,
  "error": "Only image files are allowed"
}
```

**4. OpenAI API Error**
```json
{
  "success": false,
  "error": "Failed to call ChatGPT API"
}
```

---

## Comparison with Java Implementation

| Feature | Java (Spring Boot) | Node.js (Express) |
|---------|-------------------|-------------------|
| Framework | Spring Boot | Express.js |
| File Upload | MultipartFile | Multer |
| HTTP Client | RestTemplate | Axios |
| AWS SDK | AWS SDK v2 | AWS SDK v3 |
| JSON Parsing | Jackson | Native JSON |
| Type Safety | Java Types | TypeScript |

---

## Development

### Run in Development Mode
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Test the API
```bash
# Test basic extraction
curl -X POST http://localhost:5010/api/textract/extract-appliance-info \
  -F "image=@test-image.jpg"

# Test comprehensive extraction
curl -X POST http://localhost:5010/api/textract/extract-all-details \
  -F "image=@test-image.jpg"
```

---

## Logging

The API logs the following:
- ✅ Incoming requests
- ✅ OpenAI API responses
- ✅ S3 upload success/failure
- ✅ Parsing errors
- ✅ Validation warnings

Example log output:
```
ChatGPT response: { choices: [...] }
✅ Image uploaded to S3 at: user@example.com/appliances/GTS18GTHWW/SN123456789.jpg
```

---

## Cost Considerations

### OpenAI API Pricing (GPT-4 Vision)
- **Input**: ~$0.01 per image (varies by size)
- **Output**: ~$0.03 per 1K tokens

### Optimization Tips
1. Compress images before upload (reduce to < 1MB)
2. Use `max_tokens: 500` to limit response size
3. Cache results for duplicate images
4. Implement rate limiting

---

## Security Best Practices

1. **API Key Protection**: Never commit `.env` file
2. **File Size Limits**: 10MB max (configurable)
3. **File Type Validation**: Only accept image files
4. **Input Sanitization**: Validate email/userId inputs
5. **S3 Bucket Permissions**: Use least-privilege IAM roles

---

## Troubleshooting

### Issue: "OPENAI_API_KEY is not configured"
**Solution**: Add `OPENAI_API_KEY=sk-...` to your `.env` file

### Issue: S3 upload fails
**Solution**: 
1. Check AWS credentials in `.env`
2. Verify S3 bucket exists
3. Check IAM permissions for PutObject

### Issue: GPT returns empty fields
**Solution**: 
1. Ensure image quality is good
2. Check if label is clearly visible
3. Try with a different image

### Issue: Parsing errors
**Solution**: 
1. Check OpenAI API response format
2. Update parsing logic if GPT response format changed
3. Add more robust error handling

---

## Future Enhancements

- [ ] Add image preprocessing (rotation, contrast adjustment)
- [ ] Support batch processing of multiple images
- [ ] Add caching layer (Redis) for duplicate images
- [ ] Implement webhook notifications for async processing
- [ ] Add support for other AI models (Claude, Gemini)
- [ ] Create admin dashboard for monitoring API usage

---

## Support

For issues or questions:
1. Check the logs in the console
2. Verify environment variables are set correctly
3. Test with a sample image first
4. Review OpenAI API status: https://status.openai.com/
