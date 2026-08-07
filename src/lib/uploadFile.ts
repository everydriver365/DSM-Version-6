import { supabase } from './supabaseClient';

export async function uploadFile(
  file: File,
  bucket: string,
  path?: string
): Promise<string> {
  const ext = file.name.split('.').pop();
  const filePath = path ??
    `${Date.now()}-${Math.random()
      .toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function uploadImage(
  file: File,
  bucket: string,
  maxSizeMb = 5
): Promise<string> {
  const maxBytes = maxSizeMb * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new Error(
      `Image too large — max ${maxSizeMb}MB`
    );
  }

  const allowed = [
    'image/jpeg', 'image/png',
    'image/webp', 'image/gif'
  ];

  if (!allowed.includes(file.type)) {
    throw new Error(
      'Only JPEG, PNG, WebP or GIF allowed'
    );
  }

  return uploadFile(file, bucket);
}

export async function uploadVideo(
  file: File,
  bucket: string,
  maxSizeMb = 100
): Promise<string> {
  const maxBytes = maxSizeMb * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new Error(
      `Video too large — max ${maxSizeMb}MB`
    );
  }

  const allowed = [
    'video/mp4', 'video/quicktime',
    'video/webm', 'video/mov'
  ];

  if (!allowed.includes(file.type)) {
    throw new Error(
      'Only MP4, MOV or WebM allowed'
    );
  }

  return uploadFile(file, bucket);
}
