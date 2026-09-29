<?php

namespace App\Services\Payments;

use RuntimeException;

/** The provider's answer does not match our records (unknown invoice, …). */
class PaymentVerificationException extends RuntimeException {}
