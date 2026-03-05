import { auth } from '@/auth'
import { uploadImage } from '@/lib/cloudinary'

export const runtime = 'nodejs'
export const maxDuration = 30

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'sophia/general'

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        { error: 'Invalid file type. Allowed: PNG, JPEG, WebP' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return Response.json(
        { error: 'File too large. Maximum: 5MB' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const url = await uploadImage(buffer, folder)

    return Response.json({ url })
  } catch (error) {
    console.error('Upload error:', error)
    return Response.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
