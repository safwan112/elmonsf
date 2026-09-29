<?php

use App\Http\Controllers\Dev\MyFatoorahSimulatorController;
use Illuminate\Support\Facades\Route;

/*
| Local MyFatoorah sandbox simulator (see MyFatoorahSimulatorController).
| Point MYFATOORAH_BASE_URL at {APP_URL}/__myfatoorah-sim to use it.
*/
Route::prefix('__myfatoorah-sim')->group(function () {
    Route::post('v3/payments', [MyFatoorahSimulatorController::class, 'createPayment']);
    Route::get('v3/payments/{paymentId}', [MyFatoorahSimulatorController::class, 'getPayment']);
    Route::get('pay/{invoiceId}', [MyFatoorahSimulatorController::class, 'showPaymentPage']);
    Route::post('pay/{invoiceId}', [MyFatoorahSimulatorController::class, 'pay']);
    Route::get('webhook-payload/{paymentId}', [MyFatoorahSimulatorController::class, 'webhookPayload']);
});
