<?php

namespace App\Services;

use App\Exceptions\DomainException;
use App\Models\User;
use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Stores user avatars. Every upload is decoded and re-encoded with GD, which
 * strips EXIF/GPS metadata and neutralises polyglot files; only the
 * re-encoded square WebP is ever served.
 */
class AvatarService
{
    public const SIZE = 256;

    private const DISK = 'public';

    public function store(User $user, UploadedFile $file): string
    {
        $source = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));
        if (! $source instanceof GdImage) {
            throw new DomainException(__('api.invalid_image'), 'invalid_image');
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $side = min($width, $height);

        $avatar = imagecreatetruecolor(self::SIZE, self::SIZE);
        imagealphablending($avatar, false);
        imagesavealpha($avatar, true);
        imagecopyresampled(
            $avatar,
            $source,
            0,
            0,
            intdiv($width - $side, 2),
            intdiv($height - $side, 2),
            self::SIZE,
            self::SIZE,
            $side,
            $side,
        );

        ob_start();
        imagewebp($avatar, null, 85);
        $contents = (string) ob_get_clean();
        imagedestroy($source);
        imagedestroy($avatar);

        $path = "avatars/{$user->getKey()}/".Str::random(32).'.webp';
        Storage::disk(self::DISK)->put($path, $contents, 'public');

        $previous = $user->avatar_path;
        $user->forceFill(['avatar_path' => $path])->save();

        if ($previous) {
            Storage::disk(self::DISK)->delete($previous);
        }

        return $path;
    }

    public function delete(User $user): void
    {
        if ($user->avatar_path) {
            Storage::disk(self::DISK)->delete($user->avatar_path);
            $user->forceFill(['avatar_path' => null])->save();
        }
    }
}
