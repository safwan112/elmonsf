<?php

namespace App\Payments;

use App\Payments\Contracts\PaymentGateway;
use App\Payments\MyFatoorah\MyFatoorahGateway;
use InvalidArgumentException;

/**
 * Resolves gateways by name. Adding a provider = implementing
 * PaymentGateway and registering it here.
 */
class PaymentGatewayManager
{
    public function driver(string $name = 'myfatoorah'): PaymentGateway
    {
        return match ($name) {
            'myfatoorah' => app(MyFatoorahGateway::class),
            default => throw new InvalidArgumentException("Unknown payment gateway [{$name}]."),
        };
    }
}
