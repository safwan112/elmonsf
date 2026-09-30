<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\CouponScope;
use App\Enums\CouponType;
use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Coupons. Money values are in SAR in this API: `value` is a percentage for
 * percent coupons and an amount for fixed ones.
 */
class CouponController extends Controller
{
    use AdminCrud;

    public function index(Request $request): JsonResponse
    {
        $request->validate(['search' => ['nullable', 'string', 'max:40']]);

        $page = Coupon::query()
            ->withCount('redemptions')
            ->when($request->query('search'), fn ($q, $s) => $q->whereLike('code', $this->like(mb_strtoupper((string) $s))))
            ->latest('id')
            ->paginate($this->perPage($request))
            ->withQueryString();

        return $this->paginated($page, fn (Coupon $c) => $this->present($c));
    }

    public function store(Request $request): JsonResponse
    {
        $coupon = Coupon::query()->create($this->prepare($this->validated($request)))->refresh();
        $this->audit('coupon.created', $coupon);

        return response()->json(['data' => $this->present($coupon->loadCount('redemptions'))], 201);
    }

    public function update(Request $request, Coupon $coupon): JsonResponse
    {
        $data = $this->prepare($this->validated($request, $coupon), $coupon);
        $coupon->update($data);
        $this->audit('coupon.updated', $coupon, ['fields' => array_keys($data)]);

        return response()->json(['data' => $this->present($coupon->loadCount('redemptions'))]);
    }

    public function destroy(Coupon $coupon): JsonResponse
    {
        // Redeemed coupons are part of order history.
        if ($coupon->redemptions()->exists() || $coupon->used_count > 0) {
            $coupon->update(['is_active' => false]);
            $this->audit('coupon.deactivated', $coupon);

            return response()->json(['message' => __('admin.deactivated')]);
        }

        $coupon->delete();
        $this->audit('coupon.deleted', $coupon, ['code' => $coupon->code]);

        return response()->json(['message' => __('admin.deleted')]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Coupon $coupon = null): array
    {
        $partial = $coupon !== null;

        return $request->validate([
            'code' => [$partial ? 'sometimes' : 'required', 'string', 'min:3', 'max:40', 'regex:/^[A-Za-z0-9_-]+$/', Rule::unique('coupons', 'code')->ignore($coupon?->id)],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'type' => [$partial ? 'sometimes' : 'required', Rule::enum(CouponType::class)],
            'value' => [$partial ? 'sometimes' : 'required', 'numeric', 'min:0.01', 'max:100000'],
            'max_discount' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100000'],
            'min_subtotal' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100000'],
            'applies_to' => ['sometimes', Rule::enum(CouponScope::class)],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'expires_at' => ['sometimes', 'nullable', 'date', 'after_or_equal:starts_at'],
            'usage_limit' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'usage_limit_per_user' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function prepare(array $data, ?Coupon $coupon = null): array
    {
        $type = CouponType::from($data['type'] ?? $coupon?->type->value);

        if (array_key_exists('value', $data)) {
            if ($type === CouponType::Percent) {
                validator($data, ['value' => ['integer', 'between:1,100']])->validate();
                $data['value'] = (int) $data['value'];
            } else {
                $data['value'] = Money::toMinor($data['value']);
            }
        }

        return $this->applyMoney($data, ['max_discount' => 'max_discount_amount', 'min_subtotal' => 'min_subtotal_amount']);
    }

    /** @return array<string, mixed> */
    private function present(Coupon $c): array
    {
        $percent = $c->type === CouponType::Percent;

        return [
            'id' => $c->id,
            'code' => $c->code,
            'description' => $c->description,
            'type' => $c->type->value,
            'value' => $percent ? $c->value : Money::toMajor($c->value),
            'max_discount' => Money::toMajor($c->max_discount_amount),
            'min_subtotal' => Money::toMajor($c->min_subtotal_amount),
            'applies_to' => $c->applies_to->value,
            'starts_at' => $c->starts_at?->toIso8601String(),
            'expires_at' => $c->expires_at?->toIso8601String(),
            'usage_limit' => $c->usage_limit,
            'usage_limit_per_user' => $c->usage_limit_per_user,
            'used_count' => $c->used_count,
            'redemptions_count' => $c->redemptions_count ?? 0,
            'is_active' => $c->is_active,
        ];
    }
}
