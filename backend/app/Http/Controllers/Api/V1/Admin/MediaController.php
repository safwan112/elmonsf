<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Models\MediaAsset;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaController extends Controller
{
    use AdminCrud;

    public function __construct(private readonly MediaService $media) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=8000,max_height=8000'],
            'alt' => ['nullable', 'string', 'max:255'],
        ]);

        $asset = $this->media->store($request->file('file'), $request->user(), $data['alt'] ?? null);
        $this->audit('media.uploaded', $asset);

        return response()->json(['data' => self::present($asset)], 201);
    }

    /** @return array<string, mixed> */
    public static function present(MediaAsset $asset): array
    {
        return [
            'id' => $asset->id,
            'url' => $asset->url(),
            'width' => $asset->width,
            'height' => $asset->height,
            'size_bytes' => $asset->size_bytes,
            'alt' => $asset->alt,
        ];
    }
}
