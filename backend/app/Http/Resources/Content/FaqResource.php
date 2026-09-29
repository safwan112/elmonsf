<?php

namespace App\Http\Resources\Content;

use App\Models\Faq;
use App\Support\RichText;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Faq
 */
class FaqResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'group' => $this->group,
            'question' => $this->question,
            'answer_html' => RichText::toHtml($this->answer),
        ];
    }
}
