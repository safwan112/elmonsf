<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class ContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $phone = preg_replace('/[\s\-()]/', '', (string) $this->input('phone'));

        $this->merge([
            'name' => trim(strip_tags((string) $this->input('name'))),
            'email' => Str::lower(trim((string) $this->input('email'))),
            'phone' => $phone === '' ? null : $phone,
            'subject' => trim(strip_tags((string) $this->input('subject'))),
            'message' => trim(strip_tags((string) $this->input('message'))),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'regex:/^\+?[0-9]{8,15}$/'],
            'subject' => ['required', 'string', 'min:3', 'max:150'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
            // Honeypot: humans never see or fill this field.
            'website' => ['nullable', 'string', 'max:255'],
        ];
    }
}
