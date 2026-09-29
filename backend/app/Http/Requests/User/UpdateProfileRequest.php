<?php

namespace App\Http\Requests\User;

use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->user());
    }

    protected function prepareForValidation(): void
    {
        $data = [];

        if ($this->has('name')) {
            $data['name'] = trim(strip_tags((string) $this->input('name')));
        }

        if ($this->has('phone')) {
            $phone = preg_replace('/[\s\-()]/', '', (string) $this->input('phone'));
            $data['phone'] = $phone === '' ? null : $phone;
        }

        $this->merge($data);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:100'],
            'phone' => [
                'sometimes',
                'nullable',
                'string',
                'regex:/^\+?[0-9]{8,15}$/',
                Rule::unique('users', 'phone')->ignore($this->user()->getKey()),
            ],
            'locale' => ['sometimes', 'required', Rule::in(SetLocale::SUPPORTED)],
        ];
    }
}
