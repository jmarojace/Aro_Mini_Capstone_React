<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    protected $fillable = ['invoice_number', 'user_id', 'total_amount', 'payment_method', 'status'];

    protected $casts = ['total_amount' => 'decimal:2'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }
}
