import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Upload a buffer to Cloudinary and return the secure URL
 */
export async function uploadImage(
  buffer: Buffer,
  folder: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format: 'webp',
        quality: 'auto',
      },
      (error, result) => {
        if (error) return reject(error)
        if (!result) return reject(new Error('No result from Cloudinary'))
        resolve(result.secure_url)
      }
    )

    uploadStream.end(buffer)
  })
}

export { cloudinary }
