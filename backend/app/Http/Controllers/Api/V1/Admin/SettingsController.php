<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Site settings. Only the keys declared here can be written, each with its
 * validation rules and whether the public settings endpoint exposes it.
 */
class SettingsController extends Controller
{
    use AdminCrud;

    /** @var array<string, array{rules: list<mixed>, public: bool}> */
    private const SCHEMA = [
        'site_name' => ['rules' => ['nullable', 'string', 'max:80'], 'public' => true],
        'tagline' => ['rules' => ['nullable', 'string', 'max:200'], 'public' => true],
        'announcement' => ['rules' => ['nullable', 'string', 'max:300'], 'public' => true],
        'contact_email' => ['rules' => ['nullable', 'email', 'max:255'], 'public' => true],
        'contact_phone' => ['rules' => ['nullable', 'string', 'max:32'], 'public' => true],
        'whatsapp' => ['rules' => ['nullable', 'string', 'max:32', 'regex:/^\+?[0-9 ]+$/'], 'public' => true],
        'working_hours' => ['rules' => ['nullable', 'string', 'max:200'], 'public' => true],
        'social' => ['rules' => ['nullable', 'array:x,instagram,tiktok,youtube,telegram,snapchat'], 'public' => true],
        // Shown on tax invoices.
        'legal_name' => ['rules' => ['nullable', 'string', 'max:255'], 'public' => false],
        'vat_number' => ['rules' => ['nullable', 'string', 'regex:/^[0-9]{15}$/'], 'public' => false],
        'address' => ['rules' => ['nullable', 'string', 'max:500'], 'public' => false],
    ];

    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->values()]);
    }

    /** @return array<string, mixed> */
    private function values(): array
    {
        $values = SiteSetting::query()->whereIn('key', array_keys(self::SCHEMA))->pluck('value', 'key');

        return collect(self::SCHEMA)->mapWithKeys(fn ($_, $key) => [$key => $values[$key] ?? null])->all();
    }

    public function update(Request $request): JsonResponse
    {
        $rules = [];
        foreach (self::SCHEMA as $key => $def) {
            $rules[$key] = ['sometimes', ...$def['rules']];
        }
        $rules['social.*'] = ['nullable', 'url:https', 'max:255'];
        $data = $request->validate($rules);

        DB::transaction(function () use ($data) {
            foreach ($data as $key => $value) {
                if (isset(self::SCHEMA[$key])) {
                    SiteSetting::set($key, is_string($value) ? (trim($value) ?: null) : $value, self::SCHEMA[$key]['public']);
                }
            }
        });
        $this->audit('settings.updated', null, ['keys' => array_keys($data)]);

        return response()->json(['message' => __('admin.settings_saved'), 'data' => $this->values()]);
    }
}
