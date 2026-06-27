/**
 * Upload an image to Are.na using presigned URL
 * @param {HTMLCanvasElement} canvas - The canvas element to upload
 * @param {string} title - The filename for the uploaded file
 * @param {string} token - Are.na authentication token
 * @returns {Promise<string>} - The URL of the uploaded image
 */
export async function uploadImage(canvas, title, token) {
	console.log("TOKEN: ",token)
  const contentType = 'image/jpeg';

  // Step 1: Get presigned URL from Are.na API
  const presignResponse = await fetch(
		'https://api.are.na/v3/uploads/presign', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: [{
        filename: title,
        content_type: contentType,
      }],
    }),
  });

  if (!presignResponse.ok) {
    const error = await presignResponse.json();
    throw new Error(`Failed to get presigned URL: ${error.error || 'Unknown error'}`);
  }

  const presignData = await presignResponse.json();
  const presignedFile = presignData.files[0];

  // Step 2: Convert canvas to bytes and upload to S3 using presigned URL
  const fileBytes = await new Promise((resolve) => {
    canvas.toBlob((blob) => {
      blob.arrayBuffer().then(resolve);
    }, contentType, 0.9);
  });

	console.log("Presigned url: ", presignedFile.upload_url)

  const uploadResponse = await fetch(presignedFile.upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': presignedFile.content_type,
    },
    body: fileBytes,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
  }

  // Step 3: Construct and return the final URL
  const baseUrl = presignedFile.upload_url.split('?')[0];

	console.log("DONE?", baseUrl)

  return baseUrl;
}

