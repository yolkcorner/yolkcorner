// In-memory album management
export interface Album {
  id: string;
  name: string;
  coverUrl: string;
  images: string[]; // Image URLs
  createdAt: string;
}

const albums: Album[] = [];
let nextId = 1;

export function createAlbum(name: string, coverUrl: string): Album {
  const album: Album = {
    id: String(nextId++),
    name,
    coverUrl,
    images: [],
    createdAt: new Date().toISOString(),
  };
  albums.push(album);
  return album;
}

export function getAlbums(): Album[] {
  return albums;
}

export function getAlbumById(id: string): Album | undefined {
  return albums.find((a) => a.id === id);
}

export function addImageToAlbum(albumId: string, imageUrl: string): boolean {
  const album = albums.find((a) => a.id === albumId);
  if (!album) return false;
  if (album.images.length >= 100) return false; // Max 100 images
  album.images.push(imageUrl);
  return true;
}

export function deleteAlbum(id: string): boolean {
  const index = albums.findIndex((a) => a.id === id);
  if (index === -1) return false;
  albums.splice(index, 1);
  return true;
}

export function deleteImageFromAlbum(
  albumId: string,
  imageUrl: string
): boolean {
  const album = albums.find((a) => a.id === albumId);
  if (!album) return false;
  const index = album.images.indexOf(imageUrl);
  if (index === -1) return false;
  album.images.splice(index, 1);
  return true;
}
