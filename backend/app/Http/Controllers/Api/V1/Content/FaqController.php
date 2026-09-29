<?php

namespace App\Http\Controllers\Api\V1\Content;

use App\Http\Controllers\Controller;
use App\Http\Resources\Content\FaqResource;
use App\Models\Faq;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FaqController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $group = $request->validate(['group' => ['nullable', 'string', 'max:64']])['group'] ?? null;

        return FaqResource::collection(
            Faq::query()->active()->when($group, fn ($q) => $q->where('group', $group))->get()
        );
    }
}
