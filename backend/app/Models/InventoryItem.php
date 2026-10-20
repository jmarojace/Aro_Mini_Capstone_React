<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryItem extends Model
{
    protected $fillable = ['product_id', 'stock_quantity', 'reorder_level'];

    protected $casts = ['stock_quantity' => 'integer', 'reorder_level' => 'integer'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
