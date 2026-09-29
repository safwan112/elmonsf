<?php

namespace App\Payments;

use RuntimeException;
use Throwable;

class PaymentGatewayException extends RuntimeException
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(string $message, public readonly array $context = [], ?Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
    }
}
