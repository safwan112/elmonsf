<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>بوابة دفع تجريبية</title>
    <style>
        body { font-family: Tahoma, system-ui, sans-serif; background: #f3f4f6; margin: 0; display: grid; place-items: center; min-height: 100vh; color: #111827; }
        main { background: #fff; border-radius: 16px; padding: 28px; width: min(92vw, 420px); box-shadow: 0 10px 30px rgba(0,0,0,.08); }
        .badge { display: inline-block; background: #fef3c7; color: #92400e; border-radius: 999px; padding: 4px 12px; font-size: 13px; }
        h1 { font-size: 20px; margin: 16px 0 4px; }
        .amount { font-size: 32px; font-weight: 700; margin: 12px 0 24px; direction: ltr; text-align: right; }
        button { width: 100%; border: 0; border-radius: 10px; padding: 14px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 10px; }
        .ok { background: #0f5e59; color: #fff; } .fail { background: #fee2e2; color: #991b1b; } .cancel { background: #e5e7eb; color: #374151; }
        p.note { font-size: 13px; color: #6b7280; }
    </style>
</head>
<body>
<main>
    <span class="badge">بيئة تجريبية — لا تُخصم أي مبالغ</span>
    <h1>محاكي بوابة الدفع</h1>
    <p class="note">فاتورة رقم {{ $invoiceId }}</p>
    <div class="amount">{{ number_format($invoice['amount'], 2) }} {{ $invoice['currency'] }}</div>
    <form method="post" action="{{ url('/__myfatoorah-sim/pay/'.$invoiceId) }}">
        <button class="ok" name="outcome" value="success">دفع ناجح</button>
        <button class="fail" name="outcome" value="fail">رفض البطاقة</button>
        <button class="cancel" name="outcome" value="cancel">إلغاء الدفع</button>
    </form>
</main>
</body>
</html>
