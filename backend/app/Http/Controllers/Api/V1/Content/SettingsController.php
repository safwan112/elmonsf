<?php

namespace App\Http\Controllers\Api\V1\Content;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;

class SettingsController extends Controller
{
    /**
     * Public, non-sensitive site settings (contact details, social links…).
     */
    public function __invoke(): JsonResponse
    {
        return response()->json(['data' => (object) SiteSetting::publicValues()]);
    }
}
