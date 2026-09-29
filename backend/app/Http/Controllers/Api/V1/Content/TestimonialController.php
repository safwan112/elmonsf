<?php

namespace App\Http\Controllers\Api\V1\Content;

use App\Http\Controllers\Controller;
use App\Http\Resources\Content\TestimonialResource;
use App\Models\Testimonial;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TestimonialController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return TestimonialResource::collection(Testimonial::query()->active()->limit(12)->get());
    }
}
