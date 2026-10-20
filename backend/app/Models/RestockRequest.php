<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RestockRequest extends Model
{
    protected $fillable = ['product_id', 'requested_by', 'approved_by', 'quantity', 'status', 'notes', 'received_at'];

    protected $casts = ['received_at' => 'datetime'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
