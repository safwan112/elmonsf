<?php

namespace App\Enums;

enum PurchasableType: string
{
    case CoursePlan = 'course_plan';
    case Product = 'product';
}
