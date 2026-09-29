<?php

namespace App\Services;

use App\Exceptions\DomainException;
use App\Models\MediaAsset;
use App\Models\User;
use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Admin image uploads (covers, instructor photos, testimonial avatars).
 * Like avatars, every image is decoded and re-encoded to WebP with GD:
 * metadata is stripped and only the re-encoded file is served.
 */
class MediaService
{
    /** Longest side after downscaling. */
    public const MAX_SIDE = 1920;

    private const DISK = 'public';

    public function store(UploadedFile $file, ?User $uploader, ?string $alt = null): MediaAsset
    {
        $source = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));
        if (! $source instanceof GdImage) {
            throw new DomainException(__('api.invalid_image'), 'invalid_image');
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $scale = min(1, self::MAX_SIDE / max($width, $height));
        $targetW = max(1, (int) round($width * $scale));
        $targetH = max(1, (int) round($height * $scale));

        $image = imagecreatetruecolor($targetW, $targetH);
        imagealphablending($image, false);
        imagesavealpha($image, true);
        imagecopyresampled($image, $source, 0, 0, 0, 0, $targetW, $targetH, $width, $height);

        ob_start();
        imagewebp($image, null, 82);
        $contents = (string) ob_get_clean();
        imagedestroy($source);
        imagedestroy($image);

        $path = 'media/'.now()->format('Y/m').'/'.Str::random(40).'.webp';
        Storage::disk(self::DISK)->put($path, $contents, 'public');

        return MediaAsset::query()->create([
            'uploaded_by' => $uploader?->id,
            'disk' => self::DISK,
            'path' => $path,
            'original_name' => Str::limit($file->getClientOriginalName(), 250, ''),
            'mime_type' => 'image/webp',
            'size_bytes' => strlen($contents),
            'width' => $targetW,
            'height' => $targetH,
            'alt' => $alt,
        ]);
    }

    /** Path for a media id from a request (null clears the image). */
    public function pathFor(?int $mediaId): ?string
    {
        return $mediaId ? MediaAsset::query()->findOrFail($mediaId)->path : null;
    }
}
