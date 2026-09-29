<?php

namespace App\Http\Requests\Catalog;

use App\Enums\CourseLevel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ListCoursesRequest extends FormRequest
{
    public const SORTS = ['relevance', 'newest', 'popular', 'rating', 'price_asc', 'price_desc'];

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:150'],
            'instructor' => ['nullable', 'string', 'max:150'],
            'level' => ['nullable', Rule::enum(CourseLevel::class)],
            'min_price' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'max_price' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'featured' => ['nullable', 'boolean'],
            'sort' => ['nullable', Rule::in(self::SORTS)],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
        ];
    }

    /**
     * @return list<callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $min = $this->input('min_price');
                $max = $this->input('max_price');
                if (is_numeric($min) && is_numeric($max) && (float) $max < (float) $min) {
                    $validator->errors()->add('max_price', __('validation.gte.numeric', [
                        'attribute' => __('validation.attributes.max_price'),
                        'value' => $min,
                    ]));
                }
            },
        ];
    }
}
