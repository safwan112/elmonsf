<?php

namespace App\Http\Requests\Auth;

use App\Services\OtpService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class VerifyOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // Accept Arabic-Indic digits typed on Arabic keyboards.
        $code = strtr((string) $this->input('code'), [
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        ]);

        $this->merge([
            'email' => Str::lower(trim((string) $this->input('email'))),
            'code' => preg_replace('/\s+/', '', $code),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'code' => ['required', 'string', 'digits:'.OtpService::LENGTH],
            'remember' => ['sometimes', 'boolean'],
        ];
    }
}
