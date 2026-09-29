<?php

it('does not expose the MyFatoorah simulator unless explicitly enabled', function () {
    expect(config('services.myfatoorah.simulator'))->toBeFalse();

    $this->postJson('/__myfatoorah-sim/v3/payments', ['Order' => ['Amount' => 1]])->assertNotFound();
    $this->get('/__myfatoorah-sim/pay/1234567')->assertNotFound();
    $this->getJson('/__myfatoorah-sim/webhook-payload/1')->assertNotFound();
});
