<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * The currently authenticated user.
     */
    public function show(Request $request): UserResource
    {
        return new UserResource($request->user()->load('roles'));
    }
}
