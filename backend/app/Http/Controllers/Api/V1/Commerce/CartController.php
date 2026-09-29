<?php

namespace App\Http\Controllers\Api\V1\Commerce;

use App\Enums\PurchasableType;
use App\Http\Controllers\Controller;
use App\Http\Resources\Commerce\CartResource;
use App\Models\User;
use App\Services\Commerce\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CartController extends Controller
{
    public function __construct(private readonly CartService $carts) {}

    public function show(Request $request): JsonResponse
    {
        return $this->respond($request->user());
    }

    public function add(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::enum(PurchasableType::class)],
            'id' => ['required', 'integer', 'min:1'],
        ]);

        $this->carts->add($request->user(), PurchasableType::from($data['type']), (int) $data['id']);

        return $this->respond($request->user(), __('commerce.item_added'), 201);
    }

    public function remove(Request $request, int $item): JsonResponse
    {
        $this->carts->remove($request->user(), $item);

        return $this->respond($request->user(), __('commerce.item_removed'));
    }

    public function applyCoupon(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:40']]);
        $this->carts->applyCoupon($request->user(), $data['code']);

        return $this->respond($request->user(), __('commerce.coupon_applied'));
    }

    public function removeCoupon(Request $request): JsonResponse
    {
        $this->carts->removeCoupon($request->user());

        return $this->respond($request->user(), __('commerce.coupon_removed'));
    }

    private function respond(User $user, ?string $message = null, int $status = 200): JsonResponse
    {
        $cart = $this->carts->forUser($user)->load('coupon');
        [$summary, $removed, $couponError] = $this->carts->summarize($cart, $user);

        return (new CartResource($summary, $removed, $couponError))
            ->additional(array_filter(['message' => $message]))
            ->response()
            ->setStatusCode($status);
    }
}
