<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * A business-rule violation that is safe to show to the client,
 * e.g. "coupon expired" or "course already owned".
 */
class DomainException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $errorCode = 'domain_error',
        public readonly int $status = 422,
    ) {
        parent::__construct($message);
    }
}
