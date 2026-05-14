import * as SecureStore from 'expo-secure-store'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

export async function uploadMedia(
  submissionId: string,
  fileUri: string,
  mimeType: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const token = await SecureStore.getItemAsync('auth_token')

  const formData = new FormData()
  const fileName = fileUri.split('/').pop() ?? `upload.${mimeType.split('/')[1]}`
  // React Native FormData accepts file objects with uri/type/name
  formData.append('file', { uri: fileUri, type: mimeType, name: fileName } as any)

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        try {
          const body = JSON.parse(xhr.responseText)
          reject(new Error(body.error ?? `Upload failed: ${xhr.status}`))
        } catch {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.ontimeout = () => reject(new Error('Upload timed out'))

    xhr.open('POST', `${BASE_URL}/submissions/${submissionId}/media`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.timeout = 120_000 // 2 min
    xhr.send(formData)
  })
}
